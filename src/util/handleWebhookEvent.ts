import {SourceNodesArgs} from 'gatsby'
import {SanityClient} from '@sanity/client'
import debug from '../debug'
import {SanityNode} from '../types/gatsby'
import {
  SanityDocument,
  SanityWebhookBody,
  SanityWebhookV1Body,
  SanityWebhookV2Body,
} from '../types/sanity'
import {ProcessingOptions, getTypeName, toGatsbyNode} from './normalize'
import {unprefixId, safeId} from './documentIds'

type v1WebhookArgs = SourceNodesArgs & {webhookBody: SanityWebhookV1Body}
type v2WebhookArgs = SourceNodesArgs & {webhookBody: SanityWebhookV2Body}

async function handleV1Webhook(
  args: v1WebhookArgs,
  options: {client: SanityClient; processingOptions: ProcessingOptions},
) {
  const {client, processingOptions} = options
  const {webhookBody, reporter} = args

  const {ids} = webhookBody
  const {created, deleted, updated} = ids

  const refetchIds = [...created, ...updated]
  let numRefreshed = 0

  if (deleted.length > 0) {
    numRefreshed += handleDeletedDocuments(args, deleted)
  }

  let touchedDocs: SanityDocument[] = []
  if (refetchIds.length > 0) {
    reporter.info(`[sanity] Refetching ${refetchIds.length} documents`)
    const newDocuments = await client.getDocuments(refetchIds, {
      tag: 'sanity.gatsby.webhook-refetch',
    })
    touchedDocs = newDocuments.filter(isDocument)
  }

  if (created.length > 0) {
    const createdDocs = created
      .map((id) => touchedDocs.find((doc) => doc && doc._id === id))
      .filter(isDocument)

    numRefreshed += handleChangedDocuments(args, createdDocs, processingOptions, 'created')
  }

  if (updated.length > 0) {
    const updatedDocs = updated
      .map((id) => touchedDocs.find((doc) => doc && doc._id === id))
      .filter(isDocument)

    numRefreshed += handleChangedDocuments(args, updatedDocs, processingOptions, 'created')
  }

  reporter.info(`Refreshed ${numRefreshed} documents`)

  return true
}

async function handleV2Webhook(
  args: v2WebhookArgs,
  options: {client: SanityClient; processingOptions: ProcessingOptions},
) {
  const {webhookBody, reporter} = args

  const {
    __meta: {operation = 'update', documentId, projectId, dataset},
    after: document,
  } = webhookBody

  const config = options.client.config()
  const {overlayDrafts} = options.processingOptions

  if (config.projectId !== projectId || config.dataset !== dataset) {
    return false
  }

  if (
    operation === 'create' &&
    document?._id &&
    // Don't create node if a draft document w/ overlayDrafts === false
    (!document._id.startsWith('drafts.') || overlayDrafts)
  ) {
    handleChangedDocuments(args, [document], options.processingOptions, 'created')

    reporter.info(`Created 1 document`)
    return true
  }

  if (
    operation === 'update' &&
    document?._id &&
    (!document._id.startsWith('drafts.') || overlayDrafts)
  ) {
    handleChangedDocuments(args, [document], options.processingOptions, 'updated')

    reporter.info(`Refreshed 1 document`)
    return true
  }

  if (
    operation === 'delete' &&
    // Only delete nodes of published documents when overlayDrafts === false
    (!documentId.startsWith('drafts.') || overlayDrafts)
  ) {
    handleDeletedDocuments(args, [documentId])

    reporter.info(`Deleted 1 document`)
    return true
  }

  return false
}

export async function handleWebhookEvent(
  args: SourceNodesArgs & {webhookBody?: SanityWebhookBody},
  options: {client: SanityClient; processingOptions: ProcessingOptions},
): Promise<boolean> {
  const {webhookBody, reporter} = args
  const validated = validateWebhookPayload(webhookBody)
  if (validated === false) {
    debug('Invalid/non-sanity webhook payload received')
    return false
  }

  reporter.info('[sanity] Processing changed documents from webhook')

  if (validated === 'v1') {
    return await handleV1Webhook(args as v1WebhookArgs, options)
  } else if (validated === 'v2') {
    return await handleV2Webhook(args as v2WebhookArgs, options)
  }

  return false
}

function handleDeletedDocuments(context: SourceNodesArgs, ids: string[]) {
  const {actions, createNodeId, getNode} = context
  const {deleteNode} = actions

  return ids
    .map((documentId) => getNode(safeId(unprefixId(documentId), createNodeId)))
    .filter((node): node is SanityNode => typeof node !== 'undefined')
    .reduce((count, node) => {
      debug('Deleted document with ID %s', node._id)
      deleteNode(node)
      return count + 1
    }, 0)
}

function handleChangedDocuments(
  args: SourceNodesArgs,
  changedDocs: SanityDocument[],
  processingOptions: ProcessingOptions,
  action: 'created' | 'updated',
) {
  const {reporter} = args
  const {typeMap} = processingOptions

  return changedDocs.reduce((count, doc) => {
    const type = getTypeName(doc._type)
    if (!typeMap.objects[type]) {
      reporter.warn(
        `[sanity] Document "${doc._id}" has type ${doc._type} (${type}), which is not declared in the GraphQL schema. Make sure you run "graphql deploy". Skipping document.`,
      )
      return count
    }

    debug('%s document with ID %s', action === 'created' ? 'Created' : 'Updated', doc._id)
    processingOptions.createNode(toGatsbyNode(doc, processingOptions))
    return count + 1
  }, 0)
}

function isDocument(doc: SanityDocument | null | undefined): doc is SanityDocument {
  return Boolean(doc && doc._id)
}

export function validateWebhookPayload(payload: SanityWebhookBody | undefined): 'v1' | 'v2' | false {
  if (!payload) {
    return false
  }

  // Let's test V2 first as those documents could also include an `ids` object
  if ('__meta' in payload && payload.__meta.webhooksVersion === 'v2') {
    return 'v2'
  }

  if ('ids' in payload && typeof payload.ids === 'object') {
    const {created, deleted, updated} = payload.ids

    if (Array.isArray(created) && Array.isArray(deleted) && Array.isArray(updated)) {
      return 'v1'
    }
  }

  return false
}
