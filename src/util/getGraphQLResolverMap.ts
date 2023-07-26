import {camelCase} from 'lodash'
import {CreateResolversArgs} from 'gatsby'
import {GraphQLFieldResolver} from 'gatsby/graphql'
import {GatsbyResolverMap, GatsbyGraphQLContext, GatsbyNodeModel} from '../types/gatsby'
import {TypeMap, FieldDef} from './remoteGraphQLSchema'
import {resolveReferences} from './resolveReferences'
import {PluginConfig} from './validateConfig'
import {getConflictFreeFieldName, getTypeName} from './normalize'
import {SanityRef} from '../types/sanity'

/**
 * Is the type a union with both document and non-document types
 */
function isMixedUnion(typeName: string, typeMap: TypeMap) {
  const union = typeMap.unions[typeName]
  if (!union) {
    return false
  }
  return (
    union.types.some((typeName) => typeMap.objects[typeName]?.isDocument) &&
    union.types.some((typeName) => !typeMap.objects[typeName]?.isDocument)
  )
}

export function getGraphQLResolverMap(
  typeMap: TypeMap,
  pluginConfig: PluginConfig,
  context: CreateResolversArgs,
): GatsbyResolverMap {
  const resolvers: GatsbyResolverMap = {}
  Object.keys(typeMap.objects).forEach((typeName) => {
    const objectType = typeMap.objects[typeName]
    const fieldNames = Object.keys(objectType.fields)

    // Add resolvers for unions
    resolvers[objectType.name] = fieldNames
      .map((fieldName) => ({fieldName, ...objectType.fields[fieldName]}))
      .filter((field) =>
        isMixedUnion(getTypeName(field.namedType.name.value, pluginConfig.typePrefix), typeMap),
      )
      .reduce((fields, field) => {
        const targetField = objectType.isDocument
          ? getConflictFreeFieldName(field.fieldName, pluginConfig.typePrefix)
          : field.fieldName

        fields[targetField] = {resolve: getResolver(field, pluginConfig.typePrefix)}
        return fields
      }, resolvers[objectType.name] || {})

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

function getResolver(
  field: FieldDef & {fieldName: string},
  typePrefix?: string,
): GraphQLFieldResolver<{[key: string]: any}, GatsbyGraphQLContext> {
  return (source, args, context) => {
    if (field.isList) {
      const items: SanityRef[] = source[field.fieldName] || []
      return items && Array.isArray(items)
        ? items.map((item) => maybeResolveReference(item, context.nodeModel, typePrefix))
        : []
    }

    const item: SanityRef | undefined = source[field.fieldName]
    return maybeResolveReference(item, context.nodeModel, typePrefix)
  }
}

function maybeResolveReference(
  item: {_ref?: string; _type?: string; internal?: {}} | undefined,
  nodeModel: GatsbyNodeModel,
  typePrefix?: string,
) {
  if (item && typeof item._ref === 'string') {
    return nodeModel.getNodeById({id: item._ref})
  }

  if (item && typeof item._type === 'string' && !item.internal) {
    return {...item, internal: {type: getTypeName(item._type, typePrefix)}}
  }

  return item
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
