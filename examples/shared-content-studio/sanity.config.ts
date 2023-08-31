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
              name: 'author',
              title: 'Author',
              type: 'crossDatasetReference',
              dataset: 'shared',
              to: [{type: 'author', preview: {select: {title: 'name'}}}],
            },
            {
              name: 'genres',
              title: 'Genre',
              type: 'array',
              of: [
                {
                  type: 'reference',
                  to: [{type: 'genre'}],
                }
              ]
            },
            {
              name: 'publisher',
              title: 'Publisher',
              type: 'reference',
              to: [{type: 'publisher'}],
            }
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
          ]
        })
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
          name: 'author',
          title: 'Author',
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
])
