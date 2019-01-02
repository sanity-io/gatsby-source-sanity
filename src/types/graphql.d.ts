declare module 'gatsby/graphql' {
  import {GraphQLScalarType} from 'graphql'
  export * from 'graphql'
  export const GraphQLJSON: GraphQLScalarType
}
