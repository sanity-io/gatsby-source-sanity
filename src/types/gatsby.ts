import {GraphQLSchema, GraphQLNamedType, GraphQLFieldResolver} from 'graphql'

interface GatsbyEventEmitter {
  on: (event: String, fn: Function) => null
  off: (event: String, fn: Function) => null
}

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
  parent?: string | null
  children?: string[]
  internal?: {
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

export type GatsbyNodeCreator = (node: GatsbyNode) => null

export type GatsbyNodeDeletor = (options: GatsbyDeleteOptions) => null

export type GatsbyNodeIdCreator = (id: string, namespace?: string) => string

export type GatsbyContentDigester = (content: string) => string

export type GatsbyParentChildLinker = (link: GatsbyParentChildLink) => null

export interface GatsbyCache {
  name: string
  cache: {
    del: (key: string) => Promise<any>
    get: (key: string) => Promise<any>
    set: (key: string, value: any) => Promise<any>
    mset: (
      key1: string,
      val1: any,
      key2: string,
      val2: any,
      key3?: string,
      val3?: any,
    ) => Promise<any>
  }
}

export interface GatsbyOnNodeTypeContext {
  type: GraphQLNamedType
}

export interface GatsbyContext {
  emitter: GatsbyEventEmitter
  cache: GatsbyCache
  actions: GatsbyActions
  createNodeId: GatsbyNodeIdCreator
  createContentDigest: GatsbyContentDigester
  store: GatsbyStore
  getNode: (id: string) => GatsbyNode | undefined
  getNodes: () => GatsbyNode[]
  reporter: GatsbyReporter
}

export interface GatsbySsrContext {
  setHeadComponents: (components: React.ReactElement[]) => undefined
}

export interface GatsbyActions {
  createTypes: GatsbyTypesCreator
  createResolvers: GatsbyResolversCreator
  createNode: GatsbyNodeCreator
  deleteNode: GatsbyNodeDeletor
  createParentChildLink: GatsbyParentChildLinker
  touchNode: (options: {nodeId: string}) => null
  addThirdPartySchema: (schema: {schema: GraphQLSchema | string}) => null
}

export interface ReduxSetSchemaAction {
  payload: GraphQLSchema
}
