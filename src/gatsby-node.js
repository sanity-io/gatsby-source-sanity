// Data normalizing heavily inspired by Nectum at:
// https://github.com/nectum/GatsbyPluginTestBuilding/blob/master/plugins/gatsby-source-test/normalize.js
// He, in turn, credits angeloashmore at:
// https://github.com/angeloashmore/gatsby-source-prismic/blob/master/src/normalize.js


const crypto = require('crypto');
const sanityClient = require('@sanity/client');
const imageUrlBuilder = require("@sanity/image-url");
const { createRemoteFileNode } = require("gatsby-source-filesystem");

// export type Tqueries = {
//   name?: string;
//   groq?: string;
//   type?: string;
// }[];

// export type Tobject = {
//   [key: string]: any;
// };

// interface IconfigOptions {
//   projectId?: string;
//   dataset?: string;
//   useCdn?: boolean;
//   saveImages?: boolean;
//   queries?: Tqueries;
// }

const colorizeLog = str => `\x1b[36m${str}\x1b[0m`;

const capitalizeFirstLetter = str => `${str.substr(0,1).toUpperCase()}${str.substr(1,str.length).toLowerCase()}`

const formatQuery = query => {
  if (!query.name) {
    throw "One or more queries are lacking a name.";
  } else if (!query.groq) {
    throw "One or more queries are missing a query! How would we even think about fetching data, huh?";
  }
  const groq = query.groq.replace(/\s/g, '');
  return `"${query.name}": ${
    groq.substr(groq.length - 1, 1) === ","
      ? groq.slice(0, groq.length - 1)
      : groq
    }`;
}

const fetchData = async (queries, client) => {
  // Creating a single query that will be ran by Sanity and return
  // an object with keys equivalent to the queries' names
  const finalQuery = `{
    ${queries.map(formatQuery).join(',')}
  }`.replace(/\s/g,"");

  console.time(colorizeLog('\nSanity\'s data fetched in'));
  const data = await client.fetch(finalQuery);
  console.timeEnd(colorizeLog('\nSanity\'s data fetched in'));
  return data;
};

// field: any
const isImage = field => {
  return field._type && field._type === 'image';
}

// node: Object<any>
const normalizeNode = async (node, helpers) => {
  const { urlFor, cache, store, createNode, createNodeId, touchNode } = helpers;
  for (const key of Object.keys(node)) {
    const field = node[key];

    // We can't work on fields that aren't objects
    // (arrays are also objects)
    if (typeof field !== 'object') {
      continue
    } else if (isImage(field)) {
      // if the field doesn't have the asset field,
      // then we won't mess with it
      if (!field.asset) {
        continue
      }

      // Build the URL for the image using Sanity's package
      const imageUrl = urlFor(field.asset).url();
      if (imageUrl) {
        let fileNodeID;
        const mediaDataCacheKey = `sanity-media-${imageUrl}`;
        const cacheMediaData = await cache.get(mediaDataCacheKey);

        if (cacheMediaData) {
          fileNodeID = cacheMediaData.fileNodeID;
          touchNode({ nodeId: cacheMediaData.fileNodeID });
        }

        if (!fileNodeID) {
          try {
            const fileNode = await createRemoteFileNode({
              url: imageUrl,
              store,
              cache,
              createNode,
              createNodeId
            });

            if (fileNode) {
              fileNodeID = fileNode.id;
              await cache.set(mediaDataCacheKey, { fileNodeID });
            }
          } catch (error) {
            console.error(`An image failed to be saved to internal storage: ${error}`)
          }
        }

        if (fileNodeID) {
          // after stored in cache, add this file node id to
          // a field localFile in the root of the
          // image object and also add the imageUrl field
          // Take a look at GraphiQl to understand the data
          Object.assign(node, {
            [key]: {
              ...field,
              imageUrl,
              localFile___NODE: fileNodeID,
            }
          })
        }
      } else {
        console.error(`An image field has an incomplete asset object or something went wrong when creating its URL: ${key}`);
      }
    } else {
      // If it's an object with a _type !== 'image'
      // then we want to go deeper in the structure and
      // normalize it again... however, creating a circular
      // structure is dangerous and simply can't happen...
      // if you have an idea to fix this, please submit an issue ;)

      // const newField = normalizeNode(field);
      // if (newField) {
      //   Object.assign(newField, {
      //     [key]: newField
      //   });
      // }
    }
  }
  return node;
}

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
      console.time(colorizeLog('\nSanity images saved to disk in'));
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

          const type = query.type || `Sanity${capitalizeFirstLetter(query.name)}`;
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
      console.timeEnd(colorizeLog('\nSanity images saved to disk in'));
    }
  } else {
    throw "Failed to fetch data :("
  }
}