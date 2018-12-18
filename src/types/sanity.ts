export interface SanityDocument {
  _id: string
  _type: string
  [key: string]: any
}

export interface ApiError {
  statusCode: number
  error: string
  message: string
}
