import {TypeMap} from './remoteGraphQLSchema'
import {GatsbyResolverMap} from '../types/gatsby'
import {getTypeName} from './normalize'

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
            const ids: string[] = source[`${field.fieldName}___NODE`] || []
            return ids && Array.isArray(ids)
              ? ids.map(id => context.nodeModel.getNodeById({id}))
              : []
          }

          const id: string | undefined = source[`${field.fieldName}___NODE`]
          return id ? context.nodeModel.getNodeById({id}) : null
        },
      }

      return fields
    }, resolvers[objectType.name] || {})
  })

  return resolvers
}
