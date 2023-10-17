import * as through from 'through2'
import {SanityDocument} from '../types/sanity'
import {isDraftId} from './documentIds'

function filter(doc: SanityDocument, enc: string, callback: through.TransformCallback) {
  return isDraft(doc) ? callback() : callback(null, doc)
}

function isDraft(doc: SanityDocument) {
  return doc && doc._id && isDraftId(doc._id)
}

export const removeDrafts = () => through.obj(filter)
