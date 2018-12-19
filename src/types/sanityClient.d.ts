declare module '@sanity/client' {
  interface RequestOptions {
    url: string
    headers: {[key: string]: string}
  }

  interface ClientConfig {
    projectId: string
    dataset: string
    token?: string
    version?: string
    useCdn?: boolean
  }

  class SanityClient {
    constructor(config: ClientConfig)
    getUrl: (url: string) => string
    request: (options: RequestOptions) => Promise<string>
    config: () => ClientConfig
  }

  export = SanityClient
}
