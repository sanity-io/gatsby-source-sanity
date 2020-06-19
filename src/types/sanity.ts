export type SanityDocument<T extends Record<string, any> = Record<string, any>> = {
  [P in keyof T]: T[P]
} & {
  _id: string
  _rev: string
  _type: string
  _createdAt: string
  _updatedAt: string
}

export interface SanityRef {
  _ref: string
}

export interface ApiError {
  statusCode: number
  error: string
  message: string
}

export interface SanityWebhookBody {
  ids: {
    created: string[]
    deleted: string[]
    updated: string[]
  }
}
