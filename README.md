# gatsby-source-sanity

Source plugin for pulling data from [Sanity](https://sanity.io) into [Gatsby](https://gatsbyjs.org) websites.

## Table of content

- [Basic Usage](#basic-usage)
- [Options](#options)
- [Saving images to your filesystem](#saving-images-to-your-filesystem)
- [Using .env variables](#using-env-variables)
- [Storing your queries in an external file](#storing-your-queries-in-an-external-file)
- [Stringify fields](#stringify-fields)
- [Plugin's shortcomings](#plugins-shortcomings)
- [Serving images through Sanity](#serving-images-through-sanity)
- [Todo](#todo)
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
      resolve: "gatsby-source-sanity",
      options: {
        projectId: "123456",
        queries: [
          {
            name: "posts",
            type: "Post", // optional
            groq: `
              *[_type == 'post']{
                _id,
                title,
                body,
              }
            `
          },
          {
            name: "authors",
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
};
```

Go through http://localhost:8000/___graphql after running `gatsby develop` to understand the created data and create a new query and checking available collections and fields by typing `CTRL + SPACE`.

## Options

| Options             | Type    | Default                 | Description                                                                                                                                  |
| ------------------- | ------- | ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| projectId           | string  |                         | **[required]** Your Sanity project's ID                                                                                                      |
| dataset             | string  | production              | The dataset to fetch from (can be tied to an .env file as needed)                                                                            |
| token               | string  |                         | Authentication token for private datasets, leave blank if fetching from a public dataset. [Learn more](https://www.sanity.io/docs/http-auth) |
| stringifyPattern    | string  |                         | Key flag for field “stringification”, see more below                                                                                         |
| useCdn              | boolean | `true`                  | Whether to use Sanity's CDN or not. [Learn more](https://www.sanity.io/docs/api-cdn)                                                         |
| saveImages          | boolean | `false`                 | Whether to save images to disk. [This has limitations, though](#saving-images-to-your-filesystem).                                           |
| queries             | array   |                         | **[required]** An array of objects that should contain the options below:                                                                    |
| (Query object) name | string  |                         | **[required]** The name of the query, vital for the plugin's functioning                                                                     |
| (Query object) groq | string  |                         | **[required]** The actual [GROQ query](https://www.sanity.io/docs/data-store/how-queries-work).                                              |
| (Query object) type | string  | `'sanity' + query.name` | Used to name the collection inside GraphQL                                                                                                   |

**PLEASE NOTE**: _All_ GROQ queries must contain the \_id property as it'll be used as the internal ID for Gatsby's `createNode` function. Your build process will fail otherwise.

## Saving images to your filesystem

⚠️ **This is an experimental feature, please report any bugs in the [issues](https://github.com/hcavalieri/gatsby-source-sanity/issues)**

If you want to save images to the filesystem, you can use the `saveImages: true` option, but this will only work for those image objects containing a `_type: 'image'` and an `asset` property. The plugin uses the package `@sanity/image-url` to create URLs for images that preserve hotspots, crops and so on. To avoid any errors in this process, the `asset` field should, ideally, be complete.

Here's a quick way of building your queries with images that will be processed correctly:

_Reminder_: You can also [serve images through Sanity](#serving-images-through-sanity).

```js
const imageField = "image{ _type, asset-> }";
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
SANITY_ID = 123456;
SANITY_DATASET = production;

// In your gatsby-config.js file
require("dotenv").config({
  path: `.env.${process.env.NODE_ENV}`
});

module.exports = {
  // ...
  plugins: [
    {
      resolve: "gatsby-source-sanity",
      options: {
        projectId: process.env.SANITY_ID,
        dataset: process.env.SANITY_DATASET
        // ...
      }
    }
  ]
  // ...
};
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
  authorsQuery
};

// In your gatsby-config.js
const queries = require("./sanityNewQueries");

module.exports = {
  // ...
  plugins: [
    {
      resolve: "gatsby-source-sanity",
      options: {
        // ...
        queries: [
          {
            name: "posts",
            type: "Post",
            groq: queries.postsQuery
          },
          {
            name: "authors",
            type: "Author",
            groq: queries.authorsQuery
          }
        ]
      }
    }
  ]
  // ...
};
```

## Stringify fields

With Sanity [blocks](https://www.sanity.io/docs/schema-types/block-type) (rich content field), **the data structure coming out of a single block field is really hard to predict**, because it depends a lot on the content putted inside. Hard to predict means nearly impossible to use with Gatsby GraphQL query language (see #3).

For that reason and using the GROQ renaming feature, **you can flag those problematic fields** to stringify them with `JSON.stringify` and re-parse them inside of your page.

**gatsby-config.js**

```js
//...
{
  resolve: 'gatsby-source-sanity',
  options: {
    //...
    stringifyPattern: '_toString', // 👈 This one
  },
},
//...
```

**your-query.js**

```js
//...
groq: `
*[_type == 'article']{
  _id,
  title,
  "body_toString": body
}
`;
//...
```

**your-page.js** (_[`@sanity/block-content-to-react`](https://github.com/sanity-io/block-content-to-react) recommended_)

```js
import BlockContent from "@sanity/block-content-to-react";

const serializers = {
  types: {
    // custom types serialization, see @sanity/block-content-to-react doc
  }
};

export default function Article({ data }) {
  const article = data.article;
  return (
    <Layout>
      <h1>{article.title}</h1>
      <BlockContent
        blocks={JSON.parse(article.body_toString)} // 👈 Parsing happen here
        serializers={serializers}
      />
    </Layout>
  );
}

export const query = graphql`
  query articleQuery($slug: String!) {
    article(slug: { current: { eq: $slug } }) {
      id
      title
      body_toString
    }
  }
`;
```

## Plugin's shortcomings

Sanity is an _API builder_, and for such, it's extremely hard to predict its data model: you can have all sorts of data types, with fields nested 8 levels deep inside an object, for example. For such, **this plugin can't go far in shaping your nodes' format**.

If you need extra or modified fields built right into the nodes, your option is to process them in your `gatsby-node.js` file through the [onCreateNode](https://next.gatsbyjs.org/docs/node-apis/#onCreateNode) API.

_Please note:_ Gatsby's `createNodeField` action attaches your new field inside a `fields` object in your node, so when you query for your data in GraphQL, you'll have to do so by calling `fields { [FIELD-NAME] }`. I recommend that you play around with GraphiQl to understand the data format before building your front-end.

### Attaching a custom field to created nodes

The example below is for creating a slug field for your nodes.

```js
// gatsby-node.js
const slugify = require("slugify");

exports.onCreateNode = ({ node, actions }) => {
  const { createNodeField } = actions;

  // check if the internal type corresponds to the type passed
  // to the plugin in your gatsby-config.js
  if (node.internal.type === "Post") {
    // the new field will be accessible as fields.slug
    createNodeField({
      node,
      name: "slug",
      value: slugify(node.title, { lower: true })
    });
  }
};
```

## Serving images through Sanity

Alternatively, you can use [Sanity's image-url library](https://www.npmjs.com/package/@sanity/image-url) and fetch images on the clientside through their `urlFor` function, that is quite powerful in transforming the files.

Then you can LazyLoad these images and manipulate them to the client's device and connection through the `urlFor` function's parameter. More info on this, visit [the package's npm page](https://www.npmjs.com/package/@sanity/image-url).

The downside of this approach is that you'd have to create lazy-loading components yourself (or use one from the community), and not have the magical blur / traced-SVG effect of the `gatsby-image` plugin.

## TODO

- Do a regEx test for the query names and types to avoid errors from Gatsby
- Test for bugs in different environments and data structures (**I have not tested this with Gatsby v1 or v0, yet!**)
- Does it make sense to add unit testing or any other kind of automated testing? If so, how? Honestly, for me it's still unclear how to do so as we're connecting to an API that could spit out tons of different data structures.
- Organize the code - it's a mess right now and I'm sure we can shave off some execution time through better recursion usage
- Better Typescript type checking

## Credits

First and foremost, a huge thanks to the good people backing Sanity and Gatsby for bringing such a joy to my developer life with this amazing CMS.

As for the image-saving functionality, it was inspired heavily, at points copied, by [Nectum](https://github.com/nectum) at his [gatsby-source-test](https://github.com/nectum/GatsbyPluginTestBuilding/tree/master/plugins/gatsby-source-test) implementation.

The `striginfyPattern` option, [which makes working with Sanity's block content so much easier](https://github.com/hcavalieri/gatsby-source-sanity/issues/3) was put forward by [Yago Gouffon](https://github.com/Yago) (thanks for the great work!)
