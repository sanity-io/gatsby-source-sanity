import * as through from 'through2'
import {SanityDocument} from '../types/sanity'

function isDraft(doc: SanityDocument) {
  return doc && doc._id && doc._id.startsWith('drafts.')
}

function filter(doc: SanityDocument, enc: string, callback: through.TransformCallback) {
  return isDraft(doc) ? callback() : callback(null, doc)
}

export const removeDrafts = () => through.obj(filter)

export const extractDrafts = (target: SanityDocument[]) =>
  through.obj((doc: SanityDocument, enc: string, callback: through.TransformCallback) => {
    if (!isDraft(doc)) {
      return callback(null, doc)
    }

    target.push(doc)
    callback()
  })
