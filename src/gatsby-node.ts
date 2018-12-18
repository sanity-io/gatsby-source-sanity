import * as split from 'split2'
import * as through from 'through2'
import SanityClient = require('@sanity/client')
import {GatsbyContext} from './types/gatsby'
import {pump} from './util/pump'
import {removeDrafts} from './util/removeDrafts'
import {rejectOnApiError} from './util/rejectOnApiError'
import {processDocument} from './util/normalize'
import {getDocumentStream} from './util/getDocumentStream'
import {removeSystemDocuments} from './util/removeSystemDocuments'
import {getRemoteGraphQLSchema, transformRemoteGraphQLSchema} from './util/remoteGraphQLSchema'
import {pkgName} from './index'
import {SanityDocument} from './types/sanity'

interface PluginConfig {
  projectId: string
  dataset: string
  token: string
  version?: string
}

export const onPreBootstrap = async (context: GatsbyContext, config: PluginConfig) => {
  const {actions, reporter} = context

  validateConfig(config)

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

export const sourceNodes = async (context: GatsbyContext, config: PluginConfig) => {
  const {actions, createNodeId, createContentDigest, reporter} = context
  const {createNode} = actions
  const {dataset} = config

  const client = getClient(config)
  const url = client.getUrl(`/data/export/${dataset}`)

  const nodeIds: string[] = []

  reporter.info('[sanity] Fetching export stream for dataset')
  const inputStream = await getDocumentStream(url, config.token)

  await pump([
    inputStream,
    split(JSON.parse),
    rejectOnApiError(),
    removeDrafts(),
    removeSystemDocuments(),
    through.obj((doc: SanityDocument, enc: string, cb: through.TransformCallback) => {
      reporter.info('[sanity] Got document with ID ' + doc._id)
      const node = processDocument(doc, {createNodeId, createContentDigest})
      nodeIds.push(node.id)
      createNode(node)
      cb()
    })
  ])

  reporter.info('Done fetching from Sanity!')
}

function validateConfig(config: PluginConfig) {
  if (!config.projectId) {
    throw new Error(`${pkgName}: 'projectId' must be specified`)
  }

  if (!config.dataset) {
    throw new Error(`${pkgName}: 'dataset' must be specified`)
  }

  if (!config.token) {
    throw new Error(`${pkgName}: 'token' must be specified`)
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
