import {SanityClient} from '@sanity/client'
import debug from '../debug'
import {GatsbyContext, GatsbyNode} from '../types/gatsby'
import {SanityDocument, SanityWebhookBody} from '../types/sanity'
import {processDocument, ProcessingOptions, getTypeName} from './normalize'
import {unprefixId, safeId} from './documentIds'

export async function handleWebhookEvent(
  context: GatsbyContext,
  options: {client: SanityClient; processingOptions: ProcessingOptions},
) {
  const {webhookBody, reporter} = context
  if (!validatePayload(webhookBody)) {
    throw new Error('Invalid webhook payload received')
  }

  const {client, processingOptions} = options
  const {ids} = webhookBody
  const {created, deleted, updated} = ids

  const refetchIds = [...created, ...updated]
  let numRefreshed = 0

  if (deleted.length > 0) {
    numRefreshed += handleDeletedDocuments(context, deleted)
  }

  let touchedDocs: SanityDocument[] = []
  if (refetchIds.length > 0) {
    reporter.info(`[sanity] Refetching ${refetchIds.length} documents`)
    const newDocuments = await client.getDocuments(refetchIds)
    touchedDocs = newDocuments.filter(isDocument)
  }

  if (created.length > 0) {
    const createdDocs = created
      .map((id) => touchedDocs.find((doc) => doc && doc._id === id))
      .filter(isDocument)

    numRefreshed += handleChangedDocuments(context, createdDocs, processingOptions, 'created')
  }

  if (updated.length > 0) {
    const updatedDocs = updated
      .map((id) => touchedDocs.find((doc) => doc && doc._id === id))
      .filter(isDocument)

    numRefreshed += handleChangedDocuments(context, updatedDocs, processingOptions, 'created')
  }

  reporter.info(`Refreshed ${numRefreshed} documents`)
}

function handleDeletedDocuments(context: GatsbyContext, ids: string[]) {
  const {actions, createNodeId, getNode} = context
  const {deleteNode} = actions

  return ids
    .map((documentId) => getNode(safeId(unprefixId(documentId), createNodeId)))
    .filter((node): node is GatsbyNode => typeof node !== 'undefined')
    .reduce((count, node) => {
      debug('Deleted document with ID %s', node._id)
      deleteNode({node})
      return count + 1
    }, 0)
}

function handleChangedDocuments(
  context: GatsbyContext,
  changedDocs: SanityDocument[],
  processingOptions: ProcessingOptions,
  action: 'created' | 'updated',
) {
  const {reporter} = context
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
    processDocument(doc, processingOptions)
    return count + 1
  }, 0)
}

function isDocument(doc: SanityDocument | null | undefined): doc is SanityDocument {
  return Boolean(doc && doc._id)
}

function validatePayload(payload: SanityWebhookBody | undefined): payload is SanityWebhookBody {
  if (!payload || typeof payload.ids !== 'object') {
    return false
  }

  const {created, deleted, updated} = payload.ids
  if (!Array.isArray(created) || !Array.isArray(deleted) || !Array.isArray(updated)) {
    return false
  }

  return true
}
