import { colorizeLog } from "./helpers";

export interface IQuery {
  name: string;
  groq: string;
  type?: string;
}

const formatQuery = (query: IQuery) => {
  if (!query.name) {
    throw "One or more queries are lacking a name.";
  } else if (!query.groq) {
    throw "One or more queries are missing a query! How would we even think about fetching data, huh?";
  }

  // Make sure the groq query doesn't have whitespace
  // and finishes without a comma in the end
  const groq = query.groq.replace(/\s/g, "");
  return `"${query.name}": ${
    groq.substr(groq.length - 1, 1) === ","
      ? groq.slice(0, groq.length - 1)
      : groq
  }`;
};

// TODO: type-check Sanity's client
const fetchData = async (queries: IQuery[], client: any) => {
  // Creating a single query that will be ran by Sanity and return
  // an object with keys equivalent to the queries' names
  const finalQuery = `{
    ${queries.map(formatQuery).join(",")}
  }`.replace(/\s/g, "");

  console.time(colorizeLog("\nSanity's data fetched in"));
  const data = await client.fetch(finalQuery);
  console.timeEnd(colorizeLog("\nSanity's data fetched in"));
  return data;
};

export default fetchData;
