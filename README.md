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
            type: 'Post',
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
            // nodes will be created with type = SanityAuthors
            groq: `*[_type == 'author']`
          }
        ]
      }
    }
  ]
  // ...
}
```

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
| (Query object) type | string  | `'Sanity' + query.name` | Used to name the collection inside GraphQL                                                                                               |

**PLEASE NOTE**: _All_ GROQ queries must contain the _id property as it'll be used as the internal ID for Gatsby's `createNode` function. Your build process will fail otherwise.

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

Sanity is an *API builder*, and for such, it's extremely hard to predict its data model: you can have all sorts of data types, with images nested 4 levels deep inside an object, for example. For such, **this plugin can't go far in shaping your nodes' format**.

If you need extra fields built right into the nodes, or deeply-nested images saved to your file system with `gatsby-source-filesystem`'s `createRemoteFileNode`, then your option is to process them in your `gatsby-node.js` file through the [onCreateNode](https://next.gatsbyjs.org/docs/node-apis/#onCreateNode) API.

*Please note:* Gatsby's `createNodeField` action attaches your new field inside a `fields` object in your node, so when you query for your data in GraphQL, you'll have to do so by calling `fields { [FIELD-NAME] }`. I recommend that you play around with Graphiql to understand the data format before building your front-end.

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

### Saving images to your filesystem

If you want to save images to the filesystem, you can use the `saveImages: true` option, but this will only work for those image objects nested in the root of fetched documents. If you need to save deeply nested images, you can either help me out figuring how to make it work with the plugin, or add them manually through your `gatsby-node.js` implementation.

If doing it on your own, you'll have to know exactly where in you Sanity data tree your images are in order to save them to the filesystem. Here's a suggested implementation:

_Reminder_: You can also [serve images through Sanity](#serving-images-through-sanity).

```js
// gatsby-node.js
const { createRemoteFileNode } = require(`gatsby-source-filesystem`);
const imageUrlBuilder = require("@sanity/image-url");

exports.onCreateNode = async ({ node, store, actions, cache, createNodeId }) => {
  const { createNode, touchNode } = actions;

  // Configuring the sanityClient
  const Sanity = sanityClient({
    projectId,
    dataset,
    useCdn,
  });
  if (node.internal.type === 'Post') {
    // In this example, the image we want to save is the
    // ogImage contained in the meta object and considering
    // we're fetching the whole image object, with _type and _asset
    const { ogImage } = node.meta;
    if (ogImage && ogImage.asset) {
      // Build the url preserving hotspot 'n all
      imageUrl = imageUrlBuilder(Sanity)
        .image(ogImage.asset)
        .url();

      // Check if media is already downloaded
      let fileNodeID;
      const mediaDataCacheKey = `sanity-media-${imageUrl}`;
      const cacheMediaData = await cache.get(mediaDataCacheKey);
      if (cacheMediaData) {
        fileNodeID = cacheMediaData.fileNodeID;
        touchNode({ nodeId: cacheMediaData.fileNodeID });
      }

      // If not yet cached, createRemoteFileNode
      if (!fileNodeID) {
        try {
          const fileNode = await createRemoteFileNode({
            url: imageUrl,
            store,
            cache,
            createNode,
            createNodeId
          });

          if (fileNode) {
            fileNodeID = fileNode.id;
            await cache.set(mediaDataCacheKey, { fileNodeID });
          }
        } catch (error) {
          console.error(`An image failed to be saved to internal storage: ${error}`)
        }
      }

      // will be available at fields.ogImage and will
      // work with gatsby-plugin-sharp out of the box
      if (fileNodeID) {
        createNodeField({
          node,
          name: 'ogImage',
          value: fileNode.id,
        })
      } else { throw "Couldn't download the requested media file" }
    }
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
- Better asset pipeline and file splitting (I've tried setting up Typescript and file bundling to no avail, if you can help out with this, it'd be awesome!)
- Run the `normalizeNode` function deeper in the structure of the data to be able to save every single image to disk
- Consider using ES6 classes to make client information universally available for all methods (not sure if gatsby-node would support this, though)
- Gather feedback for new functionalities if needed

## Credits

First and foremost, a huge thanks to the good people backing Sanity for bringing such a joy to my developer life with this amazing CMS.

As for the image-saving functionality, it was inspired heavily, at points copied, by [Nectum](https://github.com/nectum) at his [gatsby-source-test](https://github.com/nectum/GatsbyPluginTestBuilding/tree/master/plugins/gatsby-source-test) implementation.