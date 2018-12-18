import * as through from 'through2'
import {SanityDocument, ApiError} from '../types/sanity'

type DocumentOrApiError = SanityDocument | ApiError

function filter(sanityDoc: DocumentOrApiError, enc: string, callback: through.TransformCallback) {
  const doc = sanityDoc as SanityDocument
  if (doc._id && doc._type) {
    callback(null, doc)
    return
  }

  const error = sanityDoc as ApiError
  if (error.statusCode && error.error) {
    callback(new Error(`${error.statusCode}: ${error.error}`))
    return
  }

  callback()
}

export const rejectOnApiError = () => through.obj(filter)
