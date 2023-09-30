import {
  parse,
  visit,
  print,
  Kind,
  type DirectiveNode,
  type NamedTypeNode,
  type UnionTypeDefinitionNode,
} from 'graphql'

// Function to extract array of string value from a ValueNode
const getStringArrayArgumentValuesFromDirective = (directive: DirectiveNode, argument: string) => {
  const values: string[] = []
  for (const arg of directive.arguments || []) {
    if (arg.name.value === argument) {
      if (arg.value.kind === Kind.LIST) {
        arg.value.values.forEach((value) => {
          if (value.kind === Kind.STRING) {
            values.push(value.value)
          }
        })
      }
    }
  }
  return values
}

const referenceDirectiveNode: DirectiveNode = {
  kind: Kind.DIRECTIVE,
  name: {
    kind: Kind.NAME,
    value: 'reference',
  },
}

const typeNameForMappping = (typeNames: string[]) => {
  return typeNames.join('Or')
}

// This function rewrites the Schema to treat crossDatasetReference fields as
// references, since we will assume the required schemas and content is added as
// additional source plugin configurations.
export function mapCrossDatasetReferences(api: string) {
  const astNode = parse(api)

  // First pass: Find any named types that have cdr directives on them
  const cdrMapping: Record<string, string[]> = {}
  visit(astNode, {
    enter(node) {},
    [Kind.OBJECT_TYPE_DEFINITION](node) {
      if (node.name.value) {
        const cdrDirective = node.directives?.find((d) => d.name.value === 'cdr')
        if (cdrDirective) {
          // This is a type that has a cdr directive on it
          //let typeName = getStringArgumentValueFromDirective(cdrDirective, 'typeName')
          let typeNames = getStringArrayArgumentValuesFromDirective(cdrDirective, 'typeNames')
          if (typeNames) {
            cdrMapping[node.name.value] = typeNames
          }
        }
      }
    },
  })

  const unionDefinitions: UnionTypeDefinitionNode[] = []
  // Find all the values in cdrMapping that have more than 1 value
  for (const key in cdrMapping) {
    if (cdrMapping[key].length > 1) {
      // Create a union type for this set of types
      unionDefinitions.push({
        kind: Kind.UNION_TYPE_DEFINITION,
        name: {
          kind: Kind.NAME,
          value: typeNameForMappping(cdrMapping[key]),
        },
        types: cdrMapping[key].map((key) => {
          return {
            kind: Kind.NAMED_TYPE,
            name: {
              kind: Kind.NAME,
              value: key,
            },
          }
        }),
      })
    }
  }

  // Add our new Union types
  const newAST = {
    ...astNode,
    definitions: [...astNode.definitions, ...unionDefinitions]
  }

  // Second pass: Rewrite the schema to replace CDR types with the appropriate
  // target type and add @reference directive where appropriate
  const modifiedTypes = visit(newAST, {
    [Kind.FIELD_DEFINITION](fieldNode) {
      const cdrDirective = fieldNode.directives?.find((d) => d.name.value === 'cdr')
      let mappedTypeNames: string[] | undefined = undefined

      if (fieldNode.type.kind === Kind.NAMED_TYPE) {
        if (cdrDirective) {
          // This is a field that has a cdr directive on it
          // TODO: look up any configured typePrefixes for the dataset
          mappedTypeNames = getStringArrayArgumentValuesFromDirective(cdrDirective, 'typeNames')
        } else {
          // This is a field that does not have a cdr directive on it
          // Check if the field type is a CDR type
          const fieldName = fieldNode.type.name.value
          if (fieldName in cdrMapping) {
            mappedTypeNames = cdrMapping[fieldName]
          }
        }
      }

      if (fieldNode.type.kind === Kind.LIST_TYPE) {
        const innerType = fieldNode.type.type as NamedTypeNode // TypeScript type assertion
        const fieldName = innerType.name.value
        // Check if the field type is a CDR type
        if (fieldName in cdrMapping) {
          mappedTypeNames = cdrMapping[fieldName]
        }
      }

      if (mappedTypeNames) {
        // Replace the cdr directive with a reference directive and replace
        // the type name with the actual target type
        let directives: DirectiveNode[] = (fieldNode.directives || []).filter(
          (d) => d.name.value !== 'cdr',
        )
        if (cdrDirective) {
          // If there was a cdr directive, replace it with a reference directive
          directives = [...directives, referenceDirectiveNode]
        }

        if (fieldNode.type.kind === Kind.NAMED_TYPE) {
          return {
            ...fieldNode,
            directives,
            type: {
              ...fieldNode.type,
              name: {
                ...fieldNode.type.name,
                value: typeNameForMappping(mappedTypeNames),
              },
            },
          }
        }

        if (fieldNode.type.kind === Kind.LIST_TYPE) {
          return {
            ...fieldNode,
            type: {
              ...fieldNode.type,
              type: {
                kind: Kind.NAMED_TYPE,
                name: {
                  kind: Kind.NAME,
                  value: typeNameForMappping(mappedTypeNames),
                },
              },
            },
          }
        }
      }
      return fieldNode
    },
    [Kind.UNION_TYPE_DEFINITION](node) {
      // Check if any of the union types match keys in the cdrMapping
      const modifiedTypes = node.types?.map((typeNode) => {
        const typeName = typeNode.name.value
        if (cdrMapping[typeName]) {
          return {
            ...typeNode,
            name: {
              kind: Kind.NAME,
              value: cdrMapping[typeName],
            },
          }
        }
        return typeNode // return the type unchanged if it's not in the cdrMapping
      })

      // Return the modified union node
      return {
        ...node,
        types: modifiedTypes,
      }
    },
  })

  return print(modifiedTypes)
}
