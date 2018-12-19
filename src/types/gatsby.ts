import {GraphQLSchema} from 'graphql'

export interface GatsbyNode {
  id: string // Gatsby node ID
  _id: string // Sanity document ID
  parent?: string | null
  children?: string[]
  internal?: {
    mediaType: string
    type: string
    contentDigest: string
  }
  [key: string]: any
}

export interface GatsbyReporter {
  info: (msg: string) => null
  warn: (msg: string) => null
}

export interface GatsbyParentChildLink {
  parent: GatsbyNode
  child: GatsbyNode
}

export interface GatsbyDeleteOptions {
  node: GatsbyNode
}

export type GatsbyNodeCreator = (node: GatsbyNode) => null

export type GatsbyNodeDeletor = (options: GatsbyDeleteOptions) => null

export type GatsbyNodeIdCreator = (id: string, namespace?: string) => string

export type GatsbyContentDigester = (content: string) => string

export type GatsbyParentChildLinker = (link: GatsbyParentChildLink) => null

export interface GatsbyContext {
  actions: GatsbyActions
  createNodeId: GatsbyNodeIdCreator
  createContentDigest: GatsbyContentDigester
  getNode: (id: string) => GatsbyNode | undefined
  getNodes: () => GatsbyNode[]
  reporter: GatsbyReporter
}

export interface GatsbyActions {
  createNode: GatsbyNodeCreator
  deleteNode: GatsbyNodeDeletor
  createParentChildLink: GatsbyParentChildLinker
  touchNode: (options: {nodeId: string}) => null
  addThirdPartySchema: (schema: {schema: GraphQLSchema}) => null
}
