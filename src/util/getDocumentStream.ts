import axios from 'axios'
import {Readable} from 'stream'
import {pkgName} from '../index'

export function getDocumentStream(url: string, token?: string): Promise<Readable> {
  const auth = token ? {Authorization: `Bearer ${token}`} : {}
  const userAgent = {'User-Agent': `${pkgName}`}
  const headers = {...userAgent, ...auth}

  return axios({
    method: 'get',
    responseType: 'stream',
    url,
    headers
  }).then(res => res.data)
}
