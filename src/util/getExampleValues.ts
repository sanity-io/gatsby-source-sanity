import {upperFirst, isPlainObject} from 'lodash'
import {
  print,
  DocumentNode,
  DefinitionNode,
  TypeDefinitionNode,
  ObjectTypeDefinitionNode,
  InterfaceTypeDefinitionNode,
  FieldDefinitionNode,
  TypeNode,
  NonNullTypeNode,
  NamedTypeNode,
  valueFromAST,
  GraphQLString,
  NameNode,
  UnionTypeDefinitionNode
} from 'gatsby/graphql'
import crypto = require('crypto')
import mockSchemaValues = require('easygraphql-mock')
import debug from '../debug'
import {PluginConfig} from '../gatsby-node'
import {GatsbyNode} from '../types/gatsby'
import {RESTRICTED_NODE_FIELDS} from './normalize'

const conflictPrefix = 'sanity'
const builtins = ['ID', 'String', 'Boolean', 'Int', 'Float', 'JSON', 'DateTime', 'Date']
const wantedNodeTypes = ['ObjectTypeDefinition', 'UnionTypeDefinition', 'InterfaceTypeDefinition']
const wantedScalarTypes = ['Date', 'JSON']

export type ExampleValues = {[key: string]: GatsbyNode}

export const getExampleValues = (ast: DocumentNode, config: PluginConfig): ExampleValues => {
  const transformed = print(transformAst(ast))

  let mockedValues: {[key: string]: any} = {}
  try {
    const mocked = mockSchemaValues(transformed, {
      Date: '2018-01-01'
    })

    // Delete mocked values for scalars
    delete mocked.Date
    delete mocked.JSON

    mockedValues = mocked
  } catch (err) {
    debug('Failed to mock values from transformed schema: %s', err.stack)
    debug('Input schema:\n\n%s', transformed)
  }

  return addGatsbyNodeValues(mockedValues, config)
}

function transformAst(ast: DocumentNode) {
  const root = {
    ...ast,
    definitions: ast.definitions.filter(isWantedAstNode).map(transformDefinitionNode)
  }
  return root
}

function isWantedAstNode(astNode: DefinitionNode) {
  const node = astNode as TypeDefinitionNode
  if (wantedNodeTypes.includes(node.kind) && node.name.value !== 'RootQuery') {
    return true
  }

  if (node.kind === 'ScalarTypeDefinition' && wantedScalarTypes.includes(node.name.value)) {
    return true
  }

  return false
}

function transformDefinitionNode(node: DefinitionNode) {
  switch (node.kind) {
    case 'ObjectTypeDefinition':
      return transformObjectTypeDefinition(node)
    case 'UnionTypeDefinition':
      return transformUnionTypeDefinition(node)
    case 'InterfaceTypeDefinition':
      return transformInterfaceTypeDefinition(node)
    default:
      return node
  }
}

function transformObjectTypeDefinition(astNode: DefinitionNode) {
  const node = astNode as ObjectTypeDefinitionNode

  const fields = node.fields || []
  const jsonAliases = fields
    .map(getJsonAliasTargets)
    .filter(Boolean)
    .map(makeBlockField)

  return {
    ...node,
    fields: [...fields.map(transformFieldNodeAst), ...jsonAliases],
    name: {...node.name, value: getTypeName(node.name.value)}
  }
}

function transformUnionTypeDefinition(node: UnionTypeDefinitionNode) {
  return {
    ...node,
    types: (node.types || []).map(maybeRewriteType),
    name: {...node.name, value: getTypeName(node.name.value)}
  }
}

function transformInterfaceTypeDefinition(node: InterfaceTypeDefinitionNode) {
  const fields = node.fields || []
  return {
    ...node,
    fields: fields.map(transformFieldNodeAst),
    name: {...node.name, value: getTypeName(node.name.value)}
  }
}

function unwrapType(typeNode: TypeNode): NamedTypeNode {
  if (['NonNullType', 'ListType'].includes(typeNode.kind)) {
    const wrappedType = typeNode as NonNullTypeNode
    return unwrapType(wrappedType.type)
  }

  return typeNode as NamedTypeNode
}

function getJsonAliasTargets(field: FieldDefinitionNode) {
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

function makeBlockField(name: string): FieldDefinitionNode {
  return {
    kind: 'FieldDefinition',
    name: {
      kind: 'Name',
      value: name
    },
    arguments: [],
    directives: [],
    type: {
      kind: 'NonNullType',
      type: {
        kind: 'ListType',
        type: {
          kind: 'NonNullType',
          type: {
            kind: 'NamedType',
            name: {
              kind: 'Name',
              value: 'SanityBlock'
            }
          }
        }
      }
    }
  }
}

function makeNonNullable(nodeType: TypeNode): NonNullTypeNode {
  if (nodeType.kind === 'ListType') {
    const unwrapped = maybeRewriteType(unwrapType(nodeType))
    return {
      kind: 'NonNullType',
      type: {
        kind: 'ListType',
        type: makeNonNullable(unwrapped)
      }
    }
  }

  if (nodeType.kind === 'NamedType') {
    return {kind: 'NonNullType', type: maybeRewriteType(nodeType) as NamedTypeNode}
  }

  const targetType = maybeRewriteType(nodeType.type) as NamedTypeNode
  return {kind: 'NonNullType', type: targetType}
}

function transformFieldNodeAst(node: FieldDefinitionNode) {
  return {
    ...node,
    name: maybeRewriteFieldName(node.name),
    type: makeNonNullable(node.type),
    description: undefined,
    directives: []
  }
}

function maybeRewriteType(nodeType: TypeNode): TypeNode {
  const type = nodeType as NamedTypeNode
  if (typeof type.name === 'undefined') {
    return nodeType
  }

  // Gatsby has a date type, but not a datetime, so rewire it
  if (type.name.value === 'DateTime') {
    return {...type, name: {kind: 'Name', value: 'Date'}}
  }

  if (builtins.includes(type.name.value)) {
    return type
  }

  return {...type, name: {kind: 'Name', value: getTypeName(type.name.value)}}
}

function maybeRewriteFieldName(name: NameNode) {
  if (!RESTRICTED_NODE_FIELDS.includes(name.value)) {
    return name
  }

  return {
    ...name,
    value: `${conflictPrefix}${upperFirst(name.value)}`
  }
}

function getTypeName(name: string) {
  return name.startsWith('Sanity') ? name : `Sanity${name}`
}

function hash(content: any) {
  return crypto
    .createHash('md5')
    .update(JSON.stringify(content))
    .digest('hex')
}

function addGatsbyNodeValues(map: {[key: string]: any}, config: PluginConfig): ExampleValues {
  const idPrefix = `mock--${config.projectId}-${config.dataset}`
  const initial: ExampleValues = {}
  return Object.keys(map).reduce((acc, typeName: string) => {
    if (!isPlainObject(map[typeName])) {
      return acc
    }

    const existingValue = map[typeName]
    const newValue = {
      id: `${idPrefix}-${typeName}`,
      parent: null,
      children: [],
      ...existingValue,
      internal: {
        type: typeName,
        contentDigest: hash(existingValue)
      }
    }

    return {...acc, [typeName]: removeTypeName(newValue)}
  }, initial)
}

function removeTypeName(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(removeTypeName)
  }

  if (obj === null || typeof obj !== 'object') {
    return obj
  }

  for (const prop in obj) {
    if (prop === '__typename') {
      delete obj[prop]
    } else {
      removeTypeName(obj[prop])
    }
  }

  return obj
}
