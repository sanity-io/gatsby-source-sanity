import axios from 'axios'
import {Readable} from 'stream'
import {pkgName} from '../index'

export function getDocumentStream(url: string, token: string): Promise<Readable> {
  return axios({
    method: 'get',
    url: url,
    responseType: 'stream',
    headers: {
      Authorization: `Bearer ${token}`,
      'User-Agent': `${pkgName}`
    }
  }).then(res => res.data)
}
