import {get, groupBy} from 'lodash'
import {
  parse,
  FieldDefinitionNode,
  GraphQLString,
  ListTypeNode,
  NamedTypeNode,
  NonNullTypeNode,
  ObjectTypeDefinitionNode,
  UnionTypeDefinitionNode,
  valueFromAST
} from 'gatsby/graphql'
import SanityClient = require('@sanity/client')
import {getTypeName} from './normalize'
import {ExampleValues, getExampleValues} from './getExampleValues'
import {PluginConfig} from '../gatsby-node'

class RequestError extends Error {
  public isWarning: boolean

  constructor(message: string, isWarning: boolean) {
    super(message)
    this.isWarning = isWarning
  }
}

export type FieldDef = {
  type: NamedTypeNode | ListTypeNode | NonNullTypeNode
  aliasFor: string | null
}

export type ObjectTypeDef = {
  name: string
  kind: 'Object'
  isDocument: boolean
  fields: {[key: string]: FieldDef}
}

export type UnionTypeDef = {
  name: string
  kind: 'Union'
  types: string[]
}

export type TypeMap = {
  unions: {[key: string]: UnionTypeDef}
  objects: {[key: string]: ObjectTypeDef}
  exampleValues: ExampleValues
}

export async function getRemoteGraphQLSchema(client: SanityClient, config: PluginConfig) {
  const {graphqlApi} = config
  const {dataset} = client.config()
  try {
    const api = await client.request({
      url: `/apis/graphql/${dataset}/${graphqlApi}`,
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

    const gqlBenefits = [
      'Schemas will be much cleaner, and you will have less problems with missing fields',
      'See https://github.com/sanity-io/gatsby-source-sanity#missing-fields for more info'
    ].join('\n')

    const is404 = code === 404 || /schema not found/i.test(message)
    const hint = is404 ? ' - have you run `sanity graphql deploy` yet?\n' + gqlBenefits : ''

    throw new RequestError(`${message}${hint}`, is404)
  }
}

export function analyzeGraphQLSchema(sdl: string, config: PluginConfig): TypeMap {
  const remoteSchema = parse(sdl)
  const groups = {
    ObjectTypeDefinition: [],
    UnionTypeDefinition: [],
    ...groupBy(remoteSchema.definitions, 'kind')
  }

  let objects: {[key: string]: ObjectTypeDef} = {}
  objects = groups.ObjectTypeDefinition.reduce((acc, typeDef: ObjectTypeDefinitionNode) => {
    const name = getTypeName(typeDef.name.value)
    acc[name] = {
      name,
      kind: 'Object',
      isDocument: Boolean(
        (typeDef.interfaces || []).find(iface => iface.name.value === 'Document')
      ),
      fields: (typeDef.fields || []).reduce(
        (fields, fieldDef) => ({
          ...fields,
          [fieldDef.name.value]: {
            type: fieldDef.type,
            aliasFor: getAliasDirective(fieldDef)
          }
        }),
        {}
      )
    }
    return acc
  }, objects)

  let unions: {[key: string]: UnionTypeDef} = {}
  unions = groups.UnionTypeDefinition.reduce((acc, typeDef: UnionTypeDefinitionNode) => {
    const name = getTypeName(typeDef.name.value)
    acc[name] = {
      name,
      kind: 'Union',
      types: (typeDef.types || []).map(type => type.name.value)
    }
    return acc
  }, unions)

  const exampleValues = getExampleValues(remoteSchema, config)

  return {unions, objects, exampleValues}
}

function getAliasDirective(field: FieldDefinitionNode) {
  const alias = (field.directives || []).find(dir => dir.name.value === 'jsonAlias')
  if (!alias) {
    return null
  }

  const forArg = (alias.arguments || []).find(arg => arg.name.value === 'for')
  if (!forArg) {
    return null
  }

  return valueFromAST(forArg.value, GraphQLString, {})
}
