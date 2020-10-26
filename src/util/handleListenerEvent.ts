import {SourceNodesArgs} from 'gatsby'
import {MutationEvent} from '@sanity/client'
import debug from '../debug'
import {SanityInputNode, SanityNode} from '../types/gatsby'
import {processDocument, ProcessingOptions} from './normalize'
import {removeGatsbyInternalProps} from './removeGatsbyInternalProps'
import {unprefixId, isDraftId, safeId} from './documentIds'

export function handleListenerEvent(
  event: MutationEvent,
  publishedNodes: Map<string, SanityNode | SanityInputNode>,
  args: SourceNodesArgs,
  processingOptions: ProcessingOptions,
) {
  const {actions, createNodeId, getNode} = args
  const {createNode, deleteNode} = actions
  const {overlayDrafts} = processingOptions
  const current = getNode(safeId(unprefixId(event.documentId), createNodeId)) as SanityNode

  let published = publishedNodes.get(unprefixId(event.documentId))
  if (published) {
    published = removeGatsbyInternalProps(published)
  }

  const touchedIsDraft = isDraftId(event.documentId)
  const currentIsDraft = current && isDraftId(current._id)

  // In non-overlay mode, things are pretty simple -
  // replace the current on create/update,
  // delete the current if it disappears
  if (!overlayDrafts) {
    if (touchedIsDraft) {
      debug('Document is draft, but draft overlay disabled. Skipping.')
      return
    }

    if (event.transition !== 'disappear' && event.result) {
      // Created/updated, replace current
      debug('Published document created or updated, replace/create')
      processDocument(event.result, processingOptions)
    } else if (current) {
      // Deleted a node that we currently have, delete it
      debug('Published document deleted, remove')
      deleteNode({node: current})
    }

    return
  }

  // In overlay mode, things are a bit more tricky.
  // We need to keep a copy of the published documents around so we can
  // put the published version back if a draft is discarded (deleted).
  // If a published document is updated but there is still a draft,
  // we still want to show the draft. A lot of cases here, unfortunately.
  if (event.transition === 'disappear') {
    // A document was deleted
    if (touchedIsDraft && published) {
      debug('Draft deleted, published version exists, restore published version')
      createNode(published)
    } else if (touchedIsDraft && !published && current) {
      debug('Draft deleted, no published version exist, delete node')
      deleteNode({node: current})
    } else if (!touchedIsDraft && currentIsDraft && published) {
      debug('Published version deleted, but we have draft, remove published from working set')
      publishedNodes.delete(event.documentId)
    } else if (!touchedIsDraft && !currentIsDraft && current) {
      debug('Published version deleted, we have no draft, remove node entirely')
      deleteNode({node: current})
      publishedNodes.delete(event.documentId)
    }
  } else {
    // A document was updated / created
    if (touchedIsDraft && event.result) {
      debug(current ? 'Replace the current draft with a new draft' : 'New draft discovered')
      processDocument(event.result, processingOptions)

      // If the currently used node is a published one, make sure we keep a copy
      if (current && !currentIsDraft) {
        publishedNodes.set(unprefixId(event.documentId), current)
      }
    } else if (currentIsDraft && event.result) {
      // Creating/updating a published document, but we have a draft
      // Keep the draft as the current, but update our set of published docs
      debug('Created/updating published document, but draft overlays it')
      publishedNodes.set(
        event.documentId,
        processDocument(event.result, {...processingOptions, skipCreate: true}),
      )
    } else if (event.result) {
      // Creating/updating a published document, and there is no draft version present
      // Replace the current version with the new one
      debug('Created/updating published document, no draft present')
      processDocument(event.result, processingOptions)
    }
  }
}
