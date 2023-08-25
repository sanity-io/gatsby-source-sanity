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
    {
      resolve: 'gatsby-source-sanity',
      options: {
        // https://77i5ch25.api.sanity.io/v1/graphql/production/default
        projectId: '77i5ch25',
        dataset: 'production',
        token: 'skQKEn6900875oGYrSq2yrHfb87BYoYKiJiqj9FvNrPIbenbSewqGxGCDEfZ00eJul3sKsjVUhVqExxJOl8TwzSFnv29zbfFWBaG8qkWmKB60vpFvP7eobodxBEwHsK2ONub6i5VfNUUNJgg9w5GQZNBz0IPtGIXlIIqKLZmkEX1Lt5sB8P6',
        //typePrefix: 'runeb',
      },
    },
    `gatsby-plugin-image`,
  ],
}
