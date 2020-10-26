import {camelCase} from 'lodash'
import {CreateResolversArgs} from 'gatsby'
import {GraphQLFieldResolver} from 'gatsby/graphql'
import {SanityRef} from '../types/sanity'
import {PluginConfig} from '../gatsby-node'
import {GatsbyResolverMap, GatsbyNodeModel, GatsbyGraphQLContext} from '../types/gatsby'
import {TypeMap, FieldDef} from './remoteGraphQLSchema'
import {getTypeName, getConflictFreeFieldName} from './normalize'
import {resolveReferences} from './resolveReferences'

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

    // Add resolvers for lists, referenes and unions
    resolvers[objectType.name] = fieldNames
      .map((fieldName) => ({fieldName, ...objectType.fields[fieldName]}))
      .filter(
        (field) =>
          field.isList ||
          field.isReference ||
          typeMap.unions[getTypeName(field.namedType.name.value)],
      )
      .reduce((fields, field) => {
        const targetField = objectType.isDocument
          ? getConflictFreeFieldName(field.fieldName)
          : field.fieldName

        fields[targetField] = {resolve: getResolver(field)}
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

function getResolver(
  field: FieldDef & {fieldName: string},
): GraphQLFieldResolver<{[key: string]: any}, GatsbyGraphQLContext> {
  return (source, args, context) => {
    if (field.isList) {
      const items: SanityRef[] = source[field.fieldName] || []
      return items && Array.isArray(items)
        ? items.map((item) => maybeResolveReference(item, context.nodeModel))
        : []
    }

    const item: SanityRef | undefined = source[field.fieldName]
    return maybeResolveReference(item, context.nodeModel)
  }
}

function maybeResolveReference(
  item: {_ref?: string; _type?: string; internal?: {}} | undefined,
  nodeModel: GatsbyNodeModel,
) {
  if (item && typeof item._ref === 'string') {
    return nodeModel.getNodeById({id: item._ref})
  }

  if (item && typeof item._type === 'string' && !item.internal) {
    return {...item, internal: {type: getTypeName(item._type)}}
  }

  return item
}
