declare module '@sanity/mutator' {
  interface Match {
    path: string[]
    value: any
  }

  export function extractWithPath(path: string, doc: {[key: string]: any}): Match[]
}
