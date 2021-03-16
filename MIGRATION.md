# Migration guide

## Migrate from `gatsby-source-sanity` `v6.x` to `v7.x`

Note: `gatsby-source-sanity` v7 requires Gatsby v3 or newer. See Gatsby's official [migration guide](https://www.gatsbyjs.com/docs/reference/release-notes/migrating-from-v2-to-v3/) for more details about how to migrate to Gatsby v3.

### Upgrade gatsby-source-sanity to v7.x

💡 In a rush? See [this commit](https://github.com/sanity-io/sanity-template-gatsby-portfolio/commit/7534bb67f9ec627431a4e62b352b02bb1e033fb6) for a real-world example of upgrading a project from Gatsby v2 to v3 (but bear in mind that this diff may not be directly translatable to the specifics of your project).

💡 If you get stuck, you can always join our helpful [Slack community](http://slack.sanity.io/) and ask for assistance in the `#gatsby` channel.

### Steps required:
- In the `dependencies` section of your project's `package.json`, upgrade `gatsby` to `^3.0.0` and `gatsby-source-sanity` to `^7.0.0`
- Add `"gatsby-plugin-image": "^1.0.0"` as a dependency to your `package.json`.
  Note: If your package json already has a dependency to `gatsby-image`, you should remove it and replace its usage with `gatsby-plugin-image` from source files. See [Gatsby's own migration guide for gatsby-plugin-image](https://www.gatsbyjs.com/docs/reference/release-notes/image-migration-guide/) for more details.
- Migrate usage of `get(Fluid|Fixed)GatsbyImage` from pre v7 of `gatsby-source-sanity` (see section below)

💡️ If you get peer dependency errors or warnings during `npm install` after finishing the steps above you may also need to update other Gatsby plugins to the version compatible with Gatsby v3. Refer to the documentation for the individual plugins on how to do this.

### Migrate from `getFluidGatsbyImage()` / `getFixedGatsbyImage()` to `getGatsbyImageData()`

The helper methods `getFluidGatsbyImage` and `getFixedGatsbyImage` have been removed in favor of `getGatsbyImageData()`, which is based on [`gatsby-plugin-image`](https://www.gatsbyjs.com/plugins/gatsby-plugin-image) and supports a number of cool new features and performance optimizations.

#### Before
```jsx
import React from "react"
import Img from "gatsby-image"
import {getFluidGatsbyImage} from "gatsby-source-sanity"
import clientConfig from "../../client-config"

export function MyImage({node}) {
  const fluidProps = getFluidGatsbyImage(
    node,
    {maxWidth: 675},
    clientConfig.sanity
  );
  return <Img fluid={fluidProps} />
}
```
#### After
```jsx
import React from 'react'
import {GatsbyImage} from 'gatsby-plugin-image'
import {getGatsbyImageData} from 'gatsby-source-sanity'
import clientConfig from '../../client-config'

export const MyImage = ({node}) => {
  const gatsbyImageData = getGatsbyImageData(
    node,
    {maxWidth: 675},
    clientConfig.sanity
  )
  return <GatsbyImage image={gatsbyImageData} />
}
```

Now you should be all set. Happy coding!
