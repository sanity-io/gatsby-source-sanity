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
  UnionTypeDefinitionNode,
  ScalarTypeDefinitionNode,
  NameNode,
} from 'gatsby/graphql'
import crypto = require('crypto')
import mockSchemaValues = require('easygraphql-mock')
import {stringify} from 'flatted'
import debug from '../debug'
import {deepCopy} from './deepCopy'
import {PluginConfig} from '../gatsby-node'
import {GatsbyNode} from '../types/gatsby'
import {RESTRICTED_NODE_FIELDS} from './normalize'
import {TypeMap} from './remoteGraphQLSchema'

const conflictPrefix = 'sanity'
const builtins = ['ID', 'String', 'Boolean', 'Int', 'Float', 'JSON', 'DateTime', 'Date']
const wantedNodeTypes = ['ObjectTypeDefinition', 'UnionTypeDefinition', 'InterfaceTypeDefinition']
const wantedScalarTypes = ['Date', 'JSON']
const blockExample = [
  {
    _key: 'abc123',
    _type: 'block',
    style: 'normal',
    list: 'bullet',
    markDefs: [{_key: 'abc', _type: 'link', href: 'https://www.sanity.io/'}],
    children: [{_key: 'bcd', _type: 'span', text: 'Sanity', marks: ['em', 'abc']}],
  },
]

export type ExampleValues = {[key: string]: GatsbyNode}

export const getExampleValues = (
  ast: DocumentNode,
  config: PluginConfig,
  typeMap: TypeMap,
): ExampleValues => {
  const transformedAst = transformAst(ast)
  const transformed = print(transformedAst)

  const objectTypes = (transformedAst.definitions || [])
    .filter(def => def.kind === 'ObjectTypeDefinition')
    .map(def => (def as ObjectTypeDefinitionNode).name.value)

  debug('Schema used for mocking values:\n\n%s', transformed)

  let mockedValues: {[key: string]: any} = {}
  try {
    const mocked = mockSchemaValues(transformed, {
      Date: '2018-01-01',
      JSON: blockExample,
    })

    // Delete mocked values for non-object types
    Object.keys(mocked).forEach(typeName => {
      if (!objectTypes.includes(typeName)) {
        delete mocked[typeName]
      }
    })

    mockedValues = mocked
  } catch (err) {
    debug('Failed to mock values from transformed schema: %s', err.stack)
  }
  const copiedValues = deepCopy(mockedValues, 20)
  return addGatsbyNodeValues(copiedValues, config, typeMap)
}

function transformAst(ast: DocumentNode) {
  const root = {
    ...ast,
    definitions: ast.definitions
      .filter(isWantedAstNode)
      .map(transformDefinitionNode)
      .concat(getScalarTypeDefs()),
  }
  return root
}

function isWantedAstNode(astNode: DefinitionNode) {
  const node = astNode as TypeDefinitionNode
  if (wantedNodeTypes.includes(node.kind) && node.name.value !== 'RootQuery') {
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
  const jsonTargets = fields.map(getJsonAliasTargets).filter(Boolean)
  const blockFields = jsonTargets.map(makeBlockField)

  return {
    ...node,
    name: {...node.name, value: getTypeName(node.name.value)},
    fields: [
      ...fields.filter(field => !getJsonAliasTargets(field)).map(transformFieldNodeAst),
      ...blockFields,
    ],
  }
}

function transformUnionTypeDefinition(node: UnionTypeDefinitionNode) {
  return {
    ...node,
    types: (node.types || []).map(maybeRewriteType),
    name: {...node.name, value: getTypeName(node.name.value)},
  }
}

function transformInterfaceTypeDefinition(node: InterfaceTypeDefinitionNode) {
  const fields = node.fields || []
  return {
    ...node,
    fields: fields.map(transformFieldNodeAst),
    name: {...node.name, value: getTypeName(node.name.value)},
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
      value: name,
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
              value: 'SanityBlock',
            },
          },
        },
      },
    },
  }
}

function makeNonNullable(nodeType: TypeNode): NonNullTypeNode {
  if (nodeType.kind === 'ListType') {
    const unwrapped = maybeRewriteType(unwrapType(nodeType))
    return {
      kind: 'NonNullType',
      type: {
        kind: 'ListType',
        type: makeNonNullable(unwrapped),
      },
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
    name: maybeRewriteFieldName(node),
    type: makeNonNullable(node.type),
    description: undefined,
    directives: [],
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

function maybeRewriteFieldName(field: FieldDefinitionNode): NameNode {
  if (!RESTRICTED_NODE_FIELDS.includes(field.name.value)) {
    return field.name
  }

  return {
    ...field.name,
    value: `${conflictPrefix}${upperFirst(field.name.value)}`,
  }
}

function getTypeName(name: string) {
  return name.startsWith('Sanity') ? name : `Sanity${name}`
}

function hash(content: any) {
  return crypto
    .createHash('md5')
    .update(stringify(content))
    .digest('hex')
}

function addGatsbyNodeValues(
  map: {[key: string]: any},
  config: PluginConfig,
  typeMap: TypeMap,
): ExampleValues {
  const idPrefix = `mock--${config.projectId}-${config.dataset}`
  const initial: ExampleValues = {}
  return Object.keys(map).reduce((acc, typeName: string) => {
    if (!isPlainObject(map[typeName])) {
      return acc
    }

    const existingValue = map[typeName]
    const newValue = rewriteReferences(existingValue, {exampleValueMap: map, typeMap, idPrefix})

    const node = {
      id: `${idPrefix}-${typeName}`,
      parent: null,
      children: [],
      ...newValue,
      internal: {
        type: typeName,
        contentDigest: hash(newValue),
      },
    }

    return {...acc, [typeName]: removeTypeName(node)}
  }, initial)
}

type ReferenceRewriterOptions = {
  exampleValueMap: {[key: string]: any}
  typeMap: TypeMap
  idPrefix: string
}

function rewriteReferences(existingValue: {[key: string]: any}, options: ReferenceRewriterOptions) {
  const {exampleValueMap: map, idPrefix, typeMap} = options
  const typeName = getValueType(existingValue, map)
  const type = typeName && typeMap.objects[typeName]
  const initial: {[key: string]: any} = {}
  return Object.keys(existingValue).reduce((acc, key) => {
    const field = type && type.fields[key]
    const isExplicitRef = field && field.isReference
    const isImplicitRef = !isExplicitRef && isImplicitReference(existingValue[key], map)

    if (isExplicitRef) {
      for (let typeName in map) {
        if (map[typeName].__typename === existingValue[key].__typename && existingValue[key]._id) {
          acc[`${key}___NODE`] = `${idPrefix}-${typeName}`
          return acc
        }
      }
    } else if (isImplicitRef && Array.isArray(existingValue[key])) {
      acc[`${key}___NODE`] = existingValue[key]
        .map((item: any) => {
          const memberType = getValueType(item, map)
          return memberType ? `${idPrefix}-${memberType}` : false
        })
        .filter(Boolean)
      return acc
    } else if (isImplicitRef) {
      const memberType = getValueType(existingValue[key], map)
      acc[`${key}___NODE`] = `${idPrefix}-${memberType}`
      return acc
    } else if (isPlainObject(existingValue[key])) {
      acc[key] = rewriteReferences(existingValue[key], options)
      return acc
    } else if (Array.isArray(existingValue[key])) {
      acc[key] = existingValue[key].map((item: {}) =>
        isPlainObject(item) ? rewriteReferences(item, options) : item,
      )
      return acc
    }

    acc[key] = existingValue[key]
    return acc
  }, initial)
}

function removeTypeName(obj: any, seen = new Set()): any {
  if (seen.has(obj)) {
    return obj
  }

  seen.add(obj)

  if (Array.isArray(obj)) {
    return obj.map(item => removeTypeName(item, seen))
  }

  if (obj === null || typeof obj !== 'object') {
    return obj
  }

  for (const prop in obj) {
    if (prop === '__typename') {
      delete obj[prop]
    } else {
      removeTypeName(obj[prop], seen)
    }
  }

  return obj
}

function getScalarTypeDefs(): ScalarTypeDefinitionNode[] {
  return wantedScalarTypes.map((name: string) => {
    const scalar: ScalarTypeDefinitionNode = {
      kind: 'ScalarTypeDefinition',
      name: {kind: 'Name', value: name},
    }

    return scalar
  })
}

function isImplicitReference(fieldValue: any, exampleValueMap: {[key: string]: any}): boolean {
  if (Array.isArray(fieldValue)) {
    const first = fieldValue[0]
    return isImplicitReference(first, exampleValueMap)
  }

  if (fieldValue && fieldValue._id) {
    return Boolean(getValueType(fieldValue, exampleValueMap))
  }

  return false
}

function getValueType(value: any, exampleValueMap: {[key: string]: any}): string | false {
  for (let typeName in exampleValueMap) {
    if (exampleValueMap[typeName].__typename === value.__typename) {
      return typeName
    }
  }

  return false
}
