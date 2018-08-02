const crypto = require('crypto');
const sanityClient = require('@sanity/client');

exports.sourceNodes = async ({ actions }, configOptions) => {
  const { createNode } = actions;
  const { projectId, dataset = 'production', useCdn = true, queries } = configOptions;

  if (!projectId) {
    throw "No ID found for your Sanity project!"
  } else if (!queries) {
    throw "Please add the queries to be fetched from Sanity"
  }

  queries.forEach(query => {
    if (!query.name) {
      throw "One or more queries are missing a name"
    } else if (!query.groq) {
      throw "One or more queries are missing a query! How would we even think about fetching data, huh?"
    }
  });

  // Configuring the sanityClient
  const Sanity = sanityClient({
    projectId,
    dataset,
    useCdn,
  });

  // Creating a single query that will be ran by Sanity and return
  // an object with keys equivalent to the queries' names
  const formattedQueries = queries.map(query => {
    const groq = query.groq.replace(/\s/g, '');
    return `"${query.name}": ${
      groq.substr(groq.length -1, 1) === ',' ?
        groq.slice(0, groq.length - 1)
      : groq
    }`
  });
  const finalQuery = `{
    ${formattedQueries.join(',')}
  }`
  const data = await Sanity.fetch(finalQuery);

  if (data) {
    // For each query listed in the config, loop through
    // the array inside the data object that contains a key
    // equivalent to the query name and create a node from there
    queries.forEach(query => {
      if (data[query.name]) {
        data[query.name].forEach(node => {

          if (!node._id) {
            throw "Every query should fetch the _id property to be used internally by Gatsby"
          }

          const type = query.type || query.name;
          createNode({
            ...node,

            // mandatory fields
            id: node._id,
            parent: null,
            children: [],
            internal: {
              type,
              contentDigest: crypto
                .createHash(`md5`)
                .update(JSON.stringify(node))
                .digest(`hex`),
              description: `${type}-${node._id}`,
            }
          })
        })
      } else {
        console.log(`${name} doesn't exist in incoming data`);
      }
    })
  } else {
    throw "Failed to fetch data :("
  }
}