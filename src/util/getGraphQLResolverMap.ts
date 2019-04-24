import {TypeMap} from './remoteGraphQLSchema'
import {GatsbyResolverMap, GatsbyNodeModel} from '../types/gatsby'
import {getTypeName} from './normalize'
import {SanityRef} from '../types/sanity'

export function getGraphQLResolverMap(typeMap: TypeMap): GatsbyResolverMap {
  // Find all fields pointing to unions
  const resolvers: GatsbyResolverMap = {}
  Object.keys(typeMap.objects).forEach(typeName => {
    const objectType = typeMap.objects[typeName]
    const unionFields = Object.keys(objectType.fields)
      .map(fieldName => ({fieldName, ...objectType.fields[fieldName]}))
      .filter(field => typeMap.unions[getTypeName(field.namedType.name.value)])

    if (!unionFields.length) {
      return
    }

    resolvers[objectType.name] = unionFields.reduce((fields, field) => {
      fields[field.fieldName] = {
        resolve: (source, args, context) => {
          if (field.isList) {
            const items: SanityRef[] = source[field.fieldName] || []
            return items && Array.isArray(items)
              ? items.map(item => maybeResolveReference(item, context.nodeModel))
              : []
          }

          const item: SanityRef | undefined = source[field.fieldName]
          return maybeResolveReference(item, context.nodeModel)
        },
      }

      return fields
    }, resolvers[objectType.name] || {})
  })

  return resolvers
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
