import {upperFirst} from 'lodash'
import {
  ASTNode,
  DefinitionNode,
  DocumentNode,
  FieldDefinitionNode,
  GraphQLString,
  InterfaceTypeDefinitionNode,
  NamedTypeNode,
  NameNode,
  NonNullTypeNode,
  ObjectTypeDefinitionNode,
  parse,
  print,
  TypeDefinitionNode,
  TypeNode,
  UnionTypeDefinitionNode,
  valueFromAST,
} from 'gatsby/graphql'
import {PluginConfig} from '../gatsby-node'
import {RESTRICTED_NODE_FIELDS} from './normalize'

const conflictPrefix = 'sanity'
const builtins = ['ID', 'String', 'Boolean', 'Int', 'Float', 'JSON', 'DateTime', 'Date']
const wantedNodeTypes = ['ObjectTypeDefinition', 'UnionTypeDefinition', 'InterfaceTypeDefinition']

export const rewriteGraphQLSchema = (schemaSdl: string, config: PluginConfig): string => {
  const ast = parse(schemaSdl)
  const transformedAst = transformAst(ast, config)
  const transformed = print(transformedAst)
  return transformed
}

function transformAst(ast: DocumentNode, config: PluginConfig): ASTNode {
  return {
    ...ast,
    definitions: ast.definitions.filter(isWantedAstNode).map(transformDefinitionNode),
  }
}

function isWantedAstNode(astNode: DefinitionNode) {
  const node = astNode as TypeDefinitionNode
  return wantedNodeTypes.includes(node.kind) && node.name.value !== 'RootQuery'
}

function transformDefinitionNode(node: DefinitionNode): DefinitionNode {
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

function transformObjectTypeDefinition(node: ObjectTypeDefinitionNode): ObjectTypeDefinitionNode {
  const fields = node.fields || []
  const jsonTargets = fields.map(getJsonAliasTargets).filter(Boolean)
  const blockFields = jsonTargets.map(makeBlockField)
  const interfaces = (node.interfaces || []).map(maybeRewriteType) as NamedTypeNode[]
  const isDocumentType = interfaces.some(
    item => item.kind === 'NamedType' && item.name.value === 'SanityDocument',
  )

  // Implement Gatsby node interface if it is a document
  if (isDocumentType) {
    interfaces.push({kind: 'NamedType', name: {kind: 'Name', value: 'Node'}})
  }

  return {
    ...node,
    name: {...node.name, value: getTypeName(node.name.value)},
    interfaces,
    directives: [{kind: 'Directive', name: {kind: 'Name', value: 'dontInfer'}}],
    fields: [
      ...fields.filter(field => !getJsonAliasTargets(field)).map(transformFieldNodeAst),
      ...blockFields,
    ],
  }
}

function transformUnionTypeDefinition(node: UnionTypeDefinitionNode): UnionTypeDefinitionNode {
  return {
    ...node,
    types: (node.types || []).map(maybeRewriteType) as NamedTypeNode[],
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
      kind: 'ListType',
      type: {
        kind: 'NamedType',
        name: {
          kind: 'Name',
          value: 'SanityBlock',
        },
      },
    },
  }
}

function makeNullable(nodeType: TypeNode): TypeNode {
  if (nodeType.kind === 'NamedType') {
    return maybeRewriteType(nodeType)
  }

  if (nodeType.kind === 'ListType') {
    const unwrapped = maybeRewriteType(unwrapType(nodeType))
    return {
      kind: 'ListType',
      type: makeNullable(unwrapped),
    }
  }

  return maybeRewriteType(nodeType.type) as NamedTypeNode
}

function transformFieldNodeAst(node: FieldDefinitionNode) {
  return {
    ...node,
    name: maybeRewriteFieldName(node),
    type: rewireIdType(makeNullable(node.type)),
    description: undefined,
    directives: [],
  }
}

function rewireIdType(nodeType: TypeNode): TypeNode {
  if (nodeType.kind === 'NamedType' && nodeType.name.value === 'ID') {
    return {...nodeType, name: {kind: 'Name', value: 'String'}}
  }

  return nodeType
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
