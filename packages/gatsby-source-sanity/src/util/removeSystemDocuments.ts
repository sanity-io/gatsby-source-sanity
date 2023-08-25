import * as through from 'through2'
import {SanityDocument} from '../types/sanity'

function filter(doc: SanityDocument, enc: string, callback: through.TransformCallback) {
  if (doc && doc._id && doc._id.startsWith('_.')) {
    return callback()
  }

  return callback(null, doc)
}

export const removeSystemDocuments = () => through.obj(filter)
