import debug from '../debug'
import {SanityDocument} from '../types/sanity'
import {GatsbyContext} from '../types/gatsby'
import {processDocument, ProcessingOptions} from './normalize'
import {unprefixId, safeId} from './documentIds'

export interface WebhookMessage {
  documentId: string
  transition: string
  result?: SanityDocument
}

export function handleWebhookEvent(
  event: WebhookMessage,
  context: GatsbyContext,
  processingOptions: ProcessingOptions,
) {
  const {actions, createNodeId, getNode} = context
  const {deleteNode} = actions
  const {documentId, transition, result} = event
  const current = getNode(safeId(unprefixId(documentId), createNodeId))

  if (transition == 'deleted') {
    deleteNode({node: current})
    debug('Deleted document with ID %s', documentId)
    return
  }

  processDocument(result, processingOptions)
  debug('Created document with ID %s', documentId)
  return
}
