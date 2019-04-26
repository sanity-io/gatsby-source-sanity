import {get, groupBy} from 'lodash'
import {
  parse,
  FieldDefinitionNode,
  GraphQLString,
  ListTypeNode,
  NamedTypeNode,
  NonNullTypeNode,
  ObjectTypeDefinitionNode,
  valueFromAST,
  TypeNode,
  ScalarTypeDefinitionNode,
  specifiedScalarTypes,
  UnionTypeDefinitionNode,
} from 'gatsby/graphql'
import SanityClient = require('@sanity/client')
import {getTypeName} from './normalize'
import {PluginConfig} from '../gatsby-node'

export type FieldDef = {
  type: NamedTypeNode | ListTypeNode | NonNullTypeNode
  namedType: NamedTypeNode
  isList: boolean
  aliasFor: string | null
  isReference: boolean
}

export type ObjectTypeDef = {
  name: string
  kind: 'Object'
  isDocument: boolean
  fields: {[key: string]: FieldDef}
}

export type UnionTypeDef = {
  name: string
  types: string[]
}

export type TypeMap = {
  scalars: string[]
  objects: {[key: string]: ObjectTypeDef}
  unions: {[key: string]: UnionTypeDef}
}

export const defaultTypeMap: TypeMap = {
  scalars: [],
  objects: {},
  unions: {},
}

export async function getRemoteGraphQLSchema(client: SanityClient, config: PluginConfig) {
  const {graphqlApi} = config
  const {dataset} = client.config()
  try {
    const api = await client.request({
      url: `/apis/graphql/${dataset}/${graphqlApi}`,
      headers: {Accept: 'application/graphql'},
    })

    return api
  } catch (err) {
    const code = get(err, 'response.statusCode')
    const message = get(
      err,
      'response.body.message',
      get(err, 'response.statusMessage') || err.message,
    )

    const is404 = code === 404 || /schema not found/i.test(message)
    throw new Error(
      is404
        ? `GraphQL API not deployed - see https://github.com/sanity-io/gatsby-source-sanity#graphql-api for more info\n\n`
        : `${message}`,
    )
  }
}

export function getTypeMapFromGraphQLSchema(sdl: string, config: PluginConfig): TypeMap {
  const typeMap: TypeMap = {objects: {}, scalars: [], unions: {}}
  const remoteSchema = parse(sdl)
  const groups = {
    ObjectTypeDefinition: [],
    ScalarTypeDefinition: [],
    UnionTypeDefinition: [],
    ...groupBy(remoteSchema.definitions, 'kind'),
  }

  const objects: {[key: string]: ObjectTypeDef} = {}
  typeMap.objects = groups.ObjectTypeDefinition.reduce((acc, typeDef: ObjectTypeDefinitionNode) => {
    const name = getTypeName(typeDef.name.value)
    acc[name] = {
      name,
      kind: 'Object',
      isDocument: Boolean(
        (typeDef.interfaces || []).find(iface => iface.name.value === 'Document'),
      ),
      fields: (typeDef.fields || []).reduce(
        (fields, fieldDef) => ({
          ...fields,
          [fieldDef.name.value]: {
            type: fieldDef.type,
            isList: isListType(fieldDef.type),
            namedType: unwrapType(fieldDef.type),
            aliasFor: getAliasDirective(fieldDef),
            isReference: Boolean(getReferenceDirective(fieldDef)),
          },
        }),
        {},
      ),
    }
    return acc
  }, objects)

  const unions: {[key: string]: UnionTypeDef} = {}
  typeMap.unions = groups.UnionTypeDefinition.reduce((acc, typeDef: UnionTypeDefinitionNode) => {
    const name = getTypeName(typeDef.name.value)
    acc[name] = {
      name,
      types: (typeDef.types || []).map(type => getTypeName(type.name.value)),
    }
    return acc
  }, unions)

  typeMap.scalars = specifiedScalarTypes
    .map(scalar => scalar.name)
    .concat(
      groups.ScalarTypeDefinition.map((typeDef: ScalarTypeDefinitionNode) => typeDef.name.value),
    )

  return typeMap
}

function unwrapType(typeNode: TypeNode): NamedTypeNode {
  if (['NonNullType', 'ListType'].includes(typeNode.kind)) {
    const wrappedType = typeNode as NonNullTypeNode
    return unwrapType(wrappedType.type)
  }

  return typeNode as NamedTypeNode
}

function isListType(typeNode: TypeNode): boolean {
  if (typeNode.kind === 'ListType') {
    return true
  }

  if (typeNode.kind === 'NonNullType') {
    const node = typeNode as NonNullTypeNode
    return isListType(node.type)
  }

  return false
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

function getReferenceDirective(field: FieldDefinitionNode) {
  return (field.directives || []).find(dir => dir.name.value === 'reference')
}
