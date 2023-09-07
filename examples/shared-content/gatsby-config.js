/**
 * @type {import('gatsby').GatsbyConfig}
 */
module.exports = {
  plugins: [
    'gatsby-plugin-postcss',
    {
      resolve: 'gatsby-source-sanity',
      options: {
        projectId: 'jn1oq55b',
        dataset: 'production',
      },
      //typePrefix: 'prod',
    },
    {
      resolve: 'gatsby-source-sanity',
      options: {
        projectId: 'jn1oq55b',
        dataset: 'shared',
      },
      //typePrefix: 'shared',
    },
    `gatsby-plugin-image`,
  ],
}
