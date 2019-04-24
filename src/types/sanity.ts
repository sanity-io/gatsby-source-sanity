export interface SanityDocument {
  _id: string
  _type: string
  [key: string]: any
}

export interface SanityRef {
  _ref: string
}

export interface ApiError {
  statusCode: number
  error: string
  message: string
}
