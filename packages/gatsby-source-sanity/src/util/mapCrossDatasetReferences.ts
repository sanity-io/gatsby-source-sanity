import {parse, visit, print, Kind, type DirectiveNode, type NamedTypeNode} from 'graphql'

// Function to extract value from a ValueNode
const getStringArgumentValueFromDirective = (directive: DirectiveNode, argument: string) => {
  for (const arg of directive.arguments || []) {
    if (arg.name.value === argument) {
      if (arg.value.kind === Kind.STRING) {
        return arg.value.value
      }
    }
  }
  return
}

const referenceDirectiveNode: DirectiveNode = {
  kind: Kind.DIRECTIVE,
  name: {
    kind: Kind.NAME,
    value: 'reference',
  },
}

// This function rewrites the Schema to treat crossDatasetReference fields as
// references, since we will assume the required schemas and content is added as
// additional source plugin configurations.
export function mapCrossDatasetReferences(api: string) {
  const astNode = parse(api)

  // First pass: Find any named types that have cdr directives on them
  const cdrMapping: Record<string, string> = {}
  visit(astNode, {
    enter(node) {},
    [Kind.OBJECT_TYPE_DEFINITION](node) {
      if (node.name.value) {
        const cdrDirective = node.directives?.find((d) => d.name.value === 'cdr')
        if (cdrDirective) {
          // This is a type that has a cdr directive on it
          let typeName = getStringArgumentValueFromDirective(cdrDirective, 'typeName')
          if (typeName) {
            cdrMapping[node.name.value] = typeName
          }
        }
      }
    },
  })

  // Second pass: Rewrite the schema to replace CDR types with the appropriate
  // target type and add @reference directive where appropriate
  const modifiedTypes = visit(astNode, {
    [Kind.FIELD_DEFINITION](fieldNode) {
      const cdrDirective = fieldNode.directives?.find((d) => d.name.value === 'cdr')
      let mappedTypeName: string | undefined

      if (fieldNode.type.kind === Kind.NAMED_TYPE) {
        if (cdrDirective) {
          // This is a field that has a cdr directive on it
          // TODO: look up any configured typePrefixes for the dataset
          mappedTypeName = getStringArgumentValueFromDirective(cdrDirective, 'typeName')
        } else {
          // This is a field that does not have a cdr directive on it
          // Check if the field type is a CDR type
          const fieldName = fieldNode.type.name.value
          if (fieldName in cdrMapping) {
            mappedTypeName = cdrMapping[fieldName]
          }
        }
      }

      if (fieldNode.type.kind === Kind.LIST_TYPE) {
        const innerType = fieldNode.type.type as NamedTypeNode // TypeScript type assertion
        const fieldName = innerType.name.value
        // Check if the field type is a CDR type
        if (fieldName in cdrMapping) {
          mappedTypeName = cdrMapping[fieldName]
        }
      }

      if (mappedTypeName) {
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
                value: mappedTypeName,
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
                  value: mappedTypeName,
                },
              },
            },
          }
        }
      }
      return fieldNode
    },
  })

  return print(modifiedTypes)
}
