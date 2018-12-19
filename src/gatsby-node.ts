import * as split from 'split2'
import * as through from 'through2'
import SanityClient = require('@sanity/client')
import {GatsbyContext, GatsbyReporter} from './types/gatsby'
import {SanityDocument} from './types/sanity'
import {pump} from './util/pump'
import {removeDrafts, extractDrafts} from './util/handleDrafts'
import {rejectOnApiError} from './util/rejectOnApiError'
import {processDocument} from './util/normalize'
import {getDocumentStream} from './util/getDocumentStream'
import {removeSystemDocuments} from './util/removeSystemDocuments'
import {getRemoteGraphQLSchema, transformRemoteGraphQLSchema} from './util/remoteGraphQLSchema'

interface PluginConfig {
  projectId: string
  dataset: string
  token?: string
  version?: string
  overlayDrafts?: boolean
}

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
  const {dataset, overlayDrafts} = config
  const {actions, createNodeId, createContentDigest, reporter} = context
  const {createNode} = actions

  const client = getClient(config)
  const url = client.getUrl(`/data/export/${dataset}`)

  reporter.info('[sanity] Fetching export stream for dataset')
  const inputStream = await getDocumentStream(url, config.token)

  const drafts: SanityDocument[] = []
  const processingOptions = {createNodeId, createContentDigest, overlayDrafts}
  await pump([
    inputStream,
    split(JSON.parse),
    rejectOnApiError(),
    overlayDrafts ? extractDrafts(drafts) : removeDrafts(),
    removeSystemDocuments(),
    through.obj((doc: SanityDocument, enc: string, cb: through.TransformCallback) => {
      reporter.info('[sanity] Got document with ID ' + doc._id)
      createNode(processDocument(doc, processingOptions))
      cb()
    })
  ])

  if (drafts.length > 0) {
    reporter.info('[sanity] Overlaying drafts')
    drafts.forEach(draft => {
      createNode(processDocument(draft, processingOptions))
    })
  }

  reporter.info('[sanity] Done fetching documents!')
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
