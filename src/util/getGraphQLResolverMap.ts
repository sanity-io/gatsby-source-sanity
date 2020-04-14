import {TypeMap, FieldDef} from './remoteGraphQLSchema'
import {GatsbyResolverMap, GatsbyNodeModel, GatsbyGraphQLContext} from '../types/gatsby'
import {getTypeName, getConflictFreeFieldName} from './normalize'
import {SanityRef} from '../types/sanity'
import {GraphQLFieldResolver} from 'graphql'

export function getGraphQLResolverMap(typeMap: TypeMap): GatsbyResolverMap {
  const resolvers: GatsbyResolverMap = {}
  Object.keys(typeMap.objects).forEach(typeName => {
    const objectType = typeMap.objects[typeName]
    const resolveFields = Object.keys(objectType.fields)
      .map(fieldName => ({fieldName, ...objectType.fields[fieldName]}))
      .filter(
        field =>
          field.isList ||
          field.isReference ||
          typeMap.unions[getTypeName(field.namedType.name.value)],
      )

    if (!resolveFields.length) {
      return
    }

    resolvers[objectType.name] = resolveFields.reduce((fields, field) => {
      const targetField = objectType.isDocument
        ? getConflictFreeFieldName(field.fieldName)
        : field.fieldName

      fields[targetField] = {resolve: getResolver(field)}
      return fields
    }, resolvers[objectType.name] || {})
  })

  return resolvers
}

function getResolver(
  field: FieldDef & {fieldName: string},
): GraphQLFieldResolver<{[key: string]: any}, GatsbyGraphQLContext> {
  return (source, args, context) => {
    if (field.isList) {
      const items: SanityRef[] = source[field.fieldName] || []
      return items && Array.isArray(items)
        ? items.map(item => maybeResolveReference(item, context.nodeModel))
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
