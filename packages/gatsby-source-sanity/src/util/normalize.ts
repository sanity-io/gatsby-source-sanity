import {Actions, NodePluginArgs} from 'gatsby'
import {extractWithPath} from '@sanity/mutator'
import {specifiedScalarTypes} from 'gatsby/graphql'
import {get, set, startCase, camelCase, cloneDeep, upperFirst} from 'lodash'
import {SanityDocument} from '../types/sanity'
import {safeId, unprefixId} from './documentIds'
import {TypeMap} from './remoteGraphQLSchema'
import {SanityInputNode} from '../types/gatsby'

import imageUrlBuilder from '@sanity/image-url'
import {SanityClient} from '@sanity/client'
import { typeNameIsReferenceType } from './resolveReferences'

const scalarTypeNames = specifiedScalarTypes.map((def) => def.name).concat(['JSON', 'Date'])

// Node fields used internally by Gatsby.
export const RESTRICTED_NODE_FIELDS = ['id', 'children', 'parent', 'fields', 'internal']

export interface ProcessingOptions {
  typeMap: TypeMap
  createNode: Actions['createNode']
  createNodeId: NodePluginArgs['createNodeId']
  createContentDigest: NodePluginArgs['createContentDigest']
  createParentChildLink: Actions['createParentChildLink']
  overlayDrafts: boolean
  client: SanityClient
  typePrefix?: string
}

// Transform a Sanity document into a Gatsby node
export function toGatsbyNode(doc: SanityDocument, options: ProcessingOptions): SanityInputNode {
  const {createNodeId, createContentDigest, overlayDrafts} = options

  const rawAliases = getRawAliases(doc, options)
  const safe = prefixConflictingKeys(doc, options.typePrefix)
  const withRefs = rewriteNodeReferences(safe, options)

  addInternalTypesToUnionFields(withRefs, options)

  const type = getTypeName(doc._type, options.typePrefix)
  const urlBuilder = imageUrlBuilder(options.client)

  const gatsbyImageCdnFields = [`SanityImageAsset`, `SanityFileAsset`].includes(type)
    ? {
        filename: withRefs.originalFilename,
        width: withRefs?.metadata?.dimensions?.width,
        height: withRefs?.metadata?.dimensions?.height,
        url: withRefs?.url,
        placeholderUrl:
          type === `SanityImageAsset`
            ? urlBuilder
                .image(withRefs.url)
                .width(20)
                .height(30)
                .quality(80)
                .url()
                // this makes placeholder urls dynamic in the gatsbyImage resolver
                ?.replace(`w=20`, `w=%width%`)
                ?.replace(`h=30`, `h=%height%`)
            : null,
      }
    : {}

  return {
    ...withRefs,
    ...rawAliases,
    ...gatsbyImageCdnFields,

    id: safeId(overlayDrafts ? unprefixId(doc._id) : doc._id, createNodeId),
    children: [],
    internal: {
      type,
      contentDigest: createContentDigest(JSON.stringify(withRefs)),
    },
  }
}

// movie => SanityMovie
// blog_post => SanityBlogPost
// sanity.imageAsset => SanityImageAsset
export function getTypeName(type: string, typePrefix: string | undefined) {
  if (!type) {
    return type
  }

  if (typePrefix && type.startsWith(typePrefix)) {
    return type
  }

  const typeName = startCase(type)
  if (scalarTypeNames.includes(typeName)) {
    return typeName
  }

  const sanitized = typeName.replace(/\s+/g, '')

  const prefix = `${typePrefix ?? ''}${sanitized.startsWith('Sanity') ? '' : 'Sanity'}`
  return sanitized.startsWith(prefix) ? sanitized : `${prefix}${sanitized}`
}

// {foo: 'bar', children: []} => {foo: 'bar', sanityChildren: []}
function prefixConflictingKeys(obj: SanityDocument, typePrefix: string | undefined) {
  // Will be overwritten, but initialize for type safety
  const initial: SanityDocument = {_id: '', _type: '', _rev: '', _createdAt: '', _updatedAt: ''}

  return Object.keys(obj).reduce((target, key) => {
    const targetKey = getConflictFreeFieldName(key, typePrefix)
    target[targetKey] = obj[key]

    return target
  }, initial)
}

export function getConflictFreeFieldName(fieldName: string, typePrefix: string | undefined) {
  return RESTRICTED_NODE_FIELDS.includes(fieldName)
    ? `${camelCase(typePrefix)}${upperFirst(fieldName)}`
    : fieldName
}

function getRawAliases(doc: SanityDocument, options: ProcessingOptions) {
  const {typeMap} = options
  const typeName = getTypeName(doc._type, options.typePrefix)
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
  refs.forEach((match) => {
    set(newDoc, match.path, safeId(match.value, createNodeId))
  })

  return newDoc
}
// Adds `internal: { type: 'TheTypeName' }` to union fields nodes, to allow runtime
// type resolution.
function addInternalTypesToUnionFields(doc: SanityDocument, options: ProcessingOptions) {
  const {typeMap} = options
  const types = extractWithPath('..[_type]', doc)

  const typeName = getTypeName(doc._type, options.typePrefix)
  const thisType = typeMap.objects[typeName]
  if (!thisType) {
    return
  }

  for (const type of types) {
    // Not needed for references or root objects
    
    if (typeNameIsReferenceType(type.value) || type.path.length < 2) {
      continue
    }

    //  extractWithPath returns integers to indicate array indices for list types
    const isListType = Number.isInteger(type.path[type.path.length - 2])

    //  For list types we need to go up an extra level to get the actual field name
    const parentOffset = isListType ? 3 : 2

    const parentNode =
      type.path.length === parentOffset ? doc : get(doc, type.path.slice(0, -parentOffset))
    const parentTypeName = getTypeName(parentNode._type, options.typePrefix)
    const parentType = typeMap.objects[parentTypeName]

    if (!parentType) {
      continue
    }

    const field = parentType.fields[type.path[type.path.length - parentOffset]]

    if (!field) {
      continue
    }

    const fieldTypeName = getTypeName(field.namedType.name.value, options.typePrefix)

    // All this was just to check if we're dealing with a union field
    if (!typeMap.unions[fieldTypeName]) {
      continue
    }
    const typeName = getTypeName(type.value, options.typePrefix)

    // Add the internal type to the field
    set(doc, type.path.slice(0, -1).concat('internal'), {type: typeName})
  }
}
