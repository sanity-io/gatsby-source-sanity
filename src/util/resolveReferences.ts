import {GatsbyNode, GatsbyNodeIdCreator} from '../types/gatsby'
import {unprefixDraftId} from './unprefixDraftId'
import {safeId} from './documentIds'
import debug from '../debug'

const defaultResolveOptions: ResolveReferencesOptions = {
  maxDepth: 5,
  overlayDrafts: false,
}

interface MinimalGatsbyContext {
  createNodeId: GatsbyNodeIdCreator
  getNode: (id: string) => GatsbyNode | undefined
}

interface ResolveReferencesOptions {
  maxDepth: number
  overlayDrafts: boolean
}

// NOTE: This is now a public API and should be treated as such
export function resolveReferences(
  obj: any,
  context: MinimalGatsbyContext,
  options: Partial<ResolveReferencesOptions> = {},
  currentDepth = 0,
): any {
  const {createNodeId, getNode} = context
  const resolveOptions = {...defaultResolveOptions, ...options}
  const {overlayDrafts, maxDepth} = resolveOptions

  if (Array.isArray(obj)) {
    return currentDepth <= maxDepth
      ? obj.map(item => resolveReferences(item, context, resolveOptions, currentDepth + 1))
      : obj
  }

  if (obj === null || typeof obj !== 'object') {
    return obj
  }

  if (typeof obj._ref === 'string') {
    const targetId = safeId(overlayDrafts ? unprefixDraftId(obj._ref) : obj._ref, createNodeId)
    debug('Resolve %s (Sanity ID %s)', targetId, obj._ref)

    const node = getNode(targetId)
    return node && currentDepth <= maxDepth
      ? resolveReferences(node, context, resolveOptions, currentDepth + 1)
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
