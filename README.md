# gatsby-source-sanity

Source plugin for pulling data from [Sanity.io](https://www.sanity.io/) into [Gatsby](https://www.gatsbyjs.org/) websites. Develop with real-time preview of all content changes. Compatible with `gatsby-image`. Uses your project's GraphQL schema definitions to avoid accidental missing fields (no dummy-content needed).

Get up and running in minutes with a fully configured starter project:

- [Blog with Gatsby](https://www.sanity.io/create?template=sanity-io/sanity-template-gatsby-blog)
- [Portfolio with Gatsby](https://www.sanity.io/create?template=sanity-io/sanity-template-gatsby-portfolio).

[![Watch a video about the company website built with Gatsby using Sanity.io as a headless CMS](https://cdn.sanity.io/images/3do82whm/production/4f652e6d114e7010aa633b81cbcb97c335980fc8-1920x1080.png?w=500)](https://www.youtube.com/watch?v=STtpXBvJmDA)

## Table of contents

- [Install](#install)
- [Basic usage](#basic-usage)
- [Options](#options)
- [Preview of unpublished content](#preview-of-unpublished-content)
- [GraphQL API](#graphql-api)
- [Using images](#using-images)
  - [Usage outside of GraphQL](#using-images-outside-of-graphql)
- [Generating pages](#generating-pages)
- ["Raw" fields](#raw-fields)
- [Portable Text / Block Content](#portable-text--block-content)
- [Real-time content preview with watch mode](#real-time-content-preview-with-watch-mode)
- [Updating content for editors with preview servers](#updating-content-for-editors-with-preview-servers)
- [Using .env variables](#using-env-variables)
- [How this plugin works](#how-this-source-plugin-works)
- [Credits](#credits)

[See the getting started video](https://www.youtube.com/watch?v=qU4lFYp3KiQ)

## Install

From the command line, use npm (node package manager) to install the plugin:

```console
npm install gatsby-source-sanity
```

⚠️ Warning: if using Gatsby v4, make sure you've installed version 7.1.0 or higher.

In the `gatsby-config.js` file in the Gatsby project's root directory, add the plugin configuration inside of the `plugins` section:

```js
module.exports = {
  // ...
  plugins: [
    {
      resolve: `gatsby-source-sanity`,
      options: {
        projectId: `abc123`,
        dataset: `blog`,
        // a token with read permissions is required
        // if you have a private dataset
        token: process.env.SANITY_TOKEN,

        // If the Sanity GraphQL API was deployed using `--tag <name>`,
        // use `graphqlTag` to specify the tag name. Defaults to `default`.
        graphqlTag: 'default',
      },
    },
    // ...
  ],
  // ...
}
```

You can access `projectId` and `dataset` by executing `sanity debug --secrets` in the Sanity studio folder. Note that the token printed may be used for development, but is tied to your Sanity CLI login session using your personal Sanity account - make sure to keep it secure and not include it in version control! For production, you'll want to make sure you use a read token generate in the Sanity [management interface](https://manage.sanity.io/).

## Basic usage

At this point you should [set up a GraphQL API](https://www.sanity.io/docs/graphql) for your Sanity dataset, if you have not done so already. This will help the plugin in knowing which types and fields exists, so you can query for them even without them being present in any current documents.

**You should redeploy the GraphQL API everytime you make changes to the schema that you want to use in Gatsby by running `sanity graphql deploy` from within your Sanity project directory**

Explore http://localhost:8000/\_\_\_graphql after running `gatsby develop` to understand the created data and create a new query and checking available collections and fields by typing `CTRL + SPACE`.

## Options

| Options         | Type    | Default   | Description                                                                                                                                                        |
| --------------- | ------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| projectId       | string  |           | **[required]** Your Sanity project's ID                                                                                                                            |
| dataset         | string  |           | **[required]** The dataset to fetch from                                                                                                                           |
| token           | string  |           | Authentication token for fetching data from private datasets, or when using `overlayDrafts` [Learn more](https://www.sanity.io/docs/http-auth)                     |
| graphqlTag      | string  | `default` | If the Sanity GraphQL API was deployed using `--tag <name>`, use this to specify the tag name.                                                                     |
| overlayDrafts   | boolean | `false`   | Set to `true` in order for drafts to replace their published version. By default, drafts will be skipped.                                                          |
| watchMode       | boolean | `false`   | Set to `true` to keep a listener open and update with the latest changes in realtime. If you add a `token` you will get all content updates down to each keypress. |
| watchModeBuffer | number  | `150`     | How many milliseconds to wait on watchMode changes before applying them to Gatsby's GraphQL layer. Introduced in 7.2.0.                                            |

## Preview of unpublished content

Sometimes you might be working on some new content that is not yet published, which you want to make sure looks alright within your Gatsby site. By setting the `overlayDrafts` setting to `true`, the draft versions will as the option says "overlay" the regular document. In terms of Gatsby nodes, it will _replace_ the published document with the draft.

Keep in mind that drafts do not have to conform to any validation rules, so your frontend will usually want to double-check all nested properties before attempting to use them.

## GraphQL API

By [deploying a GraphQL API](https://www.sanity.io/docs/graphql) for your dataset, we are able to introspect and figure out which schema types and fields are available and make informed choices based on this information.

Previous versions did not _require_ this, but often lead to very confusing and unpredictable behavior, which is why we have now made it a requirement.

## Using images

Image fields will have the image URL available under the `field.asset.url` key, but you can also use [gatsby-plugin-image](https://github.com/gatsbyjs/gatsby/tree/master/packages/gatsby-plugin-image) for a smooth experience. It's a React component that enables responsive images and advanced image loading techniques. It works great with this source plugin, without requiring any additional build steps.

```js
import React from 'react'
import {GatsbyImage} from 'gatsby-plugin-image'

const sanityConfig = {projectId: 'abc123', dataset: 'blog'}

const Person = ({data}) => {
  return (
    <article>
      <h2>{data.sanityPerson.name}</h2>
      <GatsbyImage image={data.sanityPerson.profileImage.asset.gatsbyImageData} />
    </article>
  )
}

export default Person

export const query = graphql`
  query PersonQuery {
    sanityPerson {
      name
      profileImage {
        asset {
          gatsbyImageData(fit: FILLMAX, placeholder: BLURRED)
        }
      }
    }
  }
`
```

**Note**: we currently [don't support the `format` option of `gatsbyImageData`](https://github.com/sanity-io/gatsby-source-sanity/issues/134#issuecomment-951876221). Our image CDN automatically serves the best format for the user depending on their device, so you don't need to define formats manually.

### Using Gatsby's Image CDN (beta)

This plugin supports [Gatsby's new Image CDN feature](https://gatsby.dev/img). To use it, follow the instructions in the section above, but substitute the `gatsbyImageData` field for `gatsbyImage`.

### Using images outside of GraphQL

If you are using the raw fields, or simply have an image asset ID you would like to use gatsby-plugin-image for, you can import and call the utility function `getGatsbyImageData`

```jsx
import {GatsbyImage} from 'gatsby-plugin-image'
import {getGatsbyImageData} from 'gatsby-source-sanity'

const sanityConfig = {projectId: 'abc123', dataset: 'blog'}
const imageAssetId = 'image-488e172a7283400a57e57ffa5762ac3bd837b2ee-4240x2832-jpg'

const imageData = getGatsbyImageData(imageAssetId, {maxWidth: 1024}, sanityConfig)

<GatsbyImage image={imageData} />
```

## Generating pages

Sanity does not have any concept of a "page", since it's built to be totally agnostic to how you want to present your content and in which medium, but since you're using Gatsby, you'll probably want some pages!

As with any Gatsby site, you'll want to create a `gatsby-node.js` in the root of your Gatsby site repository (if it doesn't already exist), and declare a `createPages` function. Within it, you'll use GraphQL to query for the data you need to build the pages.

For instance, if you have a `project` document type in Sanity that you want to generate pages for, you could do something along the lines of this:

```js
exports.createPages = async ({graphql, actions}) => {
  const {createPage} = actions

  const result = await graphql(`
    {
      allSanityProject(filter: {slug: {current: {ne: null}}}) {
        edges {
          node {
            title
            description
            tags
            launchDate(format: "DD.MM.YYYY")
            slug {
              current
            }
            image {
              asset {
                url
              }
            }
          }
        }
      }
    }
  `)

  if (result.errors) {
    throw result.errors
  }

  const projects = result.data.allSanityProject.edges || []
  projects.forEach((edge, index) => {
    const path = `/project/${edge.node.slug.current}`

    createPage({
      path,
      component: require.resolve('./src/templates/project.js'),
      context: {slug: edge.node.slug.current},
    })
  })
}
```

The above query will fetch all projects that have a `slug.current` field set, and generate pages for them, available as `/project/<project-slug>`. It will use the template defined in `src/templates/project.js` as the basis for these pages.

Most [Gatsby starters](https://www.gatsbyjs.org/starters/?v=2) have some example of building pages, which you should be able to modify to your needs.

Remember to use the GraphiQL interface to help write the queries you need - it's usually running at http://localhost:8000/\_\_\_graphql while running `gatsby develop`.

## "Raw" fields

Arrays and object types at the root of documents will get an additional "raw JSON" representation in a field called `_raw<FieldName>`. For instance, a field named `body` will be mapped to `_rawBody`. It's important to note that this is only done for top-level nodes (documents).

Quite often, you'll want to replace reference fields (eg `_ref: '<documentId>'`), with the actual document that is referenced. This is done automatically for regular fields, but within raw fields, you have to explicitly enable this behavior, by using the field-level `resolveReferences` argument:

```graphql
{
  allSanityProject {
    edges {
      node {
        _rawTasks(resolveReferences: {maxDepth: 5})
      }
    }
  }
}
```

## Portable Text / Block Content

Rich text in Sanity is usually represented as [Portable Text](https://www.portabletext.org/) (previously known as "Block Content").

These data structures can be deep and a chore to query (specifying all the possible fields). As [noted above](#raw-fields), there is a "raw" alternative available for these fields which is usually what you'll want to use.

You can install [@portabletext/react](https://www.npmjs.com/package/@portabletext/react) from npm and use it in your Gatsby project to serialize Portable Text. It lets you use your own React components to override defaults and render custom content types. [Learn more about Portable Text in our documentation](https://www.sanity.io/docs/content-studio/what-you-need-to-know-about-block-text).

## Real-time content preview with watch mode

While developing, it can often be beneficial to get updates without having to manually restart the build process. By setting `watchMode` to true, this plugin will set up a listener which watches for changes. When it detects a change, the document in question is updated in real-time and will be reflected immediately.

If you add [a `token` with read rights](https://www.sanity.io/docs/http-auth#robot-tokens) and set `overlayDrafts` to true, each small change to the draft will immediately be applied. Keep in mind that this is mainly intended for development, see next section for how to enable previews for your entire team.

## Updating content for editors with preview servers

You can use [Gatsby preview servers](https://www.gatsbyjs.com/docs/how-to/local-development/running-a-gatsby-preview-server) (often through [Gatsby Cloud](https://www.gatsbyjs.com/products/cloud/)) to update your content on a live URL your team can use.

In order to have previews working, you'll need to activate `overlayDrafts` in the plugin's configuration inside preview environments. To do so, we recommend following a pattern similar to this:

```js
// In gatsby-config.js

const isProd = process.env.NODE_ENV === "production"
const previewEnabled = (process.env.GATSBY_IS_PREVIEW || "false").toLowerCase() === "true"

module.exports = {
  // ...
  plugins: [
    resolve: "gatsby-source-sanity",
    options: {
      // ...
      watchMode: !isProd, // watchMode only in dev mode
      overlayDrafts: !isProd || previewEnabled, // drafts in dev & Gatsby Cloud Preview
    },
  ]
}
```

Then, you'll need to set-up a Sanity webhook pointing to your Gatsby preview URL. Create your webhook from **[this template](https://www.sanity.io/manage/webhooks/share?name=Gatsby+Cloud+Preview&description=Find+more+information+here%3A+https%3A%2F%2Fwww.notion.so%2Fsanityio%2FGatsby-Cloud-previews-with-Sanity-s-Webhooks-v2-c3c1abad37f743febc17cd4e0b81431c&url=GATSBY_PREVIEW_WEBHOOK_URL&on=create&on=update&on=delete&filter=&projection=select%28delta%3A%3Aoperation%28%29+%3D%3D+%22delete%22+%3D%3E+%7B%0A++%22operation%22%3A+delta%3A%3Aoperation%28%29%2C%0A++%22documentId%22%3A+coalesce%28before%28%29._id%2C+after%28%29._id%29%2C%0A++%22projectId%22%3A+sanity%3A%3AprojectId%28%29%2C%0A++%22dataset%22%3A+sanity%3A%3Adataset%28%29%2C%0A%7D%2C+%7B%7D%29&httpMethod=POST&apiVersion=v2021-03-25&includeDrafts=true)**, making sure you update the URL.

If using Gatsby Cloud, this should be auto-configured during your initial set-up.

⚠️ **Warning:** if you have Gatsby Cloud previews v1 enabled on your site, you'll need to reach out to their support for enabling an upgrade. The method described here only works with the newer "Incremental CMS Preview", webhook-based system.

---

You can also follow the manual steps below:

1. Get the webhook endpoint needed for triggering Gatsby Cloud previews in [their dashboard](https://www.gatsbyjs.com/dashboard/).
2. Go to [sanity.io/manage](http://sanity.io/manage) and navigate to your project
3. Under the "API" tab, scroll to Webhooks or "GROQ-powered webhooks"
4. Add a new webhook and name it as you see fit
5. Choose the appropriate dataset and add the Gatsby Cloud webhook endpoint to the URL field
6. Keep the HTTP method set to POST, skip "HTTP Headers"
7. Set the hook to trigger on Create, Update and Delete
8. Skip the filter field
9. Specify the following projection:

   ```jsx
   select(delta::operation() == "delete" => {
     "operation": delta::operation(),
     "documentId": coalesce(before()._id, after()._id),
     "projectId": sanity::projectId(),
     "dataset": sanity::dataset(),
   }, {})
   ```

10. Set the API version to `v2021-03-25`
11. And set it to fire on drafts
12. Save the webhook

## Using .env variables

If you don't want to attach your Sanity project's ID to the repo, you can easily store it in .env files by doing the following:

```js
// In your .env file
SANITY_PROJECT_ID = abc123
SANITY_DATASET = production
SANITY_TOKEN = my_super_secret_token

// In your gatsby-config.js file
require('dotenv').config({
  path: `.env.${process.env.NODE_ENV}`,
})

module.exports = {
  // ...
  plugins: [
    {
      resolve: 'gatsby-source-sanity',
      options: {
        projectId: process.env.SANITY_PROJECT_ID,
        dataset: process.env.SANITY_DATASET,
        token: process.env.SANITY_TOKEN,
        // ...
      },
    },
  ],
  // ...
}
```

This example is based off [Gatsby Docs' implementation](https://www.gatsbyjs.org/docs/environment-variables/).

## How this source plugin works

When starting Gatsby in development or building a website, the source plugin will first fetch the GraphQL Schema Definitions from a Sanity deployed GraphQL API. The source plugin uses this to tell Gatsby which fields should be available to prevent it from breaking if the content for certain fields happens to disappear. Then it will hit the project’s export endpoint, which streams all the accessible documents to Gatsby’s in-memory datastore.

In other words, the whole site is built with two requests. Running the development server, will also set up a listener that pushes whatever changes come from Sanity to Gatsby in real-time, without doing additional API queries. If you give the source plugin a token with permission to read drafts, you’ll see the changes instantly. This can also be experienced with [Gatsby Preview](https://www.gatsbyjs.com/preview/).

## Credits

Huge thanks to [Henrique Doro](https://github.com/hdoro) for doing the initial implementation of this plugin, and for donating it to the Sanity team. Mad props!

Big thanks to the good people backing Gatsby for bringing such a joy to our developer days!
