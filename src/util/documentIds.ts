export function isDraftId(id: string) {
  return id.startsWith('drafts.')
}

export const prefixId = (id: string) => (id.startsWith('drafts.') ? id : `drafts.${id}`)

export const unprefixId = (id: string) => id.replace(/^drafts\./, '')
