import {SanityWebhookBody} from './sanity'
import { Reporter, Actions, GatsbyCache } from 'gatsby'
import {GraphQLSchema, GraphQLNamedType, GraphQLFieldResolver} from 'gatsby/graphql'

interface GatsbyStoreState {
  program: {
    directory: string
  }
}

interface GatsbyStore {
  getState: () => GatsbyStoreState
}

export interface GatsbyNode {
  id: string // Gatsby node ID
  _id: string // Sanity document ID
  parent: string
  children: string[]
  internal: {
    owner: string,
    mediaType?: string
    type: string
    contentDigest: string
  }
  [key: string]: any
}

export interface GatsbyReporter {
  info: (msg: string) => null
  warn: (msg: string) => null
  error: (msg: string) => null
  panic: (msg: string) => null
  panicOnBuild: (msg: string) => null
}

export interface GatsbyParentChildLink {
  parent: GatsbyNode
  child: GatsbyNode
}

export interface GatsbyDeleteOptions {
  node: GatsbyNode
}

export type GatsbyNodeModel = {
  getNodeById: (args: {id: string}) => GatsbyNode
}

export type GatsbyGraphQLContext = {
  nodeModel: GatsbyNodeModel
}

export interface MinimalGatsbyContext {
  createNodeId: GatsbyNodeIdCreator
  getNode: (id: string) => GatsbyNode | undefined
}

export type GatsbyTypesCreator = (types: string) => null

export type GatsbyResolverMap = {
  [typeName: string]: {
    [fieldName: string]: {
      type?: string
      resolve: GraphQLFieldResolver<{[key: string]: any}, GatsbyGraphQLContext>
    }
  }
}

export type GatsbyResolversCreator = (resolvers: GatsbyResolverMap) => null

export type GatsbyNodeCreator = (node: GatsbyNode) => void

export type GatsbyNodeDeletor = (options: GatsbyDeleteOptions) => void

export type GatsbyNodeIdCreator = (id: string, namespace?: string) => string

export type GatsbyContentDigester = (content: string) => string

export type GatsbyParentChildLinker = (link: GatsbyParentChildLink) => void

export interface GatsbyOnNodeTypeContext {
  type: GraphQLNamedType
}

export interface PluginContext {
  // Gatsby-defined cache
  cache: GatsbyCache
  // Gatsby-defined actions
  actions: Actions
  createNodeId: GatsbyNodeIdCreator
  createContentDigest: GatsbyContentDigester
  // Internally-defined store object (direct use of the *Gatsby-defined* Store API is unsafe)
  store: GatsbyStore
  getNode: (id: string) => GatsbyNode | undefined
  getNodes: () => GatsbyNode[]
  // Gatsby-defined reporter
  reporter: Reporter
  webhookBody?: SanityWebhookBody
}

export interface GatsbySsrContext {
  setHeadComponents: (components: React.ReactElement[]) => undefined
}

export interface ReduxSetSchemaAction {
  payload: GraphQLSchema
}
