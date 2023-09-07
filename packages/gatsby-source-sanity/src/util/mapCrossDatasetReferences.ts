import {parse, visit, print, Kind, type DirectiveNode} from 'graphql'

// Function to extract value from a ValueNode
const getStringArgumentValueFromDirective = (directive: DirectiveNode, argument: string) => {
  for (const arg of directive.arguments || []) {
    if (arg.name.value === argument) {
      if (arg.value.kind === Kind.STRING) {
        return arg.value.value
      }
    }
  }
  return null
}

// This function rewrites the Schema to treat crossDatasetReference fields as
// references, since we will assume the required schemas and content is added as
// additional source plugin configurations.
export function mapCrossDatasetReferences(api: string) {
  const astNode = parse(api)

  const modifiedTypes = visit(astNode, {
    [Kind.INPUT_VALUE_DEFINITION](node) {
      if (node.type.kind === Kind.NAMED_TYPE) {
        const cdrFilterDirective = node.directives?.find((d) => d.name.value === 'cdrFilter')
        const cdrSortDirective = node.directives?.find((d) => d.name.value === 'cdrSorting')
        if (cdrFilterDirective) {
          // TODO: look up any configured typePrefixes for the dataset
          const typeName = getStringArgumentValueFromDirective(cdrFilterDirective, 'typeName')
          return {
            ...node,
            type: {
              ...node.type,
              name: {
                ...node.type.name,
                value: `${typeName}Filter`
              },
            },
          }
        }
        if (cdrSortDirective) {
          // TODO: look up any configured typePrefixes for the dataset
          const typeName = getStringArgumentValueFromDirective(cdrSortDirective, 'typeName')
          return {
            ...node,
            type: {
              ...node.type,
              name: {
                ...node.type.name,
                value: `${typeName}Sorting`
              },
            },
          }
        }
      }
      return node
    },
    [Kind.FIELD_DEFINITION](fieldNode) {
      const cdrDirective = fieldNode.directives?.find((d) => d.name.value === 'cdr')
      if (fieldNode.type.kind === Kind.NAMED_TYPE && cdrDirective) {
        let typeName = getStringArgumentValueFromDirective(cdrDirective, 'typeName')
        // TODO: look up any configured typePrefixes for the dataset
        return {
          ...fieldNode,
          type: {
            ...fieldNode.type,
            name: {
              ...fieldNode.type.name,
              value: typeName,
            },
          },
        }
      }
      return fieldNode
    },
  })

  return print(modifiedTypes)
}
