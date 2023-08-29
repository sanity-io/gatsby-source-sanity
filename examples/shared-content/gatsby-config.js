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
    },
    {
      resolve: 'gatsby-source-sanity',
      options: {
        projectId: 'jn1oq55b',
        dataset: 'shared',
      },
    },
    `gatsby-plugin-image`,
  ],
}
