import {GatsbyNode} from '../types/gatsby'

export const removeGatsbyInternalProps = (node: GatsbyNode): GatsbyNode => {
  if (!node || typeof node.internal === 'undefined') {
    return node
  }

  const {mediaType, type, contentDigest} = node.internal
  return {
    ...node,
    internal: {mediaType, type, contentDigest}
  }
}
