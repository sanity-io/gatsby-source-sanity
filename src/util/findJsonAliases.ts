import {
  GraphQLSchema,
  ObjectTypeDefinitionNode,
  FieldDefinitionNode,
  valueFromAST,
  GraphQLString
} from 'graphql'

export const findJsonAliases = (schema: GraphQLSchema) => {
  const types = schema.getTypeMap()
  const typeNames = Object.keys(types)
  const initial: {[key: string]: {[key: string]: string}} = {}

  return typeNames.reduce((aliases, typeName) => {
    const type = types[typeName]
    const ast = type.astNode as ObjectTypeDefinitionNode
    const fields = (ast && ast.fields) || []

    const initalFieldAliases: {[key: string]: string} = {}
    const fieldAliases = fields.reduce((acc, field) => {
      const alias = getAliasDirective(field)
      if (!alias) {
        return acc
      }

      return {...acc, [alias.target]: alias.source}
    }, initalFieldAliases)

    const hasAliases = Object.keys(fieldAliases).length > 0
    return hasAliases ? {...aliases, [typeName]: fieldAliases} : aliases
  }, initial)
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

  return {
    target: field.name.value,
    source: valueFromAST(forArg.value, GraphQLString, {})
  }
}
