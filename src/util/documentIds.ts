export function isDraftId(id: string) {
  return id.startsWith('drafts.')
}

export const prefixId = (id: string) => (id.startsWith('drafts.') ? id : `drafts.${id}`)

export const unprefixId = (id: string) => id.replace(/^drafts\./, '')

export const safeId = (id: string, makeSafe: (id: string) => string) => {
  return /^(image|file)-[a-z0-9]{32,}-/.test(id)
    ? // Use raw IDs for assets as we might use these with asset tooling
      id
    : // Prefix Gatsbyfied IDs with a dash as it's not allowed in Sanity,
      // thus enabling easy checks for Gatsby vs Sanity IDs
      `-${makeSafe(id)}`
}
