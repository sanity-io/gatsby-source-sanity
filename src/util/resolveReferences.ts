import {GatsbyNode, GatsbyNodeIdCreator} from '../types/gatsby'
import {unprefixDraftId} from './unprefixDraftId'

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
    const id = obj._ref
    const node = getNode(createNodeId(overlayDrafts ? unprefixDraftId(id) : id))
    return node && currentDepth <= maxDepth
      ? resolveReferences(node, context, resolveOptions, currentDepth + 1)
      : obj
  }

  const initial: {[key: string]: any} = {}
  return Object.keys(obj).reduce((acc, key) => {
    const isGatsbyRef = key.endsWith('___NODE')
    const isRawDataField = key.startsWith('_rawData')
    let targetKey = isGatsbyRef && currentDepth <= maxDepth ? key.slice(0, -7) : key

    let value = obj[key]
    if (isGatsbyRef && currentDepth <= maxDepth) {
      value = resolveGatsbyReference(obj[key], context)
    }

    value = resolveReferences(value, context, resolveOptions, currentDepth + 1)

    if (isRawDataField) {
      targetKey = `_raw${key.slice(8)}`
    }

    acc[targetKey] = value
    return acc
  }, initial)
}

function resolveGatsbyReference(value: string | string[], context: MinimalGatsbyContext) {
  const {getNode} = context
  if (typeof value === 'string') {
    return getNode(value)
  } else if (Array.isArray(value)) {
    return value.map(id => getNode(id))
  } else {
    throw new Error(`Unknown Gatsby node reference: ${value}`)
  }
}
