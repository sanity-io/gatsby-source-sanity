import {get} from 'lodash'
import {
  buildSchema,
  GraphQLSchema,
  GraphQLObjectTypeConfig,
  GraphQLObjectType,
  GraphQLFieldConfig,
  GraphQLUnionTypeConfig,
  GraphQLUnionType
} from 'gatsby/graphql'
import SanityClient = require('@sanity/client')
import {visitSchema, VisitSchemaKind} from 'graphql-tools/dist/transforms/visitSchema'
import {transformSchema, RenameTypes} from 'graphql-tools'
import {getTypeName} from './normalize'

interface UnionTypeList {
  typeNames: string[]
}

class RequestError extends Error {
  public isWarning: boolean

  constructor(message: string, isWarning: boolean) {
    super(message)
    this.isWarning = isWarning
  }
}

export async function getRemoteGraphQLSchema(client: SanityClient) {
  const {dataset} = client.config()
  try {
    const api = await client.request({
      url: `/apis/graphql/${dataset}/default`,
      headers: {Accept: 'application/graphql'}
    })

    return api
  } catch (err) {
    const code = get(err, 'response.statusCode')
    const message = get(
      err,
      'response.body.message',
      get(err, 'response.statusMessage') || err.message
    )

    const is404 = code === 404 || /schema not found/i.test(message)
    const hint = is404
      ? ' - have you run `sanity graphql deploy` yet?\nSchemas will be much cleaner when using proper '
      : ''

    throw new RequestError(`${message}${hint}`, is404)
  }
}

export async function transformRemoteGraphQLSchema(sdl: string) {
  const remoteSchema = buildSchema(sdl)

  return transformSchema(remoteSchema, [
    new StripNonTypeTransform(),
    new RenameTypes(remapTypeName)
  ])
}

export function buildObjectTypeMap(schema: GraphQLSchema) {
  const map = schema.getTypeMap()
  const typeMap: {[key: string]: GraphQLObjectTypeConfig<any, any>} = {}
  return Object.keys(map).reduce((acc, typeName) => {
    const original = map[typeName] as GraphQLObjectType
    if (typeof original.getFields !== 'function' || typeof original.getInterfaces !== 'function') {
      return acc
    }

    const fields = original.getFields()
    const fieldMap: {[key: string]: GraphQLFieldConfig<any, any>} = {}

    acc[typeName] = {
      name: original.name,
      description: original.description,
      interfaces: original.getInterfaces(),
      isTypeOf: original.isTypeOf,
      fields: Object.keys(fields).reduce((fieldList, fieldName) => {
        const originalField = fields[fieldName]
        fieldList[fieldName] = {
          description: originalField.description,
          resolve: originalField.resolve,
          type: originalField.type
        }
        return fieldList
      }, fieldMap)
    }
    return acc
  }, typeMap)
}

export function buildUnionTypeMap(schema: GraphQLSchema) {
  const map = schema.getTypeMap()
  const typeMap: {[key: string]: GraphQLUnionTypeConfig<any, any> & UnionTypeList} = {}
  return Object.keys(map).reduce((acc, typeName) => {
    const original = map[typeName] as GraphQLUnionType
    if (typeof original.getTypes !== 'function') {
      return acc
    }

    const types = original.getTypes()
    const typeNames = types.map(type => type.name)

    acc[typeName] = {
      name: original.name,
      description: original.description,
      types: original.getTypes,
      resolveType: original.resolveType,
      typeNames
    }
    return acc
  }, typeMap)
}

function remapTypeName(typeName: string): string {
  switch (typeName) {
    // Gatsby provides a date scalar - we don't need/want our own
    case 'Date':
    case 'DateTime':
      return 'Date'
    // Gatsby provides a JSON scalar, we don't want `SanityJSON`
    case 'JSON':
      return 'JSON'
    // For other types, prefix and pascalcase the type name:
    // BlogPost => SanityBlogPost
    default:
      return getTypeName(typeName)
  }
}

class StripNonTypeTransform {
  transformSchema(schema: GraphQLSchema) {
    return visitSchema(schema, {
      // @ts-ignore
      [VisitSchemaKind.INPUT_OBJECT_TYPE]() {
        return null
      },
      // @ts-ignore
      [VisitSchemaKind.MUTATION]() {
        return null
      },
      // @ts-ignore
      [VisitSchemaKind.SUBSCRIPTION]() {
        return null
      },
      // @ts-ignore
      [VisitSchemaKind.ROOT_OBJECT]() {
        return null
      }
    })
  }
}
