import {GatsbyNode} from '../types/gatsby'

// Gatsby mutates (...tm) the `internal` object, adding `owner`.
// This function helps "clean" the internal representation if we are readding/reusing the node
export const removeGatsbyInternalProps = (node: GatsbyNode): GatsbyNode => {
  if (!node || typeof node.internal === 'undefined') {
    return node
  }

  const {mediaType, type, contentDigest} = node.internal
  return {
    ...node,
    internal: {
      // TODO: Figure out what to set this to
      owner: ``,
      mediaType,
      type,
      contentDigest
    },
  }
}
