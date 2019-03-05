declare module '@sanity/client' {
  class SanityClient {
    constructor(config: ClientConfig)
    getUrl: (url: string) => string
    request: (options: RequestOptions) => Promise<string>
    listen: (query: string) => Observable
    config: () => ClientConfig
  }

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

  interface SanityDocument {
    _id: string
    _type: string
    [key: string]: any
  }

  interface SubscriptionObserver<T> {
    closed: boolean
    next(value: T): void
    error(errorValue: any): void
    complete(): void
  }

  interface Subscription {
    closed: boolean
    unsubscribe(): void
  }

  interface Observer<T> {
    start?(subscription: Subscription): any
    next?(value: T): void
    error?(errorValue: any): void
    complete?(): void
  }

  type Subscriber<T> = (observer: SubscriptionObserver<T>) => void | (() => void) | Subscription

  interface ListenerMessage {
    documentId: string
    transition: string
    result: SanityDocument
  }

  interface Observable {
    pipe(...ops: any): Observable
    subscribe(observer: Observer<ListenerMessage>): Subscription
    subscribe(
      onNext: (value: ListenerMessage) => void,
      onError?: (error: Error) => void,
      onComplete?: () => void,
    ): Subscription

    map<R>(callback: (value: ListenerMessage) => R): Observable
    filter(callback: (value: ListenerMessage) => boolean): Observable
  }

  export = SanityClient
}
