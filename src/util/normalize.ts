import {set, startCase, camelCase, cloneDeep, upperFirst} from 'lodash'
import {extractWithPath} from '@sanity/mutator'
import {specifiedScalarTypes} from 'gatsby/graphql'
import {SanityDocument} from '../types/sanity'
import {safeId} from './documentIds'
import {unprefixDraftId} from './unprefixDraftId'
import {TypeMap} from './remoteGraphQLSchema'
import {
  GatsbyNodeIdCreator,
  GatsbyContentDigester,
  GatsbyNode,
  GatsbyNodeCreator,
  GatsbyParentChildLinker,
} from '../types/gatsby'

const scalarTypeNames = specifiedScalarTypes.map(def => def.name).concat(['JSON', 'Date'])

// Movie => SanityMovie
const typePrefix = 'Sanity'

// Node fields used internally by Gatsby.
export const RESTRICTED_NODE_FIELDS = ['id', 'children', 'parent', 'fields', 'internal']

export interface ProcessingOptions {
  typeMap: TypeMap
  createNode: GatsbyNodeCreator
  createNodeId: GatsbyNodeIdCreator
  createContentDigest: GatsbyContentDigester
  createParentChildLink: GatsbyParentChildLinker
  overlayDrafts: boolean
  skipCreate?: boolean
}

// Transform a Sanity document into a Gatsby node
export function processDocument(doc: SanityDocument, options: ProcessingOptions): GatsbyNode {
  const {createNode, createNodeId, createContentDigest, overlayDrafts, skipCreate} = options

  const rawAliases = getRawAliases(doc, options)
  const safe = prefixConflictingKeys(doc)
  const withRefs = rewriteNodeReferences(safe, options)
  const node = {
    ...withRefs,
    ...rawAliases,
    id: safeId(overlayDrafts ? unprefixDraftId(doc._id) : doc._id, createNodeId),
    parent: null,
    children: [],
    internal: {
      type: getTypeName(doc._type),
      contentDigest: createContentDigest(JSON.stringify(withRefs)),
    },
  }

  if (!skipCreate) {
    createNode(node)
  }

  return node
}

// movie => SanityMovie
// blog_post => SanityBlogPost
// sanity.imageAsset => SanityImageAsset
export function getTypeName(type: string) {
  if (!type) {
    return type
  }

  const typeName = startCase(type)
  if (scalarTypeNames.includes(typeName)) {
    return typeName
  }

  return `${typePrefix}${typeName.replace(/\s+/g, '').replace(/^Sanity/, '')}`
}

// {foo: 'bar', children: []} => {foo: 'bar', sanityChildren: []}
function prefixConflictingKeys(obj: SanityDocument) {
  // Will be overwritten, but initialize for type safety
  const initial: SanityDocument = {_id: '', _type: ''}

  return Object.keys(obj).reduce((target, key) => {
    if (RESTRICTED_NODE_FIELDS.includes(key)) {
      target[`${camelCase(typePrefix)}${upperFirst(key)}`] = obj[key]
    } else {
      target[key] = obj[key]
    }

    return target
  }, initial)
}

function getRawAliases(doc: SanityDocument, options: ProcessingOptions) {
  const {typeMap} = options
  const typeName = getTypeName(doc._type)
  const type = typeMap.objects[typeName]
  if (!type) {
    return {}
  }
  const initial: {[key: string]: any} = {}
  return Object.keys(type.fields).reduce((acc, fieldName) => {
    const field = type.fields[fieldName]
    const namedType = field.namedType.name.value
    if (field.aliasFor) {
      const aliasName = '_' + camelCase(`raw_data_${field.aliasFor}`)
      acc[aliasName] = doc[field.aliasFor]
      return acc
    }
    if (typeMap.scalars.includes(namedType)) {
      return acc
    }
    const aliasName = '_' + camelCase(`raw_data_${fieldName}`)
    acc[aliasName] = doc[fieldName]
    return acc
  }, initial)
}

// Tranform Sanity refs ({_ref: 'foo'}) to Gatsby refs ({_ref: 'someOtherId'})
function rewriteNodeReferences(doc: SanityDocument, options: ProcessingOptions) {
  const {createNodeId} = options

  const refs = extractWithPath('..[_ref]', doc)
  if (refs.length === 0) {
    return doc
  }

  const newDoc = cloneDeep(doc)
  refs.forEach(match => {
    set(newDoc, match.path, safeId(match.value, createNodeId))
  })

  return newDoc
}
