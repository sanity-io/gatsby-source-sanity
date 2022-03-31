import sanityClient, {SanityClient} from '@sanity/client'
import {
  CreateSchemaCustomizationArgs,
  GatsbyNode,
  Node,
  ParentSpanPluginArgs,
  PluginOptions,
  SetFieldsOnGraphQLNodeTypeArgs,
  SourceNodesArgs,
} from 'gatsby'
import {GraphQLFieldConfig} from 'gatsby/graphql'
import {polyfillImageServiceDevRoutes} from 'gatsby-plugin-utils/polyfill-remote-file'
import {addRemoteFilePolyfillInterface} from 'gatsby-plugin-utils/polyfill-remote-file'
import gatsbyPkg from 'gatsby/package.json'
import {uniq} from 'lodash'
import oneline from 'oneline'
import {fromEvent, merge, of} from 'rxjs'
import {bufferWhen, debounceTime, filter, map, tap} from 'rxjs/operators'
import debug from './debug'
import {extendImageNode} from './images/extendImageNode'
import {SanityInputNode} from './types/gatsby'
import {SanityDocument, SanityWebhookBody} from './types/sanity'
import {CACHE_KEYS, getCacheKey} from './util/cache'
import {prefixId, unprefixId} from './util/documentIds'
import downloadDocuments from './util/downloadDocuments'
import {
  ERROR_CODES,
  ERROR_MAP,
  prefixId as prefixErrorId,
  SANITY_ERROR_CODE_MAP,
  SANITY_ERROR_CODE_MESSAGES,
} from './util/errors'
import {getGraphQLResolverMap} from './util/getGraphQLResolverMap'
import {getLastBuildTime, registerBuildTime} from './util/getPluginStatus'
import getSyncWithGatsby from './util/getSyncWithGatsby'
import handleDeltaChanges from './util/handleDeltaChanges'
import {handleWebhookEvent} from './util/handleWebhookEvent'
import {
  defaultTypeMap,
  getRemoteGraphQLSchema,
  getTypeMapFromGraphQLSchema,
  TypeMap,
} from './util/remoteGraphQLSchema'
import {rewriteGraphQLSchema} from './util/rewriteGraphQLSchema'
import validateConfig, {PluginConfig} from './util/validateConfig'

let coreSupportsOnPluginInit: 'unstable' | 'stable' | undefined

try {
  const {isGatsbyNodeLifecycleSupported} = require(`gatsby-plugin-utils`)
  if (isGatsbyNodeLifecycleSupported(`onPluginInit`)) {
    coreSupportsOnPluginInit = 'stable'
  } else if (isGatsbyNodeLifecycleSupported(`unstable_onPluginInit`)) {
    coreSupportsOnPluginInit = 'unstable'
  }
} catch (e) {
  console.error(`Could not check if Gatsby supports onPluginInit lifecycle`)
}

const defaultConfig = {
  version: '1',
  overlayDrafts: false,
  graphqlTag: 'default',
  watchModeBuffer: 150,
}

const stateCache: {[key: string]: any} = {}

const initializePlugin = async (
  {reporter}: ParentSpanPluginArgs,
  pluginOptions?: PluginOptions,
) => {
  const config = {...defaultConfig, ...pluginOptions}

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
  } catch (err: any) {
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

export const onPreInit: GatsbyNode['onPreInit'] = async ({reporter}: ParentSpanPluginArgs) => {
  // onPluginInit replaces onPreInit in Gatsby V4
  // Old versions of Gatsby does not have the method setErrorMap
  if (!coreSupportsOnPluginInit && reporter.setErrorMap) {
    reporter.setErrorMap(ERROR_MAP)
  }
}

export const onPreBootstrap: GatsbyNode['onPreBootstrap'] = async (args, pluginOptions?) => {
  // Because we are setting global state here, this code now needs to run in onPluginInit if using Gatsby V4
  if (!coreSupportsOnPluginInit) {
    await initializePlugin(args, pluginOptions)
  }
}

const onPluginInit = async (args: ParentSpanPluginArgs, pluginOptions?: PluginOptions) => {
  args.reporter.setErrorMap(ERROR_MAP)
  await initializePlugin(args, pluginOptions)
}

if (coreSupportsOnPluginInit === 'stable') {
  // to properly initialize plugin in worker (`onPreBootstrap` won't run in workers)
  // need to conditionally export otherwise it throw an error for older versions
  exports.onPluginInit = onPluginInit
} else if (coreSupportsOnPluginInit === 'unstable') {
  exports.unstable_onPluginInit = onPluginInit
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
  {actions, schema}: CreateSchemaCustomizationArgs,
  pluginConfig: PluginConfig,
): any => {
  const {createTypes} = actions
  const graphqlSdlKey = getCacheKey(pluginConfig, CACHE_KEYS.GRAPHQL_SDL)
  const graphqlSdl = stateCache[graphqlSdlKey]

  createTypes([
    graphqlSdl,
    /**
     * The following type is for the Gatsby Image CDN resolver `gatsbyImage`. SanityImageAsset already exists in `graphqlSdl` above and then this type will be merged into it, extending it with image CDN support.
     */
    addRemoteFilePolyfillInterface(
      schema.buildObjectType({
        name: `SanityImageAsset`,
        fields: {},
        interfaces: [`Node`, `RemoteFile`],
      }),
      {
        schema,
        actions,
      },
    ),
  ])
}

const getDocumentIds = async (client: SanityClient): Promise<string[]> => {
  // Largish batch size to reduce network round trips without putting too much stress on API
  const batchSize = 30000

  let prevId: string | undefined
  let ids = [] as string[]

  while (true) {
    const batch = await client.fetch<string[]>(
      prevId !== undefined
        ? `*[!(_type match "system.**") && _id > $prevId][0...$batchSize]._id`
        : `*[!(_type match "system.**")][0...$batchSize]._id`,
      {
        prevId: prevId || null,
        batchSize,
      },
    )
    ids.push(...batch)
    if (batch.length < batchSize) {
      break
    }
    prevId = batch[batch.length - 1]
  }

  return ids
}

export const sourceNodes: GatsbyNode['sourceNodes'] = async (
  args: SourceNodesArgs & {webhookBody?: SanityWebhookBody},
  pluginConfig: PluginConfig,
) => {
  const config = {...defaultConfig, ...pluginConfig}
  const {dataset, overlayDrafts, watchMode} = config
  const {actions, createNodeId, createContentDigest, reporter, webhookBody} = args
  const {createNode, createParentChildLink} = actions
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
    client,
  }

  // PREVIEW UPDATES THROUGH WEBHOOKS
  // =======
  // `webhookBody` is always present, even when sourceNodes is called in Gatsby's initialization.
  // As such, we need to check if it has any key to work with it.
  if (webhookBody && Object.keys(webhookBody).length > 0) {
    const webhookHandled = handleWebhookEvent(args, {client, processingOptions})

    // Even if the webhook body is invalid, let's avoid re-fetching all documents.
    // Otherwise, we'd be overloading Gatsby's preview servers on large datasets.
    if (!webhookHandled) {
      reporter.warn(
        '[sanity] Received webhook is invalid. Make sure your Sanity webhook is configured correctly.',
      )
      reporter.info(`[sanity] Webhook data: ${JSON.stringify(webhookBody, null, 2)}`)
    }

    return
  }

  const gatsbyNodes = new Map<string, SanityInputNode | Node>()
  let documents = new Map<string, SanityDocument>()
  let syncWithGatsby = getSyncWithGatsby({
    documents,
    gatsbyNodes,
    args,
    processingOptions,
    typeMap,
  })

  // If we have a warm build, let's fetch only those which changed since the last build
  const lastBuildTime = getLastBuildTime(args)
  let deltaHandled = false
  if (lastBuildTime) {
    try {
      // Let's make sure we keep documents nodes already in the cache (3 steps)
      // =========
      // 1/4. Get all valid document IDs from Sanity
      const documentIds = new Set(await getDocumentIds(client))

      // 2/4. Get all document types implemented in the GraphQL layer
      // @initializePlugin() will populate `stateCache` with 1+ TypeMaps
      const typeMapStateKeys = Object.keys(stateCache).filter((key) => key.endsWith('typeMap'))
      // Let's take all document types from these TypeMaps
      const sanityDocTypes = Array.from(
        // De-duplicate types with a Set
        new Set(
          typeMapStateKeys.reduce((types, curKey) => {
            const map = stateCache[curKey] as TypeMap
            const documentTypes = Object.keys(map.objects).filter(
              (key) => map.objects[key].isDocument,
            )
            return [...types, ...documentTypes]
          }, [] as string[]),
        ),
      )

      // 3/4. From these types, get all nodes from store that are created from this plugin.
      // (we didn't use args.getNodes() as that'd be too expensive - hence why we limit it to Sanity-only types)
      for (const docType of sanityDocTypes) {
        args
          .getNodesByType(docType)
          // 4/4. touch valid documents to prevent Gatsby from deleting them
          .forEach((node) => {
            // If a document isn't included in documentIds, that means it was deleted since lastBuildTime. Don't touch it.
            if (
              node.internal.owner === 'gatsby-source-sanity' &&
              typeof node._id === 'string' &&
              (documentIds.has(node._id) || documentIds.has(unprefixId(node._id)))
            ) {
              actions.touchNode(node)
              gatsbyNodes.set(unprefixId(node._id), node)
              documents.set(node._id, node as unknown as SanityDocument)
            }
          })
      }

      // With existing documents cached, let's handle those that changed since last build
      deltaHandled = await handleDeltaChanges({
        args,
        lastBuildTime,
        client,
        syncWithGatsby,
      })
      if (!deltaHandled) {
        reporter.warn(
          "[sanity] Couldn't retrieve latest changes. Will fetch all documents instead.",
        )
      }
    } catch (error) {
      // lastBuildTime isn't a date, ignore it
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

    if (pluginConfig.watchModeBuffer) {
      reporter.warn(
        "[sanity] watchModeBuffer isn't a supported option. The plugin will automatically apply changes when Gatsby can handle them.",
      )
    }

    const gatsbyEvents = fromEvent(args.emitter, '*')

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
        // Wait `x`ms since the last internal change from Gatsby to let it rest before we add the nodes to GraphQL
        bufferWhen(() =>
          merge(
            gatsbyEvents,
            // If no Gatsby event, emit a dummy event just to unlock bufferWhen
            of(0),
          ).pipe(debounceTime(config.watchModeBuffer)),
        ),
        filter((ids) => ids.length > 0),
        map((ids) => uniq(ids)),
        tap((updateIds) =>
          debug('The following documents updated and will be synced with gatsby: ', updateIds),
        ),
        tap((updatedIds) => syncIdsWithGatsby(updatedIds)),
      )
      .subscribe()
  }

  if (!deltaHandled) {
    reporter.info('[sanity] Fetching export stream for dataset')
    documents = await downloadDocuments(url, config.token, {includeDrafts: overlayDrafts})
    reporter.info(`[sanity] Done! Exported ${documents.size} documents.`)
    // Renew syncWithGatsby w/ latest documents Map
    syncWithGatsby = getSyncWithGatsby({
      documents,
      gatsbyNodes,
      args,
      processingOptions,
      typeMap,
    })
    // do the initial sync from sanity documents to gatsby nodes
    syncAllWithGatsby()
  }

  // register the current build time for accessing it in handleDeltaChanges for future builds
  registerBuildTime(args)
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

function getClient(config: PluginConfig) {
  const {projectId, dataset, token} = config
  return sanityClient({
    projectId,
    dataset,
    token,
    apiVersion: '1',
    useCdn: false,
  })
}

export const onCreateDevServer = async ({app}: {app: any}) => {
  polyfillImageServiceDevRoutes(app)
}
