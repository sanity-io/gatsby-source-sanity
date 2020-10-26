import axios from 'axios'
import getStream from 'get-stream'
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
    headers,
  })
    .then((res) => res.data)
    .catch(async (err) => {
      if (!err.response || !err.response.data) {
        throw err
      }

      let error = err
      try {
        // Try to lift error message out of JSON payload ({error, message, statusCode})
        const data = await getStream(err.response.data)
        error = new Error(JSON.parse(data).message)
      } catch (jsonErr) {
        // Do nothing, throw regular error
      }

      throw error
    })
}
