import {NodePluginArgs} from 'gatsby'
import debug from '../debug'
import {safeId} from './documentIds'
import {unprefixDraftId} from './unprefixDraftId'

const defaultResolveOptions: ResolveReferencesOptions = {
  maxDepth: 5,
  overlayDrafts: false,
}

interface ResolveReferencesOptions {
  maxDepth: number
  overlayDrafts: boolean
}

// NOTE: This is now a public API and should be treated as such
export function resolveReferences(
  obj: any,
  context: Pick<NodePluginArgs, 'createNodeId' | 'getNode'>,
  options: Partial<ResolveReferencesOptions> = {},
  currentDepth = 0,
): any {
  const {createNodeId, getNode} = context
  const resolveOptions = {...defaultResolveOptions, ...options}
  const {overlayDrafts, maxDepth} = resolveOptions

  if (Array.isArray(obj)) {
    return currentDepth <= maxDepth
      ? obj.map((item) => resolveReferences(item, context, resolveOptions, currentDepth + 1))
      : obj
  }

  if (obj === null || typeof obj !== 'object') {
    return obj
  }

  if (typeof obj._ref === 'string') {
    const targetId =
      // If the reference starts with a '-', it means it's a Gatsby node ID,
      // not a Sanity document ID. Thus, it does not need to be rewritten
      obj._ref.startsWith('-')
        ? obj._ref
        : safeId(overlayDrafts ? unprefixDraftId(obj._ref) : obj._ref, createNodeId)

    debug('Resolve %s (Sanity ID %s)', targetId, obj._ref)

    const node = getNode(targetId)
    if (!node && obj._weak) {
      return null
    } else if (!node) {
      debug(`Could not resolve reference to ID "${targetId}"`)
      return null
    }

    return node && currentDepth <= maxDepth
      ? resolveReferences(remapRawFields(node), context, resolveOptions, currentDepth + 1)
      : obj
  }

  const initial: {[key: string]: any} = {}
  return Object.keys(obj).reduce((acc, key) => {
    const isRawDataField = key.startsWith('_rawData')
    const value = resolveReferences(obj[key], context, resolveOptions, currentDepth + 1)
    const targetKey = isRawDataField ? `_raw${key.slice(8)}` : key
    acc[targetKey] = value
    return acc
  }, initial)
}

/**
 * When resolving a Gatsby node through resolveReferences, it's always (through the GraphQL API)
 * operation on a "raw" field. The expectation is to have the return value be as close to the
 * Sanity document as possible. Thus, when we've resolved the node, we want to remap the raw
 * fields to be named as the original field name. `_rawSections` becomes `sections`. Since the
 * value is fetched from the "raw" variant, the references inside it do not have their IDs
 * rewired to their Gatsby equivalents.
 */
function remapRawFields(obj: {[key: string]: any}) {
  const initial: {[key: string]: any} = {}
  return Object.keys(obj).reduce((acc, key) => {
    if (key.startsWith('_rawData')) {
      let targetKey = key.slice(8)

      // Look for UpperCase variant first, if not found, try camelCase
      targetKey =
        typeof obj[targetKey] === 'undefined'
          ? targetKey[0].toLowerCase() + targetKey.slice(1)
          : targetKey

      acc[targetKey] = obj[key]
    } else if (!acc[key]) {
      acc[key] = obj[key]
    }
    return acc
  }, initial)
}
