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
}

export interface GatsbyReporter {
  info: (msg: string) => null
  warn: (msg: string) => null
}

export type GatsbyNodeIdCreator = (id: string) => string

export type GatsbyContentDigester = (content: string) => string

export interface GatsbyContext {
  actions: GatsbyActions
  createNodeId: GatsbyNodeIdCreator
  createContentDigest: GatsbyContentDigester
  getNodes: () => GatsbyNode[]
  reporter: GatsbyReporter
}

export interface GatsbyActions {
  createNode: (node: GatsbyNode) => null
  touchNode: (options: {nodeId: string}) => null
  addThirdPartySchema: (schema: {schema: GraphQLSchema}) => null
}
