import * as split from 'split2'
import * as through from 'through2'
import {filter} from 'rxjs/operators'
import SanityClient = require('@sanity/client')
import {GatsbyContext, GatsbyReporter, GatsbyNode} from './types/gatsby'
import {SanityDocument} from './types/sanity'
import {pump} from './util/pump'
import {removeDrafts, extractDrafts, unprefixId} from './util/handleDrafts'
import {rejectOnApiError} from './util/rejectOnApiError'
import {processDocument} from './util/normalize'
import {getDocumentStream} from './util/getDocumentStream'
import {removeSystemDocuments} from './util/removeSystemDocuments'
import {getRemoteGraphQLSchema, transformRemoteGraphQLSchema} from './util/remoteGraphQLSchema'
import {handleListenerEvent, ListenerMessage} from './util/handleListenerEvent'
import debug from './debug'

interface PluginConfig {
  projectId: string
  dataset: string
  token?: string
  version?: string
  overlayDrafts?: boolean
  watchMode?: boolean
}

const inDevelopMode = process.env.gatsby_executing_command === 'develop'

const defaultConfig = {
  version: '1',
  overlayDrafts: false
}

export const onPreBootstrap = async (context: GatsbyContext, pluginConfig: PluginConfig) => {
  const config = {...defaultConfig, ...pluginConfig}
  const {actions, reporter} = context

  validateConfig(config, reporter)

  try {
    reporter.info('[sanity] Fetching remote GraphQL schema')
    const client = getClient(config)
    const api = await getRemoteGraphQLSchema(client)

    reporter.info('[sanity] Stitching GraphQL schemas from SDL')
    const remoteSchema = await transformRemoteGraphQLSchema(api)
    const {addThirdPartySchema} = actions
    addThirdPartySchema({schema: remoteSchema})
  } catch (err) {
    if (err.isWarning) {
      err.message.split('\n').forEach((line: string) => reporter.warn(line))
    } else {
      throw err
    }
  }
}

export const sourceNodes = async (context: GatsbyContext, pluginConfig: PluginConfig) => {
  const config = {...defaultConfig, ...pluginConfig}
  const {dataset, overlayDrafts, watchMode} = config
  const {actions, getNode, createNodeId, createContentDigest, reporter} = context
  const {createNode, createParentChildLink} = actions

  const client = getClient(config)
  const url = client.getUrl(`/data/export/${dataset}`)

  reporter.info('[sanity] Fetching export stream for dataset')
  const inputStream = await getDocumentStream(url, config.token)

  const processingOptions = {
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

  if (config.watchMode && !inDevelopMode) {
    reporter.warn(
      '[sanity] Using `watchMode` when not in develop mode might prevent your build from completing'
    )
  }
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
