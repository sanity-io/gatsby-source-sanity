import fs = require('fs')
import path = require('path')
import {getTypeMapFromGraphQLSchema} from '../src/util/remoteGraphQLSchema'

const sdl = fs.readFileSync(path.join(__dirname, 'fixtures', 'schemaSdl.graphql'), 'utf8')
const config = {projectId: 'abc123', dataset: 'blog', graphqlApi: 'default'}

test('generates reference field for references, list of documents', () => {
  const {exampleValues} = getTypeMapFromGraphQLSchema(sdl, config)

  // Basic fields
  expect(exampleValues.SanityAuthor).toHaveProperty('id', 'mock--abc123-blog-SanityAuthor')

  // Explicit reference fields (on root)
  expect(exampleValues.SanityAuthor).toHaveProperty(
    'favoriteWork___NODE',
    'mock--abc123-blog-SanityProject'
  )

  // Explicit reference fields (deep)
  expect(exampleValues.SanityAuthor).toHaveProperty(
    'profileImage.asset___NODE',
    'mock--abc123-blog-SanityImageAsset'
  )

  // List of references (implied by document member)
  expect(exampleValues.SanityAuthor).toHaveProperty('work___NODE')
})
