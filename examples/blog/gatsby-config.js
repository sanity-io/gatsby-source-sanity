/**
 * @type {import('gatsby').GatsbyConfig}
 */
module.exports = {
  plugins: [
    'gatsby-plugin-postcss',
    {
      resolve: 'gatsby-source-sanity',
      options: {
        // https://pv8y60vp.api.sanity.io/v1/graphql/production/default
        projectId: 'pv8y60vp',
        dataset: 'production',
      },
    },
  ],
}
