export function isDraftId(id: string) {
  return id.startsWith('drafts.')
}

export const prefixId = (id: string) => (id.startsWith('drafts.') ? id : `drafts.${id}`)

export const unprefixId = (id: string) => id.replace(/^drafts\./, '')

export const safeId = (id: string, makeSafe: (id: string) => string) => {
  return /^(image|file)-[a-z0-9]{32,}-/.test(id) ? id : makeSafe(id)
}
