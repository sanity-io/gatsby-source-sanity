import * as split from 'split2'
import * as through from 'through2'
import {filter} from 'rxjs/operators'
import {GraphQLJSON, GraphQLFieldConfig} from 'gatsby/graphql'
import SanityClient = require('@sanity/client')
import {GatsbyContext, GatsbyReporter, GatsbyNode, GatsbyOnNodeTypeContext} from './types/gatsby'
import {SanityDocument} from './types/sanity'
import {pump} from './util/pump'
import {rejectOnApiError} from './util/rejectOnApiError'
import {processDocument} from './util/normalize'
import {getDocumentStream} from './util/getDocumentStream'
import {removeSystemDocuments} from './util/removeSystemDocuments'
import {removeDrafts, extractDrafts, unprefixId} from './util/handleDrafts'
import {handleListenerEvent, ListenerMessage} from './util/handleListenerEvent'
import {analyzeGraphQLSchema, getRemoteGraphQLSchema, TypeMap} from './util/remoteGraphQLSchema'
import debug from './debug'
import getAliasFields from './util/findJsonAliases'

export interface PluginConfig {
  projectId: string
  dataset: string
  token?: string
  version?: string
  graphqlApi: string
  overlayDrafts?: boolean
  watchMode?: boolean
}

enum CACHE_KEYS {
  TYPE_MAP = 'typeMap'
}

const defaultConfig = {
  version: '1',
  overlayDrafts: false,
  graphqlApi: 'default'
}

const defaultTypeMap: TypeMap = {
  unions: {},
  objects: {},
  exampleValues: {}
}

export const onPreBootstrap = async (context: GatsbyContext, pluginConfig: PluginConfig) => {
  const config = {...defaultConfig, ...pluginConfig}
  const {reporter, cache: pluginCache} = context
  const {cache} = pluginCache

  validateConfig(config, reporter)

  try {
    const typeMapKey = getCacheKey(pluginConfig, CACHE_KEYS.TYPE_MAP)
    await Promise.all([typeMapKey].map(key => cache.del(key)))

    reporter.info('[sanity] Fetching remote GraphQL schema')
    const client = getClient(config)
    const api = await getRemoteGraphQLSchema(client, config)

    reporter.info('[sanity] Stitching GraphQL schemas from SDL')
    const typeMap = analyzeGraphQLSchema(api, pluginConfig)

    if (Object.keys(typeMap.exampleValues).length === 0) {
      reporter.error('[sanity] Failed to create example values, fields might be missing!')
      reporter.error('[sanity] Run the build again with DEBUG=sanity to debug issues.')
    }

    await cache.set(typeMapKey, typeMap)
  } catch (err) {
    if (err.isWarning) {
      err.message.split('\n').forEach((line: string) => reporter.warn(line))
    } else {
      reporter.panic(err.stack)
    }
  }
}

export const sourceNodes = async (context: GatsbyContext, pluginConfig: PluginConfig) => {
  const config = {...defaultConfig, ...pluginConfig}
  const {dataset, overlayDrafts, watchMode} = config
  const {
    cache: pluginCache,
    actions,
    getNode,
    createNodeId,
    createContentDigest,
    reporter
  } = context
  const {createNode, createParentChildLink} = actions
  const {cache} = pluginCache

  const cacheKey = getCacheKey(pluginConfig, CACHE_KEYS.TYPE_MAP)
  const typeMap = ((await cache.get(cacheKey)) || defaultTypeMap) as TypeMap

  createTemporaryMockNodes(context, pluginConfig, 'sourceNodes')

  const client = getClient(config)
  const url = client.getUrl(`/data/export/${dataset}`)

  reporter.info('[sanity] Fetching export stream for dataset')
  const inputStream = await getDocumentStream(url, config.token)

  const processingOptions = {
    typeMap,
    createNodeId,
    createNode,
    createContentDigest,
    createParentChildLink,
    overlayDrafts
  }

  const draftDocs: SanityDocument[] = []
  const publishedNodes = new Map<string, GatsbyNode>()

  await pump([
    inputStream,
    split(JSON.parse),
    rejectOnApiError(),
    overlayDrafts ? extractDrafts(draftDocs) : removeDrafts(),
    removeSystemDocuments(),
    through.obj((doc: SanityDocument, enc: string, cb: through.TransformCallback) => {
      debug('Got document with ID %s', doc._id)
      processDocument(doc, processingOptions)
      cb()
    })
  ])

  if (draftDocs.length > 0) {
    reporter.info('[sanity] Overlaying drafts')
    draftDocs.forEach(draft => {
      processDocument(draft, processingOptions)
      const published = getNode(draft.id)
      if (published) {
        publishedNodes.set(unprefixId(draft._id), published)
      }
    })
  }

  if (watchMode) {
    reporter.info('[sanity] Watch mode enabled, starting a listener')
    client
      .listen('*')
      .pipe(
        filter<ListenerMessage>(event => overlayDrafts || !event.documentId.startsWith('drafts.')),
        filter<ListenerMessage>(event => !event.documentId.startsWith('_.'))
      )
      .subscribe(event => handleListenerEvent(event, publishedNodes, context, processingOptions))
  }

  reporter.info('[sanity] Done exporting!')
}

export const onPreExtractQueries = (context: GatsbyContext, pluginConfig: PluginConfig) => {
  return createTemporaryMockNodes(context, pluginConfig, 'extract queries')
}

export const setFieldsOnGraphQLNodeType = async (
  context: GatsbyContext & GatsbyOnNodeTypeContext,
  pluginConfig: PluginConfig
) => {
  const {cache: pluginCache, type} = context
  const {cache} = pluginCache
  const cacheKey = getCacheKey(pluginConfig, CACHE_KEYS.TYPE_MAP)
  const typeMap = ((await cache.get(cacheKey)) || defaultTypeMap) as TypeMap
  const schemaType = typeMap.objects[type.name]
  if (!schemaType) {
    return undefined
  }

  const aliases = getAliasFields(schemaType.fields)
  if (!aliases.length) {
    return undefined
  }

  const initial: {[key: string]: GraphQLFieldConfig<any, any>} = {}
  return aliases.reduce((acc, aliasName) => {
    acc[aliasName] = {type: GraphQLJSON}
    return acc
  }, initial)
}

function validateConfig(config: PluginConfig, reporter: GatsbyReporter) {
  if (!config.projectId) {
    throw new Error('[sanity] `projectId` must be specified')
  }

  if (!config.dataset) {
    throw new Error('[sanity] `dataset` must be specified')
  }

  if (config.overlayDrafts && !config.token) {
    reporter.warn('[sanity] `overlayDrafts` is set to `true`, but no token is given')
  }

  const inDevelopMode = process.env.gatsby_executing_command === 'develop'
  if (config.watchMode && !inDevelopMode) {
    reporter.warn(
      '[sanity] Using `watchMode` when not in develop mode might prevent your build from completing'
    )
  }
}

function getCacheKey(config: PluginConfig, suffix: CACHE_KEYS) {
  return `${config.projectId}-${config.dataset}-${suffix}`
}

function getClient(config: PluginConfig): SanityClient {
  const {projectId, dataset, token} = config
  return new SanityClient({
    projectId,
    dataset,
    token,
    useCdn: false
  })
}

async function createTemporaryMockNodes(
  context: GatsbyContext,
  pluginConfig: PluginConfig,
  from: string
) {
  const {emitter, actions, reporter, cache: pluginCache} = context
  if (!actions) {
    reporter.panic('No actions received in ' + from)
    process.exit(1)
  }

  const {createNode, deleteNode} = actions

  // Sanity-check (heh) some undocumented, half-internal APIs
  const canMock = emitter && typeof emitter.on === 'function' && typeof emitter.off === 'function'
  if (!canMock) {
    reporter.warn('[sanity] `emitter` API not received, Gatsby internals might have changed')
    reporter.warn('[sanity] Please create issue: https://github.com/sanity-io/gatsby-source-sanity')
    return
  }

  const {cache} = pluginCache
  const cacheKey = getCacheKey(pluginConfig, CACHE_KEYS.TYPE_MAP)
  const typeMap = ((await cache.get(cacheKey)) || defaultTypeMap) as TypeMap
  const exampleValues = typeMap.exampleValues
  const exampleTypes = exampleValues && Object.keys(exampleValues)
  if (!exampleTypes || exampleTypes.length === 0) {
    if (Object.keys(typeMap.objects).length > 0) {
      reporter.warn('[sanity] No example values generated, fields might be missing!')
    }
    return
  }

  const onSchemaUpdate = () => {
    debug('Schema updated, removing mock nodes')
    exampleTypes.forEach(typeName => {
      deleteNode({node: exampleValues[typeName]})
    })

    emitter.off('SET_SCHEMA', onSchemaUpdate)
  }

  debug('Creating mock nodes with example value')
  exampleTypes.forEach(typeName => {
    createNode(rewriteInternal(exampleValues[typeName]))
  })

  emitter.on('SET_SCHEMA', onSchemaUpdate)
}

// Gatsby mutates (...tm) the `internal` object, adding `owner`.
function rewriteInternal(node: GatsbyNode): GatsbyNode {
  const internal = node.internal || {type: '', contentDigest: ''}
  return {
    ...node,
    internal: {
      type: internal.type,
      contentDigest: internal.contentDigest
    }
  }
}
