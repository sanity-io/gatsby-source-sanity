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
  return
}

const referenceDirectiveNode = {
  kind: Kind.DIRECTIVE,
  name: {
    kind: Kind.NAME,
    value: 'reference'
  }
};

// This function rewrites the Schema to treat crossDatasetReference fields as
// references, since we will assume the required schemas and content is added as
// additional source plugin configurations.
export function mapCrossDatasetReferences(api: string) {
  const astNode = parse(api)

  // Second pass: Rewrite the schema to replace CDR types with the appropriate
  const modifiedTypes = visit(astNode, {
    [Kind.FIELD_DEFINITION](fieldNode) {
      if (fieldNode.type.kind === Kind.NAMED_TYPE) {
        const cdrDirective = fieldNode.directives?.find((d) => d.name.value === 'cdr')
        let typeName: string | undefined
        if (cdrDirective) {
          // This is a field that has a cdr directive on it
          // TODO: look up any configured typePrefixes for the dataset
          typeName = getStringArgumentValueFromDirective(cdrDirective, 'typeName')
        } 

        if (typeName) {
          // Replace the cdr directive with a reference directive and replace
          // the type name with the actual target type
          const directives = (fieldNode.directives || []).filter((d) => d.name.value !== 'cdr')
          return {
            ...fieldNode,
            directives: [...directives, referenceDirectiveNode],
            type: {
              ...fieldNode.type,
              name: {
                ...fieldNode.type.name,
                value: typeName,
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
