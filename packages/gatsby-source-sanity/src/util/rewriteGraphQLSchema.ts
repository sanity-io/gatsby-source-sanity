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
  Kind,
} from 'gatsby/graphql'
import {camelCase} from 'lodash'
import {RESTRICTED_NODE_FIELDS, getConflictFreeFieldName, getTypeName} from './normalize'
import {PluginConfig} from './validateConfig'
import { typeNameIsReferenceType } from './resolveReferences'

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
      return transformInterfaceTypeDefinition(node, context) as any
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

  const blockFields = jsonTargets.map((target) => makeBlockField(target, context))
  const interfaces = (node.interfaces || []).map((iface) =>
    maybeRewriteType(iface, context),
  ) as NamedTypeNode[]
  const rawFields = getRawFields(fields, scalars)

  // Implement Gatsby node interface if it is a document
  if (isDocumentType(node, context)) {
    interfaces.push({kind: Kind.NAMED_TYPE, name: {kind: Kind.NAME, value: 'Node'}})
  }

  return {
    ...node,
    name: {...node.name, value: getTypeName(node.name.value, context.config.typePrefix)},
    interfaces,
    directives: [{kind: Kind.DIRECTIVE, name: {kind: Kind.NAME, value: 'dontInfer'}}],
    fields: [
      ...fields
        .filter((field) => !isJsonAlias(field))
        .map((field) => transformFieldNodeAst(field, node, context)),
      ...blockFields,
      ...rawFields,
    ] as any,
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
        name: {kind: Kind.NAME, value: '_' + camelCase(`raw ${name}`)},
        type: {kind: Kind.NAMED_TYPE, name: {kind: Kind.NAME, value: 'JSON'}},
        arguments: [
          {
            kind: Kind.INPUT_VALUE_DEFINITION,
            name: {kind: Kind.NAME, value: 'resolveReferences'},
            type: {
              kind: Kind.NAMED_TYPE,
              name: {kind: Kind.NAME, value: 'SanityResolveReferencesConfiguration'},
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
    types: (node.types || []).map((type) => maybeRewriteType(type, context)) as NamedTypeNode[],
    name: {...node.name, value: getTypeName(node.name.value, context.config.typePrefix)},
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
    name: {...node.name, value: getTypeName(node.name.value, context.config.typePrefix)},
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

  return valueFromAST(forArg.value, GraphQLString, {}) as any
}

function isJsonAlias(field: FieldDefinitionNode): boolean {
  return getJsonAliasTarget(field) !== null
}

function makeBlockField(name: string, context: AstRewriterContext): FieldDefinitionNode {
  return {
    kind: Kind.FIELD_DEFINITION,
    name: {
      kind: Kind.NAME,
      value: name,
    },
    arguments: [],
    directives: [],
    type: {
      kind: Kind.LIST_TYPE,
      type: {
        kind: Kind.NAMED_TYPE,
        name: {
          kind: Kind.NAME,
          value: getTypeName('Block', context.config.typePrefix),
        },
      },
    },
  }
}

function makeNullable(nodeType: TypeNode, context: AstRewriterContext): TypeNode {
  if (nodeType.kind === 'NamedType') {
    return maybeRewriteType(nodeType, context)
  }

  if (nodeType.kind === 'ListType') {
    const unwrapped = maybeRewriteType(unwrapType(nodeType), context)
    return {
      kind: Kind.LIST_TYPE,
      type: makeNullable(unwrapped, context),
    }
  }

  return maybeRewriteType(nodeType.type, context) as NamedTypeNode
}

function isReferenceField(field: FieldDefinitionNode): boolean {
  return (field.directives || []).some((dir) => typeNameIsReferenceType(dir.name.value))
}

function transformFieldNodeAst(
  node: FieldDefinitionNode,
  parent: ObjectTypeDefinitionNode | InterfaceTypeDefinitionNode,
  context: AstRewriterContext,
) {
  const field = {
    ...node,
    name: maybeRewriteFieldName(node, parent, context),
    type: rewireIdType(makeNullable(node.type, context)),
    description: undefined,
    directives: [] as DirectiveNode[],
  }

  if (field.type.kind === 'NamedType' && field.type.name.value === 'Date') {
    field.directives.push({
      kind: Kind.DIRECTIVE,
      name: {kind: Kind.NAME, value: 'dateformat'},
    })
  }

  if (isReferenceField(node)) {
    field.directives.push({
      kind: Kind.DIRECTIVE,
      name: {kind: Kind.NAME, value: 'link'},
      arguments: [
        {
          kind: Kind.ARGUMENT,
          name: {kind: Kind.NAME, value: 'from'},
          value: {kind: Kind.STRING, value: `${field.name.value}._ref`},
        },
      ],
    })
  }

  return field
}

function rewireIdType(nodeType: TypeNode): TypeNode {
  if (nodeType.kind === 'NamedType' && nodeType.name.value === 'ID') {
    return {...nodeType, name: {kind: Kind.NAME, value: 'String'}}
  }

  return nodeType
}
function maybeRewriteType(nodeType: TypeNode, context: AstRewriterContext): TypeNode {
  const type = nodeType as NamedTypeNode
  if (typeof type.name === 'undefined') {
    return nodeType
  }

  // Gatsby has a date type, but not a datetime, so rewire it
  if (type.name.value === 'DateTime') {
    return {...type, name: {kind: Kind.NAME, value: 'Date'}}
  }

  if (builtins.includes(type.name.value)) {
    return type
  }

  return {
    ...type,
    name: {kind: Kind.NAME, value: getTypeName(type.name.value, context.config.typePrefix)},
  }
}

function maybeRewriteFieldName(
  field: FieldDefinitionNode,
  parent: ObjectTypeDefinitionNode | InterfaceTypeDefinitionNode,
  context: AstRewriterContext,
): NameNode {
  if (!RESTRICTED_NODE_FIELDS.includes(field.name.value)) {
    return field.name
  }

  if (parent.kind === 'ObjectTypeDefinition' && !isDocumentType(parent, context)) {
    return field.name
  }

  const parentTypeName = parent.name.value
  const newFieldName = getConflictFreeFieldName(field.name.value, context.config.typePrefix)

  context.reporter.warn(
    `[sanity] Type \`${parentTypeName}\` has field with name \`${field.name.value}\`, which conflicts with Gatsby's internal properties. Renaming to \`${newFieldName}\``,
  )

  return {
    ...field.name,
    value: newFieldName,
  }
}

function isDocumentType(node: ObjectTypeDefinitionNode, context: AstRewriterContext): boolean {
  const docTypes = [
    getTypeName('SanityDocument', context.config.typePrefix),
    'SanityDocument',
    'Document',
  ]
  return (node.interfaces || []).some(
    (iface) => iface.kind === 'NamedType' && docTypes.includes(iface.name.value),
  )
}

function getResolveReferencesConfigType(): DefinitionNode {
  return {
    kind: Kind.INPUT_OBJECT_TYPE_DEFINITION,
    name: {kind: Kind.NAME, value: 'SanityResolveReferencesConfiguration'},
    fields: [
      {
        kind: Kind.INPUT_VALUE_DEFINITION,
        name: {kind: Kind.NAME, value: 'maxDepth'},
        type: {
          kind: Kind.NON_NULL_TYPE,
          type: {kind: Kind.NAMED_TYPE, name: {kind: Kind.NAME, value: 'Int'}},
        },
        description: {kind: Kind.STRING, value: 'Max depth to resolve references to'},
      },
    ],
  }
}
