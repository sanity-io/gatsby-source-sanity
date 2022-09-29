import {Actions, NodePluginArgs} from 'gatsby'
import {extractWithPath} from '@sanity/mutator'
import {specifiedScalarTypes} from 'gatsby/graphql'
import {set, startCase, camelCase, cloneDeep, upperFirst} from 'lodash'
import {SanityDocument} from '../types/sanity'
import {safeId, unprefixId} from './documentIds'
import {TypeMap} from './remoteGraphQLSchema'
import {SanityInputNode} from '../types/gatsby'

import imageUrlBuilder from '@sanity/image-url'
import {SanityClient} from '@sanity/client'

const scalarTypeNames = specifiedScalarTypes.map((def) => def.name).concat(['JSON', 'Date'])

// Movie => SanityMovie
const typePrefix = 'Sanity'

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
}

// Transform a Sanity document into a Gatsby node
export function toGatsbyNode(doc: SanityDocument, options: ProcessingOptions): SanityInputNode {
  const {createNodeId, createContentDigest, overlayDrafts} = options

  const rawAliases = getRawAliases(doc, options)
  const safe = prefixConflictingKeys(doc)
  const withRefs = rewriteNodeReferences(safe, options)
  const type = getTypeName(doc._type)
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
  const initial: SanityDocument = {_id: '', _type: '', _rev: '', _createdAt: '', _updatedAt: ''}

  return Object.keys(obj).reduce((target, key) => {
    const targetKey = getConflictFreeFieldName(key)
    target[targetKey] = obj[key]

    return target
  }, initial)
}

export function getConflictFreeFieldName(fieldName: string) {
  return RESTRICTED_NODE_FIELDS.includes(fieldName)
    ? `${camelCase(typePrefix)}${upperFirst(fieldName)}`
    : fieldName
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
  refs.forEach((match) => {
    set(newDoc, match.path, safeId(match.value, createNodeId))
  })

  return newDoc
}
