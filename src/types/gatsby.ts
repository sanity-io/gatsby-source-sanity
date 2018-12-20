import {GraphQLSchema} from 'graphql'

export interface GatsbyNode {
  id: string
  parent: string | null
  children: string[]
  internal: {
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

export type GatsbyNodeCreator = (node: GatsbyNode) => null

export type GatsbyNodeIdCreator = (id: string, namespace?: string) => string

export type GatsbyContentDigester = (content: string) => string

export type GatsbyParentChildLinker = (link: GatsbyParentChildLink) => null

export interface GatsbyContext {
  actions: GatsbyActions
  createNodeId: GatsbyNodeIdCreator
  createContentDigest: GatsbyContentDigester
  getNodes: () => GatsbyNode[]
  reporter: GatsbyReporter
}

export interface GatsbyActions {
  createNode: GatsbyNodeCreator
  createParentChildLink: GatsbyParentChildLinker
  touchNode: (options: {nodeId: string}) => null
  addThirdPartySchema: (schema: {schema: GraphQLSchema}) => null
}
