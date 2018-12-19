import {set, unset, startCase, camelCase, cloneDeep} from 'lodash'
import {extractWithPath} from '@sanity/mutator'
import {GatsbyNodeIdCreator, GatsbyContentDigester, GatsbyNode} from '../types/gatsby'
import {SanityDocument} from '../types/sanity'

// Movie => SanityMovie
const typePrefix = 'Sanity'

// Node fields used internally by Gatsby.
const RESTRICTED_NODE_FIELDS = ['id', 'children', 'parent', 'fields', 'internal']

interface ProcessingOptions {
  createNodeId: GatsbyNodeIdCreator
  createContentDigest: GatsbyContentDigester
  overlayDrafts: boolean
}

// Transform a Sanity document into a Gatsby node
export function processDocument(doc: SanityDocument, options: ProcessingOptions): GatsbyNode {
  const {createNodeId, createContentDigest, overlayDrafts} = options
  const safe = prefixConflictingKeys(doc)
  const withRefs = makeNodeReferences(safe, createNodeId)

  return {
    ...withRefs,
    id: createNodeId(overlayDrafts ? unprefixDraftId(doc._id) : doc._id),
    parent: null,
    children: [],
    internal: {
      mediaType: 'application/json',
      type: getTypeName(doc._type),
      contentDigest: createContentDigest(JSON.stringify(withRefs))
    }
  }
}

function unprefixDraftId(id: string) {
  return id.replace(/^drafts\./, '')
}

// movie => SanityMovie
// blog_post => SanityBlogPost
// sanity.imageAsset => SanityImageAsset
export function getTypeName(type: string) {
  return `${typePrefix}${startCase(type)
    .replace(/\s+/g, '')
    .replace(/^Sanity/, '')}`
}

// {foo: 'bar', children: []} => {foo: 'bar', sanityChildren: []}
function prefixConflictingKeys(obj: SanityDocument) {
  // Will be overwritten, but initialize for type safety
  const initial: SanityDocument = {_id: '', _type: ''}

  return Object.keys(obj).reduce((target, key) => {
    if (RESTRICTED_NODE_FIELDS.includes(key)) {
      target[camelCase(`${typePrefix}${key}`)] = obj[key]
    } else {
      target[key] = obj[key]
    }

    return target
  }, initial)
}

// Tranform Sanity refs ({_ref: 'foo'}) to Gatsby refs (field___NODE: 'foo')
// {author: {_ref: 'grrm'}} => {author___NODE: 'someNodeIdFor-grrm'}
function makeNodeReferences(doc: SanityDocument, createNodeId: GatsbyNodeIdCreator) {
  const refs = extractWithPath('..[_ref]', doc)
  if (refs.length === 0) {
    return doc
  }

  const newDoc = cloneDeep(doc)
  refs.forEach(match => {
    const path = match.path.slice(0, -1)
    const key = path[path.length - 1]
    const refPath = path.slice(0, -1).concat(`${key}___NODE`)
    const referencedId = createNodeId(match.value)
    unset(newDoc, path)
    set(newDoc, refPath, referencedId)
  })

  return newDoc
}
