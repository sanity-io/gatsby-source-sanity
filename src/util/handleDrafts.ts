import * as through from 'through2'
import {SanityDocument} from '../types/sanity'

function filter(doc: SanityDocument, enc: string, callback: through.TransformCallback) {
  return isDraft(doc) ? callback() : callback(null, doc)
}

export function isDraftId(id: string) {
  return id.startsWith('drafts.')
}

export function isDraft(doc: SanityDocument) {
  return doc && doc._id && isDraftId(doc._id)
}

export const prefixId = (id: string) => (id.startsWith('drafts.') ? id : `drafts.${id}`)

export const unprefixId = (id: string) => id.replace(/^drafts\./, '')

export const removeDrafts = () => through.obj(filter)

export const extractDrafts = (target: SanityDocument[]) =>
  through.obj((doc: SanityDocument, enc: string, callback: through.TransformCallback) => {
    if (!isDraft(doc)) {
      return callback(null, doc)
    }

    target.push(doc)
    callback()
  })
