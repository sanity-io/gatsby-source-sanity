# gatsby-source-sanity

Source plugin for pulling data from [Sanity](https://sanity.io) into [Gatsby](https://gatsbyjs.org) websites.

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
        projectId: '123456',
        queries: [
          {
            name: 'posts',
            type: 'Post', // optional
            groq: `
              *[_type == 'post']{
                _id,
                title,
                body,
              }
            `
          },
          {
            name: 'authors',
            // For this case, without a type explicitly defined,
            // nodes will be created with type = sanityAuthor
            // and arrays with AllSanityAuthor
            groq: `*[_type == 'author']`
          }
        ]
      }
    }
  ]
  // ...
}
```

Go through http://localhost:8000/___graphql after running `gatsby develop` to understand the created data and create a new query and checking available collections and fields by typing `CTRL + SPACE`.

## Options

| Options             | Type    | Default                    | Description                                                                                    |
| ------------------- | ------- | -------------------------- | ---------------------------------------------------------------------------------------------- |
| projectId           | string  |                            | **[required]** Your Sanity project's ID                                                        |
| dataset             | string  | production                 | The dataset to fetch from (can be tied to an .env file as needed)                              |
| useCdn              | boolean | `true`                     | Whether to use Sanity's CDN or not. [Learn more](https://www.sanity.io/docs/api-cdn)           |
| saveImages              | boolean | `false`                     | Whether to save images to disk. [This has limitations, though](#saving-images-to-your-filesystem).           |
| queries             | array   |                            | **[required]** An array of objects that should contain the options below:                      |
| (Query object) name | string  |                            | **[required]**  The name of the query, vital for the plugin's functioning                                                    |
| (Query object) groq | string  |                            | **[required]** The actual [GROQ query](https://www.sanity.io/docs/data-store/how-queries-work). |
| (Query object) type | string  | `'sanity' + query.name` | Used to name the collection inside GraphQL                                                                                               |

**PLEASE NOTE**: _All_ GROQ queries must contain the _id property as it'll be used as the internal ID for Gatsby's `createNode` function. Your build process will fail otherwise.

## Saving images to your filesystem

⚠️ **This is an experimental feature, please report any bugs in the [issues](https://github.com/hcavalieri/gatsby-source-sanity/issues)**

If you want to save images to the filesystem, you can use the `saveImages: true` option, but this will only work for those image objects containing a `_type: 'image'` and an `asset` property. The plugin uses the package `@sanity/image-url` to create URLs for images that preserve hotspots, crops and so on. To avoid any errors in this process, the `asset` field should, ideally, be complete.

Here's a quick way of building your queries with images that will be processed correctly:

_Reminder_: You can also [serve images through Sanity](#serving-images-through-sanity).

```js
const imageField = 'image{ _type, asset-> }';
// By standardizing your image field query, you've
// got yourself a sure way of providing the correct
// data for the plugin to save images to the filesytem
const postsQuery = `
  *[_type == 'post']{
    _id,
    meta{
      ${imageField},
    },
    author->{
      name,
      excerpt,
      ${imageField},
    }
  }
`;
```

## Using .env variables

If you don't want to attach your Sanity project's ID to the repo, you can easily store it in .env files by doing the following:

```js
// In your .env file
SANITY_ID=123456
SANITY_DATASET=production

// In your gatsby-config.js file
require("dotenv").config({
    path: `.env.${process.env.NODE_ENV}`,
});

module.exports = {
  // ...
  plugins: [
    {
      resolve: 'gatsby-source-sanity',
      options: {
        projectId: process.env.SANITY_ID,
        dataset: process.env.SANITY_DATASET,
        // ...
      }
    }
  ]
  // ...
}
```

This example is based off [Gatsby Docs' implementation](https://next.gatsbyjs.org/docs/environment-variables).

## Storing your queries in an external file

Your GROQ queries will probably be long and complex, making it rather unruly to fit them all inside you `gatsby-config.js` file. What I recommend doing is creating an external `.js` file such as `sanityQueries.js` and export your queries from there. Here's an example:

```js
// In your ./sanityQueries.js
const metaQuery = `
	meta {
		"ogImage": ogImage.asset->.url,
		seoDescription,
		seoTitle,
		slug,
		title,
	}
`;

const postsQuery = `
  *[_type == 'post']{
    ${metaQuery.trim()},
    _id,
    body,
    author,
  }
`;

const authorsQuery = `
  *[_type == 'author']{
    _id,
    name,
    description,
    "photo": headshot.asset->.url,
  }
`;

module.exports = {
  postsQuery,
  authorsQuery,
}

// In your gatsby-config.js
const queries = require('./sanityNewQueries');

module.exports = {
  // ...
  plugins: [
    {
      resolve: 'gatsby-source-sanity',
      options: {
        // ...
        queries: [
          {
            name: 'posts',
            type: 'Post',
            groq: queries.postsQuery,
          },
          {
            name: 'authors',
            type: 'Author',
            groq: queries.authorsQuery,
          }
        ]
      }
    }
  ]
  // ...
}
```

## Plugin's shortcomings

Sanity is an *API builder*, and for such, it's extremely hard to predict its data model: you can have all sorts of data types, with fields nested 8 levels deep inside an object, for example. For such, **this plugin can't go far in shaping your nodes' format**.

If you need extra or modified fields built right into the nodes, your option is to process them in your `gatsby-node.js` file through the [onCreateNode](https://next.gatsbyjs.org/docs/node-apis/#onCreateNode) API.

*Please note:* Gatsby's `createNodeField` action attaches your new field inside a `fields` object in your node, so when you query for your data in GraphQL, you'll have to do so by calling `fields { [FIELD-NAME] }`. I recommend that you play around with GraphiQl to understand the data format before building your front-end.

### Attaching a custom field to created nodes

The example below is for creating a slug field for your nodes.

```js
// gatsby-node.js
const slugify = require('slugify');

exports.onCreateNode = ({ node, actions }) => {
  const { createNodeField } = actions;

  // check if the internal type corresponds to the type passed
  // to the plugin in your gatsby-config.js
  if (node.internal.type === 'Post') {
    // the new field will be accessible as fields.slug
    createNodeField({
      node,
      name: 'slug',
      value: slugify(node.title, { lower: true })
    })
  }
}
```

## Serving images through Sanity

Alternatively, you can use [Sanity's image-url library](https://www.npmjs.com/package/@sanity/image-url) and fetch images on the clientside through their `urlFor` function, that is quite powerful in transforming the files.

Then you can LazyLoad these images and manipulate them to the client's device and connection through the `urlFor` function's parameter. More info on this, visit [the package's npm page](https://www.npmjs.com/package/@sanity/image-url).

The downside of this approach is that you'd have to create lazy-loading components yourself (or use one from the community), and not have the magical blur / traced-SVG effect of the `gatsby-image` plugin.

## TODO

- Do a regEx test for the query names and types to avoid errors from Gatsby
- Test for bugs in different environments and data structures (**I have not tested this with Gatsby v1 or v0, yet!**)
- Better asset pipeline (I've tried setting up Typescript and file bundling to no avail, if you can help out with this, it'd be awesome!)
- Gather feedback for new functionalities if needed

## Credits

First and foremost, a huge thanks to the good people backing Sanity for bringing such a joy to my developer life with this amazing CMS.

As for the image-saving functionality, it was inspired heavily, at points copied, by [Nectum](https://github.com/nectum) at his [gatsby-source-test](https://github.com/nectum/GatsbyPluginTestBuilding/tree/master/plugins/gatsby-source-test) implementation.