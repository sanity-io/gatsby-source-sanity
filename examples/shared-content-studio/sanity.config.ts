import {defineConfig, defineType} from 'sanity'
import {deskTool} from 'sanity/desk'
import {visionTool} from '@sanity/vision'

export default defineConfig([
  {
    name: 'books',
    basePath: '/books',

    projectId: 'jn1oq55b',
    dataset: 'production',

    plugins: [deskTool(), visionTool()],

    schema: {
      types: [
        defineType({
          name: 'bookMetadata',
          title: 'Book metadata',
          type: 'object' as const,
          fields: [
            {
              name: 'isbn',
              title: 'ISBN',
              type: 'string',
            },
          ],
        }),
        defineType({
          name: 'publisherReference',
          title: 'Publisher',
          type: 'reference' as const,
          to: [{type: 'publisher'}]
        }),
        defineType({
          name: 'authorReference',
          title: 'Author',
          type: 'crossDatasetReference' as const,
          dataset: 'shared',
          studioUrl: ({id, type}) => `/authors/desk/${type};${id}`,
          to: [{type: 'author', preview: {select: {title: 'name'}}}],
        }),
        defineType({
          name: 'authorOrEditorReference',
          title: 'Author or Editor',
          type: 'crossDatasetReference' as const,
          dataset: 'shared',
          studioUrl: ({id, type}) => `/authors/desk/${type};${id}`,
          to: [
            {type: 'author', preview: {select: {title: 'name'}}},
            {type: 'editor', preview: {select: {title: 'name'}}}
          ],
        }),
        defineType({
          name: 'book',
          title: 'Book',
          type: 'document' as const,
          fields: [
            {
              name: 'title',
              title: 'Title',
              type: 'string',
            },
            {
              name: 'cover',
              title: 'Cover',
              type: 'image',
            },
            {
              name: 'author',
              title: 'Author',
              description: 'as inline definition',
              type: 'crossDatasetReference' as const,
              dataset: 'shared',
              studioUrl: ({id, type}) => `/authors/desk/${type};${id}`,
              to: [{type: 'author', preview: {select: {title: 'name'}}}],
            },
            {
              name: 'authorOrEditorInline',
              title: 'Author or Editor',
              description: 'as inline definition',
              type: 'crossDatasetReference' as const,
              dataset: 'shared',
              studioUrl: ({id, type}) => `/authors/desk/${type};${id}`,
              to: [
                {type: 'author', preview: {select: {title: 'name'}}},
                {type: 'editor', preview: {select: {title: 'name'}}}
              ],
            },
            {
              name: 'authorOrEditor',
              description: 'as named type authorOrEditorReference',
              type: 'authorOrEditorReference',
            },
            {
              name: 'extraAuthor',
              title: 'Author',
              description: 'as named type authorReference',
              type: 'authorReference',
            },
            {
              name: 'coauthors',
              title: 'Coauthors',
              type: 'array',
              of: [{type: 'authorReference'}],
            },
            {
              name: 'mixedArray',
              type: 'array',
              of: [
                {type: 'bookMetadata'},
                {type: 'authorReference'},
                {type: 'reference', to: [{type: 'book'}]},
              ],
            },
            {
              name: 'genres',
              title: 'Genre',
              type: 'array',
              of: [
                {
                  type: 'reference',
                  to: [{type: 'genre'}],
                },
              ],
            },
            {
              name: 'publisher',
              title: 'Publisher',
              type: 'reference',
              to: [{type: 'publisher'}],
            },
            {
              name: 'extraPublisher',
              title: 'Publisher as publisherReference type',
              type: 'publisherReference',
            },
            {
              name: 'blurb',
              title: 'Blurb',
              type: 'array',
              of: [
                {
                  type: 'block',
                  of: [
                    {
                      type: 'authorReference',
                    },
                    {
                      type: 'reference',
                      to: [
                        {
                          type: 'publisher',
                        },
                      ],
                    },
                  ],
                },
                {
                  type: 'authorReference',
                },
                {
                  type: 'bookMetadata',
                },
              ],
            },
          ],
        }),
        defineType({
          name: 'genre',
          title: 'Genre',
          type: 'document' as const,
          fields: [
            {
              name: 'title',
              title: 'Title',
              type: 'string',
            },
          ],
        }),
        defineType({
          name: 'publisher',
          title: 'Publisher',
          type: 'document' as const,
          fields: [
            {
              name: 'name',
              title: 'Name',
              type: 'string',
            },
          ],
        }),
      ],
    },
  },
  {
    name: 'authors',
    basePath: '/authors',

    projectId: 'jn1oq55b',
    dataset: 'shared',

    plugins: [deskTool(), visionTool()],

    schema: {
      types: [
        defineType({
          name: 'editor',
          type: 'document' as const,
          fields: [
            {
              name: 'name',
              title: 'Name',
              type: 'string',
            }
          ],
        }),
        defineType({
          name: 'author',
          title: 'Author',
          type: 'document' as const,
          fields: [
            {
              name: 'name',
              title: 'Name',
              type: 'string',
            },
            {
              name: 'profilePicture',
              title: 'Profile picture',
              type: 'image',
            },
          ],
        }),
      ],
    },
  },
])
