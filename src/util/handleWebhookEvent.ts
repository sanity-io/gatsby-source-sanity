import {SourceNodesArgs} from 'gatsby'
import {SanityClient} from '@sanity/client'
import debug from '../debug'
import {SanityNode} from '../types/gatsby'
import {
  SanityWebhookBody,
  SanityWebhookDeleteBody,
} from '../types/sanity'
import {ProcessingOptions} from './normalize'
import {unprefixId, safeId} from './documentIds'

type deleteWebhookArgs = SourceNodesArgs & {webhookBody: SanityWebhookDeleteBody}

/**
 * Gets a document id received from the webhook & delete it in the store.
 */
async function handleDeleteWebhook(
  args: deleteWebhookArgs,
  options: {client: SanityClient; processingOptions: ProcessingOptions},
) {
  const {webhookBody, reporter} = args

  const {documentId: rawId, dataset, projectId} = webhookBody

  const publishedDocumentId = unprefixId(rawId)
  const config = options.client.config()

  if (projectId && dataset && (config.projectId !== projectId || config.dataset !== dataset)) {
    return false
  }

  handleDeletedDocuments(args, [publishedDocumentId])

  reporter.info(`Deleted 1 document`)
  return true
}

export async function handleWebhookEvent(
  args: SourceNodesArgs & {webhookBody?: SanityWebhookBody},
  options: {client: SanityClient; processingOptions: ProcessingOptions},
): Promise<boolean> {
  const {webhookBody, reporter} = args
  const validated = validateWebhookPayload(webhookBody)
  if (validated === false) {
    debug('[sanity] Invalid/non-sanity webhook payload received')
    return false
  }

  reporter.info('[sanity] Processing changed documents from webhook')

  if (validated === 'delete-operation') {
    return await handleDeleteWebhook(args as deleteWebhookArgs, options)
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

export function validateWebhookPayload(
  payload: SanityWebhookBody | undefined,
): 'delete-operation' | false {
  if (!payload) {
    return false
  }

  if ('operation' in payload && payload.operation === 'delete') {
    return 'delete-operation'
  }

  return false
}
