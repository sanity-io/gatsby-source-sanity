// Data normalizing heavily inspired by Nectum at:
// https://github.com/nectum/GatsbyPluginTestBuilding/blob/master/plugins/gatsby-source-test/normalize.js
// He, in turn, credits angeloashmore at:
// https://github.com/angeloashmore/gatsby-source-prismic/blob/master/src/normalize.js

import * as crypto from "crypto";
const sanityClient = require("@sanity/client");
const imageUrlBuilder = require("@sanity/image-url");

import * as helpers from "./helpers";
import fetchData, { IQuery } from "./fetch";
import normalizeNode from "./normalize";

export interface IConfigOptions {
  projectId: string;
  queries: IQuery[];
  dataset?: string;
  token?: string;
  stringifyPattern?: string;
  useCdn?: boolean;
  saveImages?: boolean;
}

export const sourceNodes = async (
  { actions, cache, store, createNodeId }: any,
  configOptions: IConfigOptions
) => {
  const { createNode, touchNode } = actions;
  const {
    projectId,
    token,
    dataset = "production",
    useCdn = true,
    saveImages = false,
    stringifyPattern,
    queries
  } = configOptions;

  if (!projectId) {
    throw new Error("No ID found for your Sanity project!");
  } else if (!queries || !queries[0]) {
    throw new Error("Please add the queries to be fetched from Sanity");
  }

  // Configuring the sanityClient
  const Sanity = sanityClient({
    projectId,
    token,
    dataset,
    useCdn
  });
  const builder = imageUrlBuilder(Sanity);

  const urlFor = (asset: any) => builder.image(asset);

  // Fetching data through the ./fetchData.ts module
  const data = await fetchData(queries, Sanity);

  if (data == undefined) {
    throw "Failed to fetch data :(";
  }

  // Start counting the time to save images
  if (saveImages) {
    console.time(helpers.colorizeLog("\nSanity images saved to disk in"));
  }

  // For each query listed in the config, loop through
  // the array inside the data object that contains a key
  // equivalent to the query name and create a node from there
  for (const query of queries) {
    if (data[query.name] == undefined) {
      console.error(`${query.name} doesn't exist in incoming data`);
    }

    for (const node of data[query.name]) {
      // Provide helpful error in case the user
      // fetches a non-object node as these can't
      // be translated into nodes for Gatsby
      if (typeof node !== "object") {
        console.warn(
          `${
            typeof node == "string" ? `${node.substr(0, 10)}...` : "A node"
          } is not an object. It will not be parsed into a new node`
        );
        continue;
      }

      if (!node._id) {
        throw new Error(
          "Every query should fetch the _id property to be used internally by Gatsby"
        );
      }

      let finalNode = node;
      if (saveImages) {
        finalNode = await normalizeNode(node, {
          urlFor,
          cache,
          store,
          touchNode,
          createNodeId,
          createNode
        });
      }

      if (undefined !== stringifyPattern) {
        finalNode = helpers.stringify(finalNode, (key: string, value: any) => {
          if (key.includes(stringifyPattern)) return JSON.stringify(value);
          return value;
        });
      }

      // Provide a fallback for the query type in case the user doesn't
      // explicitly define it
      const type =
        query.type || `Sanity${helpers.capitalizeFirstLetter(query.name)}`;
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
          description: `${type}-${finalNode._id}`
        }
      });
    }
  }

  // Finish counting the time it took to save images
  if (saveImages) {
    console.timeEnd(helpers.colorizeLog("\nSanity images saved to disk in"));
  }
};
