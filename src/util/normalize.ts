import {get, set, unset, startCase, camelCase, cloneDeep, isPlainObject, upperFirst} from 'lodash'
import {extractWithPath} from '@sanity/mutator'
import {specifiedScalarTypes} from 'gatsby/graphql'
import {SanityDocument} from '../types/sanity'
import {TypeMap} from './remoteGraphQLSchema'
import {
  GatsbyNodeIdCreator,
  GatsbyContentDigester,
  GatsbyNode,
  GatsbyNodeCreator,
  GatsbyParentChildLinker
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

interface HoistContext {
  hoistedNodes: object[]
  path: string[]
}

// Transform a Sanity document into a Gatsby node
export function processDocument(doc: SanityDocument, options: ProcessingOptions): GatsbyNode {
  const {
    createNode,
    createNodeId,
    createParentChildLink,
    createContentDigest,
    overlayDrafts,
    skipCreate
  } = options

  const hoistedNodes: object[] = []
  const rawAliases = getRawAliases(doc, options)
  const safe = prefixConflictingKeys(doc)
  const hoisted = hoistMixedArrays(safe, options, {hoistedNodes, path: [doc._id]})
  const withRefs = makeNodeReferences(hoisted, options)
  const node = {
    ...withRefs,
    ...rawAliases,
    id: createNodeId(overlayDrafts ? unprefixDraftId(doc._id) : doc._id),
    parent: null,
    children: [],
    internal: {
      mediaType: 'application/json',
      type: getTypeName(doc._type),
      contentDigest: createContentDigest(JSON.stringify(withRefs))
    }
  }

  if (!skipCreate) {
    createNode(node)

    hoistedNodes.forEach(childNode => {
      const child = childNode as GatsbyNode
      createNode(child)
      createParentChildLink({parent: node, child})
    })
  }

  return node
}

// `drafts.foo-bar` => `foo.bar`
function unprefixDraftId(id: string) {
  return id.replace(/^drafts\./, '')
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

// Transform arrays with both inline objects and references into just references,
// adding gatsby child nodes as needed
// {body: [{_ref: 'grrm'}, {_type: 'book', name: 'Game of Thrones'}]}
// =>
// {body: [{_ref: 'grrm'}, {_ref: 'someNode'}]}
function hoistMixedArrays(obj: any, options: ProcessingOptions, context: HoistContext): any {
  const {createNodeId, createContentDigest, overlayDrafts} = options
  const {hoistedNodes, path} = context

  if (isPlainObject(obj)) {
    const initial: {[key: string]: any} = {}
    return Object.keys(obj).reduce((acc, key) => {
      // Skip raw aliases
      if (key.startsWith('_raw')) {
        return acc
      }

      acc[key] = hoistMixedArrays(obj[key], options, {...context, path: path.concat(key)})
      return acc
    }, initial)
  }

  if (Array.isArray(obj)) {
    let hasRefs = false
    let hasNonRefs = false

    // First, let's make sure we handle deeply nested structures
    const hoisted = obj.map((item, index) => {
      hasRefs = hasRefs || (item && item._ref)
      hasNonRefs = hasNonRefs || (item && !item._ref)
      return hoistMixedArrays(item, options, {...context, path: path.concat(`${index}`)})
    })

    const hasMixed = hasRefs && hasNonRefs
    if (!hasMixed) {
      return hoisted
    }

    // Now let's hoist non-ref nodes
    return hoisted.map((item, index) => {
      if (!item || item._ref) {
        return item
      }

      const safe = prefixConflictingKeys(item)
      const withRefs = makeNodeReferences(safe, options)
      const rawId = path.concat(`${index}`).join('>')
      const id = createNodeId(rawId)
      const parent = createNodeId(overlayDrafts ? unprefixDraftId(path[0]) : path[0])
      const childNode = {
        ...withRefs,
        id,
        parent,
        children: [],
        internal: {
          mediaType: 'application/json',
          type: getTypeName(item._type), // @todo what if it doesnt have a type
          contentDigest: createContentDigest(JSON.stringify(withRefs))
        }
      }

      hoistedNodes.push(childNode)
      return {_ref: rawId}
    })
  }

  return obj
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

// Tranform Sanity refs ({_ref: 'foo'}) to Gatsby refs (field___NODE: 'foo')
// {author: {_ref: 'grrm'}} => {author___NODE: 'someNodeIdFor-grrm'}
function makeNodeReferences(doc: SanityDocument, options: ProcessingOptions) {
  const {createNodeId} = options

  const refs = extractWithPath('..[_ref]', doc)
  if (refs.length === 0) {
    return doc
  }

  const newDoc = cloneDeep(doc)
  refs.forEach(match => {
    const path = match.path.slice(0, -1)
    const key = path[path.length - 1]
    const isArrayIndex = typeof key === 'number'
    const referencedId = createNodeId(match.value)

    if (isArrayIndex) {
      const arrayPath = path.slice(0, -1)
      const field = path[path.length - 2]
      const nodePath = path.slice(0, -2).concat(`${field}___NODE`)
      const refPath = nodePath.concat(key)
      set(newDoc, nodePath, get(newDoc, nodePath, get(newDoc, arrayPath)))
      set(newDoc, refPath, referencedId)
      unset(newDoc, arrayPath)
    } else {
      const refPath = path.slice(0, -1).concat(`${key}___NODE`)
      unset(newDoc, path)
      set(newDoc, refPath, referencedId)
    }
  })

  return newDoc
}
