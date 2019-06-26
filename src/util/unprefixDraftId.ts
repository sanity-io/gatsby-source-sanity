// `drafts.foo-bar` => `foo.bar`
export function unprefixDraftId(id: string) {
  return id.replace(/^drafts\./, '')
}
