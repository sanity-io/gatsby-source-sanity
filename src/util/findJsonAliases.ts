import {FieldDef} from './remoteGraphQLSchema'

export default function getAliasFields(fields: {[key: string]: FieldDef}) {
  const initial: string[] = []
  return Object.keys(fields).reduce((aliases, fieldName) => {
    return fields[fieldName].aliasFor ? [...aliases, fieldName] : aliases
  }, initial)
}
