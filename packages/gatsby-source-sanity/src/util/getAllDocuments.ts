import split from 'split2'
import {rejectOnApiError} from './rejectOnApiError'
import {getDocumentStream} from './getDocumentStream'
import {removeDrafts} from './handleDrafts'
import * as through from 'through2'
import {removeSystemDocuments} from './removeSystemDocuments'
import pumpify from 'pumpify'
import {Stream} from 'stream'

export async function getAllDocuments(
  url: string,
  token?: string,
  options: {includeDrafts?: boolean} = {},
): Promise<Stream> {
  return pumpify.obj(
    await getDocumentStream(url, token),
    split(JSON.parse),
    options.includeDrafts ? through.obj() : removeDrafts(),
    removeSystemDocuments(),
    rejectOnApiError(),
  )
}
