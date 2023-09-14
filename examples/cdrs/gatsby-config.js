/**
 * Configure your Gatsby site with this file.
 *
 * See: https://www.gatsbyjs.com/docs/reference/config-files/gatsby-config/
 */

const path = require('path')
const pluginPath = path.resolve(__dirname, '../../packages/gatsby-source-sanity')
const productionSchemaPath = path.resolve(__dirname, './production.graphql')

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
        _mocks: {
          // We mock the gql schema to include future @cdr directives
          schemaPath: productionSchemaPath,
        },
        projectId: 'jn1oq55b',
        dataset: 'production',
      }
    },
    {
      resolve: pluginPath,
      options: {
        projectId: 'jn1oq55b',
        dataset: 'shared',
      }
    },
    `gatsby-plugin-image`,
  ],
}
