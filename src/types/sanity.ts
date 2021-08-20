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

export interface SanityWebhookV1Body {
  ids: {
    created: string[]
    deleted: string[]
    updated: string[]
  }
}

/*
  GROQ projection for webhooks v2:
  {
    "__webhooksVersion": "v2",
    "operation": select(
      before() == null => "create",
      after() == null => "delete",
      "update"
    ),
    "documentId": coalesce(before()._id, after()._id),
    "projectId": sanity::projectId(),
    "dataset": sanity::dataset(),
    "after": after(),
  }
*/
export interface SanityWebhookV2Body {
  __webhooksVersion: "v2"
  operation: "create" | "update" | "delete"
  documentId: string
  projectId?: string
  dataset?: string
  after?: SanityDocument
}

export type SanityWebhookBody = SanityWebhookV1Body | SanityWebhookV2Body