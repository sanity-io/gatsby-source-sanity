/**
 * Configure your Gatsby site with this file.
 *
 * See: https://www.gatsbyjs.com/docs/reference/config-files/gatsby-config/
 */

const path = require("path")
const pluginPath = path.resolve(
  __dirname,
  "../../packages/gatsby-source-sanity"
)

/**
 * @type {import('gatsby').GatsbyConfig}
 */
module.exports = {
  siteMetadata: {
    title: `Gatsby Default Starter`,
    description: `Kick off your next, great Gatsby project with this default starter. This barebones starter ships with the main Gatsby configuration files you might need.`,
    author: `@gatsbyjs`,
    siteUrl: `https://gatsbystarterdefaultsource.gatsbyjs.io/`,
  },
  plugins: [
    {
      resolve: pluginPath,
      options: {
        apiHost: "https://api.sanity.work",
        projectId: "rz9j51w2",
        dataset: "production",
      },
    },
    {
      resolve: pluginPath,
      options: {
        apiHost: "https://api.sanity.work",
        projectId: "rz9j51w2",
        dataset: "shared",
      },
    },
    `gatsby-plugin-image`,
  ],
}
