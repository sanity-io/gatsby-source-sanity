import {bufferTime, filter, map, tap} from 'rxjs/operators'
import {GraphQLFieldConfig} from 'gatsby/graphql'
import gatsbyPkg from 'gatsby/package.json'
import SanityClient from '@sanity/client'
import {
  CreateSchemaCustomizationArgs,
  GatsbyNode,
  ParentSpanPluginArgs,
  PluginOptions,
  Reporter,
  SetFieldsOnGraphQLNodeTypeArgs,
  SourceNodesArgs,
} from 'gatsby'
import {SanityDocument, SanityWebhookBody} from './types/sanity'
import {getTypeName, toGatsbyNode} from './util/normalize'
import {CACHE_KEYS, getCacheKey} from './util/cache'
import {handleWebhookEvent} from './util/handleWebhookEvent'
import {
  defaultTypeMap,
  getRemoteGraphQLSchema,
  getTypeMapFromGraphQLSchema,
  TypeMap,
} from './util/remoteGraphQLSchema'
import {
  prefixId as prefixErrorId,
  ERROR_MAP,
  ERROR_CODES,
  SANITY_ERROR_CODE_MAP,
  SANITY_ERROR_CODE_MESSAGES,
} from './util/errors'
import {extendImageNode} from './images/extendImageNode'
import {rewriteGraphQLSchema} from './util/rewriteGraphQLSchema'
import {getGraphQLResolverMap} from './util/getGraphQLResolverMap'
import {prefixId, unprefixId} from './util/documentIds'
import {getAllDocuments} from './util/getAllDocuments'
import oneline from 'oneline'
import {uniq} from 'lodash'
import {SanityInputNode} from './types/gatsby'
import debug from './debug'

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

export const onPreBootstrap: GatsbyNode['onPreBootstrap'] = async (args, pluginOptions?) => {
  const config = {...defaultConfig, ...pluginOptions}
  const {reporter} = args

  if (Number(gatsbyPkg.version.split('.')[0]) < 3) {
    const unsupportedVersionMessage = oneline`
    You are using a version of Gatsby not supported by gatsby-source-sanity.
    Upgrade gatsby to >= 3.0.0 to continue.`

    reporter.panic({
      id: prefixErrorId(ERROR_CODES.UnsupportedGatsbyVersion),
      context: {sourceMessage: unsupportedVersionMessage},
    })

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
      return
    }

    if (typeof err.code === 'string' && SANITY_ERROR_CODE_MAP[err.code]) {
      reporter.panic({
        id: prefixId(SANITY_ERROR_CODE_MAP[err.code]),
        context: {sourceMessage: `[sanity] ${SANITY_ERROR_CODE_MESSAGES[err.code]}`},
      })
    }

    const prefix = typeof err.code === 'string' ? `[${err.code}] ` : ''
    reporter.panic({
      id: prefixId(ERROR_CODES.SchemaFetchError),
      context: {sourceMessage: `${prefix}${err.message}`},
    })
  }
}

export const createResolvers: GatsbyNode['createResolvers'] = (
  args,
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
  const {actions, createNodeId, createContentDigest, reporter, webhookBody} = args
  const {createNode, deleteNode, createParentChildLink} = actions

  const typeMapKey = getCacheKey(pluginConfig, CACHE_KEYS.TYPE_MAP)
  const typeMap = (stateCache[typeMapKey] || defaultTypeMap) as TypeMap

  const client = getClient(config)
  const url = client.getUrl(`/data/export/${dataset}?tag=sanity.gatsby.source-nodes`)

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

  const documents = await downloadDocuments(url, config.token, {includeDrafts: overlayDrafts})
  const gatsbyNodes = new Map<string, SanityInputNode>()

  // sync a single document from the local cache of known documents with gatsby
  function syncWithGatsby(id: string) {
    const publishedId = unprefixId(id)
    const draftId = prefixId(id)

    const published = documents.get(publishedId)
    const draft = documents.get(draftId)

    const doc = draft || published
    if (doc) {
      const type = getTypeName(doc._type)
      if (!typeMap.objects[type]) {
        reporter.warn(
          `[sanity] Document "${doc._id}" has type ${doc._type} (${type}), which is not declared in the GraphQL schema. Make sure you run "graphql deploy". Skipping document.`,
        )
        return
      }
    }

    if (id === draftId && !overlayDrafts) {
      // do nothing, we're not overlaying drafts
      debug('overlayDrafts is not enabled, so skipping createNode for draft')
      return
    }

    if (id === publishedId) {
      if (draft && overlayDrafts) {
        // we have a draft, and overlayDrafts is enabled, so skip to the draft document instead
        debug(
          'skipping createNode of %s since there is a draft and overlayDrafts is enabled',
          publishedId,
        )
        return
      }

      if (gatsbyNodes.has(publishedId)) {
        // sync existing gatsby node with document from updated cache
        if (published) {
          debug('updating gatsby node for %s', publishedId)
          const node = toGatsbyNode(published, processingOptions)
          gatsbyNodes.set(publishedId, node)
          createNode(node)
        } else {
          // the published document has been removed (note - we either have no draft or overlayDrafts is not enabled so merely removing is ok here)
          debug(
            'deleting gatsby node for %s since there is no draft and overlayDrafts is not enabled',
            publishedId,
          )
          deleteNode(gatsbyNodes.get(publishedId)!)
          gatsbyNodes.delete(publishedId)
        }
      } else if (published) {
        // when we don't have a gatsby node for the published document
        debug('creating gatsby node for %s', publishedId)
        const node = toGatsbyNode(published, processingOptions)
        gatsbyNodes.set(publishedId, node)
        createNode(node)
      }
    }
    if (id === draftId && overlayDrafts) {
      // we're syncing a draft version and overlayDrafts is enabled
      if (gatsbyNodes.has(publishedId) && !draft && !published) {
        // have stale gatsby node for a published document that has neither a draft or a published (e.g. it's been deleted)
        debug(
          'deleting gatsby node for %s since there is neither a draft nor a published version of it any more',
          publishedId,
        )
        deleteNode(gatsbyNodes.get(publishedId)!)
        gatsbyNodes.delete(publishedId)
        return
      }

      debug(
        'Replacing gatsby node for %s using the %s document',
        publishedId,
        draft ? 'draft' : 'published',
      )
      // pick the draft if we can, otherwise pick the published
      const node = toGatsbyNode((draft || published)!, processingOptions)
      gatsbyNodes.set(publishedId, node)
      createNode(node)
    }
  }

  function syncAllWithGatsby() {
    for (const id of documents.keys()) {
      syncWithGatsby(id)
    }
  }

  function syncIdsWithGatsby(ids: string[]) {
    for (const id of ids) {
      syncWithGatsby(id)
    }
  }
  if (watchMode) {
    // Note: since we don't setup the listener before *after* all documents has been fetched here we will miss any events that
    // happened in the time window between the documents was fetched and the listener connected. If this happens, the
    // preview will show an outdated version of the document.
    reporter.info('[sanity] Watch mode enabled, starting a listener')
    client
      .listen('*[!(_id in path("_.**"))]')
      .pipe(
        filter((event) => overlayDrafts || !event.documentId.startsWith('drafts.')),
        tap((event) => {
          if (event.result) {
            documents.set(event.documentId, event.result)
          } else {
            documents.delete(event.documentId)
          }
        }),
        map((event) => event.documentId),
        bufferTime(100),
        map((ids) => uniq(ids)),
        filter((ids) => ids.length > 0),
        tap((updateIds) =>
          debug('The following documents updated and will be synced with gatsby: ', updateIds),
        ),
        tap((updatedIds) => syncIdsWithGatsby(updatedIds)),
      )
      .subscribe()
  }
  // do the initial sync from sanity documents to gatsby nodes
  syncAllWithGatsby()
  reporter.info(`[sanity] Done! Exported ${documents.size} documents.`)
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
    reporter.panic({
      id: prefixId(ERROR_CODES.MissingProjectId),
      context: {sourceMessage: '[sanity] `projectId` must be specified'},
    })
  }

  if (!config.dataset) {
    reporter.panic({
      id: prefixId(ERROR_CODES.MissingDataset),
      context: {sourceMessage: '[sanity] `dataset` must be specified'},
    })
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

function downloadDocuments(
  url: string,
  token?: string,
  options: {includeDrafts?: boolean} = {},
): Promise<Map<string, SanityDocument>> {
  return getAllDocuments(url, token, options).then(
    (stream) =>
      new Promise((resolve, reject) => {
        const documents = new Map<string, SanityDocument>()
        stream.on('data', (doc) => {
          documents.set(doc._id, doc)
        })
        stream.on('end', () => {
          resolve(documents)
        })
        stream.on('error', (error) => {
          reject(error)
        })
      }),
  )
}

function getClient(config: PluginConfig) {
  const {projectId, dataset, token} = config
  return new SanityClient({
    projectId,
    dataset,
    token,
    apiVersion: '1',
    useCdn: false,
  })
}
