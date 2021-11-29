import {SanityDocument} from '../types/sanity'
import {getAllDocuments} from './getAllDocuments'

export default function downloadDocuments(
  url: string,
  token?: string,
  options: {includeDrafts?: boolean} = {},
): Promise<Map<string, SanityDocument>> {
  return getAllDocuments(url, token, options).then(
    (stream) =>
      new Promise((resolve, reject) => {
        const documents = new Map<string, SanityDocument>()
        stream.on('data', (doc) => {
          documents.set(doc._id, doc)
        })
        stream.on('end', () => {
          resolve(documents)
        })
        stream.on('error', (error) => {
          reject(error)
        })
      }),
  )
}
