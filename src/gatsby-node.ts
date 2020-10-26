import split from 'split2'
import through from 'through2'
import {copy} from 'fs-extra'
import {filter} from 'rxjs/operators'
import {GraphQLFieldConfig} from 'gatsby/graphql'
import SanityClient from '@sanity/client'
import {SanityNode} from './types/gatsby'
import {
  GatsbyNode,
  ParentSpanPluginArgs,
  Reporter,
  PluginOptions,
  CreateResolversArgs,
  CreateSchemaCustomizationArgs,
  SourceNodesArgs,
  SetFieldsOnGraphQLNodeTypeArgs,
} from 'gatsby'
import {SanityDocument, SanityWebhookBody} from './types/sanity'
import {pump} from './util/pump'
import {rejectOnApiError} from './util/rejectOnApiError'
import {processDocument, getTypeName} from './util/normalize'
import {getDocumentStream} from './util/getDocumentStream'
import {getCacheKey, CACHE_KEYS} from './util/cache'
import {removeSystemDocuments} from './util/removeSystemDocuments'
import {removeDrafts, extractDrafts} from './util/handleDrafts'
import {handleListenerEvent} from './util/handleListenerEvent'
import {handleWebhookEvent} from './util/handleWebhookEvent'
import {
  getTypeMapFromGraphQLSchema,
  getRemoteGraphQLSchema,
  defaultTypeMap,
  TypeMap,
} from './util/remoteGraphQLSchema'
import debug from './debug'
import {extendImageNode} from './images/extendImageNode'
import {rewriteGraphQLSchema} from './util/rewriteGraphQLSchema'
import {getGraphQLResolverMap} from './util/getGraphQLResolverMap'
import {unprefixId} from './util/documentIds'
import {ERROR_MAP, prefixId, CODES} from './util/errorMap'

import path = require('path')
import oneline = require('oneline')

export interface PluginConfig extends PluginOptions {
  projectId: string
  dataset: string
  token?: string
  version?: string
  graphqlTag: string
  overlayDrafts?: boolean
  watchMode?: boolean
}

const defaultConfig = {
  version: '1',
  overlayDrafts: false,
  graphqlTag: 'default',
}

const stateCache: {[key: string]: any} = {}

export const onPreInit: GatsbyNode['onPreInit'] = async ({reporter}: ParentSpanPluginArgs) => {
  // Old versions of Gatsby does not have this method
  if (reporter.setErrorMap) {
    reporter.setErrorMap(ERROR_MAP)
  }
}

export const onPreBootstrap: GatsbyNode['onPreBootstrap'] = async (
  args: ParentSpanPluginArgs,
  pluginOptions?: PluginConfig,
) => {
  const config = {...defaultConfig, ...pluginOptions}
  const {reporter, actions} = args

  if (!actions.createTypes) {
    const unsupportedVersionMessage = oneline`
    You are using a version of Gatsby not supported by gatsby-source-sanity.
    Either upgrade gatsby to >= 2.2.0 or downgrade to gatsby-source-sanity@^1.0.0`

    reporter.panic(
      {
        id: prefixId(CODES.UnsupportedGatsbyVersion),
        context: {sourceMessage: unsupportedVersionMessage},
      },
      new Error(unsupportedVersionMessage),
    )

    return
  }

  // Actually throws in validation function, but helps typescript perform type narrowing
  if (!validateConfig(config, reporter)) {
    throw new Error('Invalid config')
  }

  try {
    reporter.info('[sanity] Fetching remote GraphQL schema')
    const client = getClient(config)
    const api = await getRemoteGraphQLSchema(client, config)

    reporter.info('[sanity] Transforming to Gatsby-compatible GraphQL SDL')
    const graphqlSdl = await rewriteGraphQLSchema(api, {config, reporter})
    const graphqlSdlKey = getCacheKey(config, CACHE_KEYS.GRAPHQL_SDL)
    stateCache[graphqlSdlKey] = graphqlSdl

    reporter.info('[sanity] Stitching GraphQL schemas from SDL')
    const typeMap = getTypeMapFromGraphQLSchema(api)
    const typeMapKey = getCacheKey(config, CACHE_KEYS.TYPE_MAP)
    stateCache[typeMapKey] = typeMap
  } catch (err) {
    if (err.isWarning) {
      err.message.split('\n').forEach((line: string) => reporter.warn(line))
    } else {
      reporter.panic(
        {
          id: prefixId(CODES.SchemaFetchError),
          context: {sourceMessage: err.stack},
        },
        err.stack,
      )
    }
  }
}

export const createResolvers: GatsbyNode['createResolvers'] = (
  args: CreateResolversArgs,
  pluginOptions: PluginConfig,
): any => {
  const typeMapKey = getCacheKey(pluginOptions, CACHE_KEYS.TYPE_MAP)
  const typeMap = (stateCache[typeMapKey] || defaultTypeMap) as TypeMap
  args.createResolvers(getGraphQLResolverMap(typeMap, pluginOptions, args))
}

export const createSchemaCustomization: GatsbyNode['createSchemaCustomization'] = (
  {actions}: CreateSchemaCustomizationArgs,
  pluginConfig: PluginConfig,
): any => {
  const {createTypes} = actions
  const graphqlSdlKey = getCacheKey(pluginConfig, CACHE_KEYS.GRAPHQL_SDL)
  const graphqlSdl = stateCache[graphqlSdlKey]
  createTypes(graphqlSdl)
}

export const sourceNodes: GatsbyNode['sourceNodes'] = async (
  args: SourceNodesArgs & {webhookBody?: SanityWebhookBody},
  pluginConfig: PluginConfig,
) => {
  const config = {...defaultConfig, ...pluginConfig}
  const {dataset, overlayDrafts, watchMode} = config
  const {actions, getNode, createNodeId, createContentDigest, reporter, webhookBody} = args
  const {createNode, createParentChildLink} = actions

  const typeMapKey = getCacheKey(pluginConfig, CACHE_KEYS.TYPE_MAP)
  const typeMap = (stateCache[typeMapKey] || defaultTypeMap) as TypeMap

  const client = getClient(config)
  const url = client.getUrl(`/data/export/${dataset}`)

  // Stitches together required methods from within the context and actions objects
  const processingOptions = {
    typeMap,
    createNodeId,
    createNode,
    createContentDigest,
    createParentChildLink,
    overlayDrafts,
  }

  if (
    webhookBody &&
    webhookBody.ids &&
    (await handleWebhookEvent(args, {client, processingOptions}))
  ) {
    // If the payload was handled by the webhook handler, fall back.
    // Otherwise, this may not be a Sanity webhook, but we should
    // still attempt to refresh our data
    return
  }

  reporter.info('[sanity] Fetching export stream for dataset')
  let numDocuments = 0
  const inputStream = await getDocumentStream(url, config.token)

  const draftDocs: SanityDocument[] = []
  const publishedNodes = new Map<string, SanityNode>()

  await pump([
    inputStream,
    split(JSON.parse),
    rejectOnApiError(),
    overlayDrafts ? extractDrafts(draftDocs) : removeDrafts(),
    removeSystemDocuments(),
    through.obj((doc: SanityDocument, enc: string, cb: through.TransformCallback) => {
      numDocuments++

      const type = getTypeName(doc._type)
      if (!typeMap.objects[type]) {
        reporter.warn(
          `[sanity] Document "${doc._id}" has type ${doc._type} (${type}), which is not declared in the GraphQL schema. Make sure you run "graphql deploy". Skipping document.`,
        )

        cb()
        return
      }

      const node = processDocument(doc, processingOptions)
      debug('Got document with ID %s (mapped to %s)', doc._id, node.id)
      cb()
    }),
  ])

  if (draftDocs.length > 0) {
    reporter.info(`[sanity] Overlaying ${draftDocs.length} drafts`)
    draftDocs.forEach((draft) => {
      processDocument(draft, processingOptions)
      const published = getNode(draft.id) as SanityNode
      if (published) {
        publishedNodes.set(unprefixId(draft._id), published)
      }
    })
  }

  if (watchMode) {
    reporter.info('[sanity] Watch mode enabled, starting a listener')
    client
      .listen('*[!(_id in path("_.**"))]')
      .pipe(filter((event) => overlayDrafts || !event.documentId.startsWith('drafts.')))
      .subscribe((event) => handleListenerEvent(event, publishedNodes, args, processingOptions))
  }

  reporter.info(`[sanity] Done! Exported ${numDocuments} documents.`)
}

export const onPreExtractQueries: GatsbyNode['onPreExtractQueries'] = async (
  context: ParentSpanPluginArgs,
  pluginConfig: PluginConfig,
) => {
  const {getNodes, store} = context
  const typeMapKey = getCacheKey(pluginConfig, CACHE_KEYS.TYPE_MAP)
  const typeMap = (stateCache[typeMapKey] || defaultTypeMap) as TypeMap
  let shouldAddFragments = typeof typeMap.objects.SanityImageAsset !== 'undefined'

  if (!shouldAddFragments) {
    shouldAddFragments = getNodes().some((node) =>
      Boolean(node.internal && node.internal.type === 'SanityImageAsset'),
    )
  }

  if (shouldAddFragments) {
    const program = store.getState().program
    await copy(
      path.join(__dirname, '..', 'fragments', 'imageFragments.js'),
      `${program.directory}/.cache/fragments/sanity-image-fragments.js`,
    )
  }
}

export const setFieldsOnGraphQLNodeType: GatsbyNode['setFieldsOnGraphQLNodeType'] = async (
  context: SetFieldsOnGraphQLNodeTypeArgs,
  pluginConfig: PluginConfig,
) => {
  const {type} = context
  let fields: {[key: string]: GraphQLFieldConfig<any, any>} = {}
  if (type.name === 'SanityImageAsset') {
    fields = {...fields, ...extendImageNode(pluginConfig)}
  }

  return fields
}

function validateConfig(config: Partial<PluginConfig>, reporter: Reporter): config is PluginConfig {
  if (!config.projectId) {
    reporter.panic(
      {
        id: prefixId(CODES.MissingProjectId),
        context: {sourceMessage: '[sanity] `projectId` must be specified'},
      },
      new Error('[sanity] `projectId` must be specified'),
    )
  }

  if (!config.dataset) {
    reporter.panic(
      {
        id: prefixId(CODES.MissingDataset),
        context: {sourceMessage: '[sanity] `dataset` must be specified'},
      },
      new Error('[sanity] `dataset` must be specified'),
    )
  }

  if (config.overlayDrafts && !config.token) {
    reporter.warn('[sanity] `overlayDrafts` is set to `true`, but no token is given')
  }

  const inDevelopMode = process.env.gatsby_executing_command === 'develop'
  if (config.watchMode && !inDevelopMode) {
    reporter.warn(
      '[sanity] Using `watchMode` when not in develop mode might prevent your build from completing',
    )
  }

  return true
}

function getClient(config: PluginConfig) {
  const {projectId, dataset, token} = config
  return new SanityClient({
    projectId,
    dataset,
    token,
    useCdn: false,
  })
}
