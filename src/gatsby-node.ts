import * as split from 'split2'
import * as through from 'through2'
import {filter} from 'rxjs/operators'
import {GraphQLJSON, GraphQLFieldConfig} from 'gatsby/graphql'
import SanityClient = require('@sanity/client')
import {GatsbyContext, GatsbyReporter, GatsbyNode, GatsbyOnNodeTypeContext} from './types/gatsby'
import {SanityDocument} from './types/sanity'
import {pump} from './util/pump'
import {rejectOnApiError} from './util/rejectOnApiError'
import {findJsonAliases} from './util/findJsonAliases'
import {processDocument} from './util/normalize'
import {getDocumentStream} from './util/getDocumentStream'
import {removeSystemDocuments} from './util/removeSystemDocuments'
import {removeDrafts, extractDrafts, unprefixId} from './util/handleDrafts'
import {handleListenerEvent, ListenerMessage} from './util/handleListenerEvent'
import {
  getRemoteGraphQLSchema,
  transformRemoteGraphQLSchema,
  buildObjectTypeMap,
  buildUnionTypeMap
} from './util/remoteGraphQLSchema'
import debug from './debug'

const CACHE_KEY_ALIASES = 'fieldAliases'
const CACHE_KEY_UNIONS = 'unionMap'
const CACHE_KEY_SCHEMA = 'typeMap'

interface PluginConfig {
  projectId: string
  dataset: string
  token?: string
  version?: string
  overlayDrafts?: boolean
  watchMode?: boolean
}

const defaultConfig = {
  version: '1',
  overlayDrafts: false
}

export const onPreBootstrap = async (context: GatsbyContext, pluginConfig: PluginConfig) => {
  const config = {...defaultConfig, ...pluginConfig}
  const {reporter, cache: pluginCache} = context
  const {cache} = pluginCache

  validateConfig(config, reporter)

  try {
    const aliasKey = getCacheKey(pluginConfig, CACHE_KEY_ALIASES)
    const typeMapKey = getCacheKey(pluginConfig, CACHE_KEY_SCHEMA)
    const unionMapKey = getCacheKey(pluginConfig, CACHE_KEY_UNIONS)
    await Promise.all([aliasKey, typeMapKey, unionMapKey].map(key => cache.del(key)))

    reporter.info('[sanity] Fetching remote GraphQL schema')
    const client = getClient(config)
    const api = await getRemoteGraphQLSchema(client)

    reporter.info('[sanity] Stitching GraphQL schemas from SDL')
    const remoteSchema = await transformRemoteGraphQLSchema(api)
    const fieldAliases = findJsonAliases(remoteSchema)
    const typeMap = buildObjectTypeMap(remoteSchema)
    const unionMap = buildUnionTypeMap(remoteSchema)
    await cache.mset(aliasKey, fieldAliases, typeMapKey, typeMap, unionMapKey, unionMap)
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

  const cacheKey = getCacheKey(pluginConfig, 'fieldAliases')
  const aliases = (await cache.get(cacheKey)) || {}

  const client = getClient(config)
  const url = client.getUrl(`/data/export/${dataset}`)

  reporter.info('[sanity] Fetching export stream for dataset')
  const inputStream = await getDocumentStream(url, config.token)

  const processingOptions = {
    aliases,
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

export const setFieldsOnGraphQLNodeType = async (
  context: GatsbyContext & GatsbyOnNodeTypeContext,
  pluginConfig: PluginConfig
) => {
  const {cache: pluginCache, type} = context
  const {cache} = pluginCache
  const cacheKey = getCacheKey(pluginConfig, 'fieldAliases')
  const aliases = (await cache.get(cacheKey)) || {}
  const typeAliases = aliases[type.name] || {}
  const initial: {[key: string]: GraphQLFieldConfig<any, any>} = {}
  return Object.keys(typeAliases).reduce((acc, aliasName) => {
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

function getCacheKey(config: PluginConfig, suffix: string) {
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
