const helpers = require('./helpers');

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

  console.time(helpers.colorizeLog('\nSanity\'s data fetched in'));
  const data = await client.fetch(finalQuery);
  console.timeEnd(helpers.colorizeLog('\nSanity\'s data fetched in'));
  return data;
};

module.exports = fetchData;