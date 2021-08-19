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
    "__meta": {
      "webhooksVersion": "v2",
      "operation": select(
        !defined(before()._id) => "create",
        !defined(after()._id) => "delete",
        "update"
      ),
      "documentId": coalesce(before()._id, after()._id),
      "projectId": sanity::projectId(),
      "dataset": sanity::dataset(),
    },
    "after": after(),
  }
*/
export interface SanityWebhookV2Body {
  __meta: {
    webhooksVersion: "v2"
    operation: "create" | "update" | "delete"
    projectId: string
    dataset: string
    documentId: string
  }
  after?: SanityDocument
}

export type SanityWebhookBody = SanityWebhookV1Body | SanityWebhookV2Body