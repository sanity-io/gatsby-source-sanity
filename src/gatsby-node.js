// Data normalizing heavily inspired by Nectum at:
// https://github.com/nectum/GatsbyPluginTestBuilding/blob/master/plugins/gatsby-source-test/normalize.js
// He, in turn, credits angeloashmore at:
// https://github.com/angeloashmore/gatsby-source-prismic/blob/master/src/normalize.js


const crypto = require('crypto');
const sanityClient = require('@sanity/client');
const imageUrlBuilder = require("@sanity/image-url");

const helpers = require('./helpers');
const fetchData = require('./fetch');
const normalizeNode = require('./normalize');

exports.sourceNodes = async ({ actions, cache, store, createNodeId }, configOptions) => {
  const { createNode, touchNode } = actions;
  const { projectId, dataset = 'production', useCdn = true, saveImages = false, queries } = configOptions;

  if (!projectId) {
    throw new Error ("No ID found for your Sanity project!");
  } else if (!queries || !queries[0]) {
    throw new Error ("Please add the queries to be fetched from Sanity");
  }

  // Configuring the sanityClient
  const Sanity = sanityClient({
    projectId,
    dataset,
    useCdn,
  });
  const builder = imageUrlBuilder(Sanity);

  const urlFor = asset => builder.image(asset);

  // Fetching data through the ./fetchData.ts module
  const data = await fetchData(queries, Sanity);

  if (data) {
    // For each query listed in the config, loop through
    // the array inside the data object that contains a key
    // equivalent to the query name and create a node from there
    if (saveImages) {
      console.time(helpers.colorizeLog('\nSanity images saved to disk in'));
    }
    for (const query of queries) {
      if (query.name && data[query.name]) {
        for (const node of data[query.name]) {
          // Provide helpful error in case the user
          // fetches a non-object node as these can't
          // be translated into nodes for Gatsby
          if (typeof node !== 'object') {
            console.warn(`${
              typeof node == 'string' ?
                `${node.substr(0, 10)}...`
                : 'A node'
              } is not an object. It will not be parsed into a new node`);
            continue
          }

          if (!node._id) {
            throw new Error("Every query should fetch the _id property to be used internally by Gatsby")
          }

          let finalNode = node;
          if (saveImages) {
            finalNode = await normalizeNode(
              node,
              { urlFor, cache, store, touchNode, createNodeId, createNode }
            );
          }

          const type = query.type || `Sanity${helpers.capitalizeFirstLetter(query.name)}`;
          createNode({
            ...finalNode,

            // mandatory fields
            id: finalNode._id,
            parent: null,
            children: [],
            internal: {
              type,
              contentDigest: crypto
                .createHash(`md5`)
                .update(JSON.stringify(finalNode))
                .digest(`hex`),
              description: `${type}-${finalNode._id}`,
            }
          })
        }
      } else {
        console.error(`${query.name} doesn't exist in incoming data`);
      }
    }
    if (saveImages) {
      console.timeEnd(helpers.colorizeLog('\nSanity images saved to disk in'));
    }
  } else {
    throw "Failed to fetch data :("
  }
}