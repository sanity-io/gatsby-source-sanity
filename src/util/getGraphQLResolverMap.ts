import {camelCase} from 'lodash'
import {CreateResolversArgs} from 'gatsby'
import {GraphQLFieldResolver} from 'gatsby/graphql'
import {GatsbyResolverMap, GatsbyGraphQLContext} from '../types/gatsby'
import {TypeMap, FieldDef} from './remoteGraphQLSchema'
import {resolveReferences} from './resolveReferences'
import {PluginConfig} from './validateConfig'

export function getGraphQLResolverMap(
  typeMap: TypeMap,
  pluginConfig: PluginConfig,
  context: CreateResolversArgs,
): GatsbyResolverMap {
  const resolvers: GatsbyResolverMap = {}
  Object.keys(typeMap.objects).forEach((typeName) => {
    const objectType = typeMap.objects[typeName]
    const fieldNames = Object.keys(objectType.fields)

    // Add raw resolvers
    resolvers[objectType.name] = fieldNames
      .map((fieldName) => ({fieldName, ...objectType.fields[fieldName]}))
      .filter((field) => field.aliasFor)
      .reduce((fields, field) => {
        fields[field.fieldName] = {resolve: getRawResolver(field, pluginConfig, context)}
        return fields
      }, resolvers[objectType.name] || {})
  })

  return resolvers
}

function getRawResolver(
  field: FieldDef & {fieldName: string},
  pluginConfig: PluginConfig,
  context: CreateResolversArgs,
): GraphQLFieldResolver<{[key: string]: any}, GatsbyGraphQLContext> {
  const {fieldName} = field
  const aliasName = '_' + camelCase(`raw ${fieldName}`)
  return (obj, args) => {
    const raw = `_${camelCase(`raw_data_${field.aliasFor || fieldName}`)}`
    const value = obj[raw] || obj[aliasName] || obj[field.aliasFor || fieldName] || obj[fieldName]
    return args.resolveReferences
      ? resolveReferences(value, context, {
          maxDepth: args.resolveReferences.maxDepth,
          overlayDrafts: pluginConfig.overlayDrafts,
        })
      : value
  }
}
