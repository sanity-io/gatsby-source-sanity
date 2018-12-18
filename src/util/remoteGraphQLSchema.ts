import {get} from 'lodash'
import {buildSchema, GraphQLSchema, printSchema} from 'gatsby/graphql'
import SanityClient = require('@sanity/client')
import {visitSchema, VisitSchemaKind} from 'graphql-tools/dist/transforms/visitSchema'
import {transformSchema, RenameTypes} from 'graphql-tools'
import {getTypeName} from './normalize'

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

  const schema = transformSchema(remoteSchema, [
    new StripNonTypeTransform(),
    new RenameTypes(getTypeName),
    new RenameTypes(type => (type === 'SanityDateTime' ? 'Date' : type))
  ])

  const transformed = printSchema(schema)
  return buildSchema(transformed)
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
