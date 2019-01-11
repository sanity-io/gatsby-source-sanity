import {
  parse,
  UnionTypeDefinitionNode,
  NamedTypeNode,
  InterfaceTypeDefinitionNode,
  ObjectTypeDefinitionNode,
  FieldDefinitionNode,
  TypeNode,
  InputValueDefinitionNode,
  GraphQLInputType,
  isNonNullType,
  getNullableType,
  isListType,
  GraphQLScalarType,
  GraphQLNullableType,
  print,
  valueFromAST,
  GraphQLString
} from 'gatsby/graphql'
import {upperFirst} from 'lodash'
import {getTypeName, RESTRICTED_NODE_FIELDS} from './normalize'
import {DateTypeDef} from 'gatsby/dist/schema/types/type-date'

const conflictPrefix = 'sanity'
const dateType = tryGetDateType()
const keepNodes = [
  'ObjectTypeDefinition',
  'DirectiveDefinition',
  'InterfaceTypeDefinition',
  'UnionTypeDefinition'
]

export const makeGatsbySchema = (original: string) => {
  const originalDef = parse(original)
  const defs = originalDef.definitions || []

  const newDefinitions = defs
    .filter(def => keepNodes.includes(def.kind))
    .map(def => {
      switch (def.kind) {
        case 'ObjectTypeDefinition':
          return processObjectTypeDef(def)
        case 'InterfaceTypeDefinition':
          return processInterfaceTypeDef(def)
        case 'UnionTypeDefinition':
          return processUnionTypeDef(def)
        default:
          return def
      }
    })

  const newSchema = print({
    ...originalDef,
    definitions: newDefinitions
  })

  return newSchema
}

function processObjectTypeDef(def: ObjectTypeDefinitionNode): ObjectTypeDefinitionNode {
  const isDocument = hasDocumentInterface(def)
  const ifaces = (def.interfaces || []).map(processNamedTypeDef)
  const fields = (def.fields || [])
    .map(field => processFieldNode(field, isDocument))
    .concat(getAliasFields(def))
  return {
    ...def,
    name: {kind: 'Name', value: getTypeName(def.name.value)},
    fields: isDocument ? getGatsbyNodeFields().concat(fields) : fields,
    interfaces: isDocument
      ? ifaces.concat([{kind: 'NamedType', name: {kind: 'Name', value: 'Node'}}])
      : ifaces
  }
}

function processFieldNode(def: FieldDefinitionNode, parentIsNode: boolean): FieldDefinitionNode {
  const namedType = getNamedType(def.type)
  const targetTypeName = namedType.name.value
  const aliasFor = getAliasDirective(def)

  let args
  let actualTargetType = getTypeName(targetTypeName)

  // Dates have arguments normally applied in the infering step.
  // We need to manually expose these since we're taking control of the schema
  if (['Date', 'Datetime', 'DateTime'].includes(targetTypeName)) {
    actualTargetType = 'Date'
    args = dateType ? getDateArguments() : args
  }

  const isList = isListTypeDef(def.type)
  const named: NamedTypeNode = {
    kind: 'NamedType',
    name: {
      kind: 'Name',
      value: actualTargetType
    }
  }

  let description = def.description
  if (!description && aliasFor) {
    description = {kind: 'StringValue', value: `JSON alias for ${aliasFor}`}
  }

  return {
    ...def,
    description,
    name: {kind: 'Name', value: parentIsNode ? getFieldName(def) : def.name.value},
    // We always want nullable fields, but preserve lists, obviously
    type: isList ? {kind: 'ListType', type: named} : named,
    arguments: args
  }
}

function processInterfaceTypeDef(def: InterfaceTypeDefinitionNode): InterfaceTypeDefinitionNode {
  return {
    ...def,
    name: {
      kind: 'Name',
      value: getTypeName(def.name.value)
    },
    fields: (def.fields || []).map(field => processFieldNode(field, true))
  }
}

function processUnionTypeDef(def: UnionTypeDefinitionNode): UnionTypeDefinitionNode {
  const types = def.types || []
  return {
    ...def,
    name: {kind: 'Name', value: getTypeName(def.name.value)},
    types: types.map(processNamedTypeDef)
  }
}

function processNamedTypeDef(def: NamedTypeNode): NamedTypeNode {
  return {
    ...def,
    name: {
      kind: 'Name',
      value: getTypeName(def.name.value)
    }
  }
}

function hasDocumentInterface(def: ObjectTypeDefinitionNode) {
  return (def.interfaces || []).some(iface => iface.name.value === 'Document')
}

function getNamedType(def: TypeNode): NamedTypeNode {
  return def.kind === 'NamedType' ? def : getNamedType(def.type)
}

function isListTypeDef(def: TypeNode): boolean {
  return def.kind === 'NonNullType' ? isListTypeDef(def.type) : def.kind === 'ListType'
}

function tryGetDateType(): DateTypeDef | null {
  try {
    const dateModule = require('gatsby/dist/schema/types/type-date')
    return dateModule.getType()
  } catch (err) {
    return null
  }
}

function getFieldName(fieldDef: FieldDefinitionNode) {
  if (RESTRICTED_NODE_FIELDS.includes(fieldDef.name.value)) {
    return `${conflictPrefix}${upperFirst(fieldDef.name.value)}`
  }

  return fieldDef.name.value
}

function getDateArguments(): InputValueDefinitionNode[] {
  if (!dateType) {
    return []
  }

  const args: InputValueDefinitionNode[] = Object.keys(dateType.args).map(argName => {
    const arg = dateType.args[argName]
    const node: InputValueDefinitionNode = {
      kind: 'InputValueDefinition',
      description: arg.description ? {kind: 'StringValue', value: arg.description} : undefined,
      defaultValue: arg.defaultValue,
      name: {kind: 'Name', value: argName},
      type: astNodeFromType(arg.type)
    }

    return node
  })

  return args
}

function astNodeFromType(type: GraphQLInputType): TypeNode {
  if (isListType(type)) {
    return {kind: 'ListType', type: astNodeFromType(type)}
  }

  if (isNonNullType(type)) {
    const nullable = getNullableType<GraphQLNullableType>(type)
    return {
      kind: 'NonNullType',
      type: {
        kind: 'NamedType',
        name: {kind: 'Name', value: nullable.toString()}
      }
    }
  }

  const named = type as GraphQLScalarType
  return {kind: 'NamedType', name: {kind: 'Name', value: named.name}}
}

function getAliasFields(def: ObjectTypeDefinitionNode): FieldDefinitionNode[] {
  return (def.fields || [])
    .map(field => getAliasDirective(field))
    .filter(Boolean)
    .map(
      (targetField): FieldDefinitionNode => ({
        kind: 'FieldDefinition',
        name: {kind: 'Name', value: `${targetField}`},
        type: {
          kind: 'ListType',
          type: {kind: 'NamedType', name: {kind: 'Name', value: getTypeName('Block')}}
        }
      })
    )
}

function getGatsbyNodeFields(): FieldDefinitionNode[] {
  return [
    {
      kind: 'FieldDefinition',
      name: {kind: 'Name', value: 'id'},
      type: {kind: 'NonNullType', type: {kind: 'NamedType', name: {kind: 'Name', value: 'ID'}}}
    },
    {
      kind: 'FieldDefinition',
      name: {kind: 'Name', value: 'children'},
      type: {kind: 'ListType', type: {kind: 'NamedType', name: {kind: 'Name', value: 'Node'}}}
    },
    {
      kind: 'FieldDefinition',
      name: {kind: 'Name', value: 'parent'},
      type: {kind: 'NamedType', name: {kind: 'Name', value: 'Node'}}
    }
  ]
}

function getAliasDirective(field: FieldDefinitionNode): string | null {
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
