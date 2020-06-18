import pumpIt from 'pump'

type Stream = NodeJS.ReadableStream | NodeJS.WritableStream

export function pump(streams: Stream[]): Promise<undefined> {
  return new Promise((resolve, reject) =>
    pumpIt(streams, (err) => {
      if (err) {
        reject(err)
      } else {
        resolve()
      }
    }),
  )
}
