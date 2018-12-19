# gatsby-source-sanity

Source plugin for pulling data from [Sanity.io](https://sanity.io) into [Gatsby](https://gatsbyjs.org) websites.

## Table of content

- [Basic Usage](#basic-usage)
- [Options](#options)
- [Credits](#credits)

## Basic usage

```
yarn add gatsby-source-sanity
# or
npm i gatsby-source-sanity --save
```

```js
// in your gatsby-config.js
module.exports = {
  // ...
  plugins: [
    {
      resolve: 'gatsby-source-sanity',
      options: {
        projectId: 'abc123',
        dataset: 'blog',
        token: process.env.MY_SANITY_TOKEN || 'my-token'
      }
    }
  ]
  // ...
}
```

At this point you can choose to [set up a GraphQL API](https://www.sanity.io/help/graphql-beta) for your Sanity dataset, if you have not done so already. This will help the plugin in knowing which types and fields exists, so you can query for them even without them being present in any current documents. It also helps create more sane names and types for the nodes in Gatsby.

Go through http://localhost:8000/___graphql after running `gatsby develop` to understand the created data and create a new query and checking available collections and fields by typing `CTRL + SPACE`.

## Options

| Options       | Type    | Default | Description                                                                                                                                    |
| ------------- | ------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| projectId     | string  |         | **[required]** Your Sanity project's ID                                                                                                        |
| dataset       | string  |         | **[required]** The dataset to fetch from                                                                                                       |
| token         | string  |         | Authentication token for fetching data from private datasets, or when using `overlayDrafts` [Learn more](https://www.sanity.io/docs/http-auth) |
| overlayDrafts | boolean | `false` | Set to `true` in order for drafts to replace their published version. By default, drafts will be skipped.                                      |

## Using .env variables

If you don't want to attach your Sanity project's ID to the repo, you can easily store it in .env files by doing the following:

```js
// In your .env file
SANITY_PROJECT_ID = abc123
SANITY_DATASET = production
SANITY_TOKEN = my-super-secret-token

// In your gatsby-config.js file
require('dotenv').config({
  path: `.env.${process.env.NODE_ENV}`
})

module.exports = {
  // ...
  plugins: [
    {
      resolve: 'gatsby-source-sanity',
      options: {
        projectId: process.env.SANITY_PROJECT_ID,
        dataset: process.env.SANITY_DATASET
        token: process.env.SANITY_TOKEN
        // ...
      }
    }
  ]
  // ...
}
```

This example is based off [Gatsby Docs' implementation](https://next.gatsbyjs.org/docs/environment-variables).

### Attaching a custom field to created nodes

The example below is for creating a slug field for your nodes.

```js
// gatsby-node.js
const slugify = require('slugify')

exports.onCreateNode = ({node, actions}) => {
  const {createNodeField} = actions

  // check if the internal type corresponds to the type passed
  // to the plugin in your gatsby-config.js
  if (node.internal.type === 'Post') {
    // the new field will be accessible as fields.slug
    createNodeField({
      node,
      name: 'slug',
      value: slugify(node.title, {lower: true})
    })
  }
}
```

## Credits

Huge thanks to [Henrique Cavalieri](https://github.com/hcavalieri) for doing the initial implementation of this plugin, and for donating it to the Sanity team. Mad props!

Big thanks to the good people backing Gatsby for bringing such a joy to our developer days!
