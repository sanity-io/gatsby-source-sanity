declare module 'pumpify' {
  import {Stream, Duplex} from 'stream'
  export const obj: (...streams: Stream[]) => Duplex
}
