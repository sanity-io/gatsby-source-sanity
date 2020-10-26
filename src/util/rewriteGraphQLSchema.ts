import {Reporter} from 'gatsby'
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
  DirectiveNode,
  ScalarTypeDefinitionNode,
  specifiedScalarTypes,
} from 'gatsby/graphql'
import {camelCase} from 'lodash'
import {PluginConfig} from '../gatsby-node'
import {RESTRICTED_NODE_FIELDS, getConflictFreeFieldName} from './normalize'

interface AstRewriterContext {
  reporter: Reporter
  config: PluginConfig
}

const builtins = ['ID', 'String', 'Boolean', 'Int', 'Float', 'JSON', 'DateTime', 'Date']
const wantedNodeTypes = ['ObjectTypeDefinition', 'UnionTypeDefinition', 'InterfaceTypeDefinition']

export const rewriteGraphQLSchema = (schemaSdl: string, context: AstRewriterContext): string => {
  const ast = parse(schemaSdl)
  const transformedAst = transformAst(ast, context)
  const transformed = print(transformedAst)
  return transformed
}

function transformAst(ast: DocumentNode, context: AstRewriterContext): ASTNode {
  return {
    ...ast,
    definitions: ast.definitions
      .filter(isWantedAstNode)
      .map((node) => transformDefinitionNode(node, context, ast))
      .concat(getResolveReferencesConfigType()),
  }
}

function isWantedAstNode(astNode: DefinitionNode) {
  const node = astNode as TypeDefinitionNode
  return wantedNodeTypes.includes(node.kind) && node.name.value !== 'RootQuery'
}

function transformDefinitionNode(
  node: DefinitionNode,
  context: AstRewriterContext,
  ast: DocumentNode,
): DefinitionNode {
  switch (node.kind) {
    case 'ObjectTypeDefinition':
      return transformObjectTypeDefinition(node, context, ast)
    case 'UnionTypeDefinition':
      return transformUnionTypeDefinition(node, context)
    case 'InterfaceTypeDefinition':
      return transformInterfaceTypeDefinition(node, context)
    default:
      return node
  }
}

function transformObjectTypeDefinition(
  node: ObjectTypeDefinitionNode,
  context: AstRewriterContext,
  ast: DocumentNode,
): ObjectTypeDefinitionNode {
  const scalars = ast.definitions
    .filter((def): def is ScalarTypeDefinitionNode => def.kind === 'ScalarTypeDefinition')
    .map((scalar) => scalar.name.value)
    .concat(specifiedScalarTypes.map((scalar) => scalar.name))

  const fields = node.fields || []
  const jsonTargets = fields
    .map(getJsonAliasTarget)
    .filter((target): target is string => target !== null)

  const blockFields = jsonTargets.map(makeBlockField)
  const interfaces = (node.interfaces || []).map(maybeRewriteType) as NamedTypeNode[]
  const rawFields = getRawFields(fields, scalars)

  // Implement Gatsby node interface if it is a document
  if (isDocumentType(node)) {
    interfaces.push({kind: 'NamedType', name: {kind: 'Name', value: 'Node'}})
  }

  return {
    ...node,
    name: {...node.name, value: getTypeName(node.name.value)},
    interfaces,
    directives: [{kind: 'Directive', name: {kind: 'Name', value: 'dontInfer'}}],
    fields: [
      ...fields
        .filter((field) => !isJsonAlias(field))
        .map((field) => transformFieldNodeAst(field, node, context)),
      ...blockFields,
      ...rawFields,
    ],
  }
}

function getRawFields(
  fields: readonly FieldDefinitionNode[],
  scalars: string[],
): FieldDefinitionNode[] {
  return fields
    .filter((field) => isJsonAlias(field) || !isScalar(field, scalars))
    .reduce((acc, field) => {
      const jsonAlias = getJsonAliasTarget(field)
      const name = jsonAlias || field.name.value

      acc.push({
        kind: field.kind,
        name: {kind: 'Name', value: '_' + camelCase(`raw ${name}`)},
        type: {kind: 'NamedType', name: {kind: 'Name', value: 'JSON'}},
        arguments: [
          {
            kind: 'InputValueDefinition',
            name: {kind: 'Name', value: 'resolveReferences'},
            type: {
              kind: 'NamedType',
              name: {kind: 'Name', value: 'SanityResolveReferencesConfiguration'},
            },
          },
        ],
      })

      return acc
    }, [] as FieldDefinitionNode[])
}

function isScalar(field: FieldDefinitionNode, scalars: string[]) {
  return scalars.includes(unwrapType(field.type).name.value)
}

function transformUnionTypeDefinition(
  node: UnionTypeDefinitionNode,
  context: AstRewriterContext,
): UnionTypeDefinitionNode {
  return {
    ...node,
    types: (node.types || []).map(maybeRewriteType) as NamedTypeNode[],
    name: {...node.name, value: getTypeName(node.name.value)},
  }
}

function transformInterfaceTypeDefinition(
  node: InterfaceTypeDefinitionNode,
  context: AstRewriterContext,
) {
  const fields = node.fields || []
  return {
    ...node,
    fields: fields.map((field) => transformFieldNodeAst(field, node, context)),
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

function getJsonAliasTarget(field: FieldDefinitionNode): string | null {
  const alias = (field.directives || []).find((dir) => dir.name.value === 'jsonAlias')
  if (!alias) {
    return null
  }

  const forArg = (alias.arguments || []).find((arg) => arg.name.value === 'for')
  if (!forArg) {
    return null
  }

  return valueFromAST(forArg.value, GraphQLString, {})
}

function isJsonAlias(field: FieldDefinitionNode): boolean {
  return getJsonAliasTarget(field) !== null
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

function transformFieldNodeAst(
  node: FieldDefinitionNode,
  parent: ObjectTypeDefinitionNode | InterfaceTypeDefinitionNode,
  context: AstRewriterContext,
) {
  const field = {
    ...node,
    name: maybeRewriteFieldName(node, parent, context),
    type: rewireIdType(makeNullable(node.type)),
    description: undefined,
    directives: [] as DirectiveNode[],
  }

  if (field.type.kind === 'NamedType' && field.type.name.value === 'Date') {
    field.directives.push({kind: 'Directive', name: {kind: 'Name', value: 'dateformat'}})
  }

  return field
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

function maybeRewriteFieldName(
  field: FieldDefinitionNode,
  parent: ObjectTypeDefinitionNode | InterfaceTypeDefinitionNode,
  context: AstRewriterContext,
): NameNode {
  if (!RESTRICTED_NODE_FIELDS.includes(field.name.value)) {
    return field.name
  }

  if (parent.kind === 'ObjectTypeDefinition' && !isDocumentType(parent)) {
    return field.name
  }

  const parentTypeName = parent.name.value
  const newFieldName = getConflictFreeFieldName(field.name.value)

  context.reporter.warn(
    `[sanity] Type \`${parentTypeName}\` has field with name \`${field.name.value}\`, which conflicts with Gatsby's internal properties. Renaming to \`${newFieldName}\``,
  )

  return {
    ...field.name,
    value: newFieldName,
  }
}

function isDocumentType(node: ObjectTypeDefinitionNode): boolean {
  return (node.interfaces || []).some(
    (iface) =>
      iface.kind === 'NamedType' &&
      (iface.name.value === 'SanityDocument' || iface.name.value === 'Document'),
  )
}

function getTypeName(name: string) {
  return name.startsWith('Sanity') ? name : `Sanity${name}`
}

function getResolveReferencesConfigType(): DefinitionNode {
  return {
    kind: 'InputObjectTypeDefinition',
    name: {kind: 'Name', value: 'SanityResolveReferencesConfiguration'},
    fields: [
      {
        kind: 'InputValueDefinition',
        name: {kind: 'Name', value: 'maxDepth'},
        type: {kind: 'NonNullType', type: {kind: 'NamedType', name: {kind: 'Name', value: 'Int'}}},
        description: {kind: 'StringValue', value: 'Max depth to resolve references to'},
      },
    ],
  }
}
