import {SanityInputNode, SanityNode} from '../types/gatsby'

// Gatsby mutates (...tm) the `internal` object, adding `owner`.
// This function helps "clean" the internal representation if we are readding/reusing the node
export const removeGatsbyInternalProps = (node: SanityNode | SanityInputNode): SanityInputNode => {
  if (!node || typeof node.internal === 'undefined') {
    return node
  }

  const {mediaType, type, contentDigest} = node.internal
  return {
    ...node,
    internal: {
      mediaType,
      type,
      contentDigest,
    },
  }
}
