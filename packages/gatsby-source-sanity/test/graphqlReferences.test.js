const {assert} = require('console')

beforeAll(async () => {
  // Test if Gatsby server is running
  const response = await fetch('http://localhost:8000/___graphql')
  if (response.status !== 200) {
    throw new Error('Gatsby server is not running.')
  }
})

async function fetchGraphQL(query, variables) {
  return fetch('http://localhost:8000/___graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query,
      variables,
    }),
  }).then((res) => {
    return res.json()
  })
}

test('resolves regular field reference', async () => {
  const res = await fetchGraphQL(`
        query {
          allSanityBook {
            edges {
              node {
                publisher {
                  name
                }
              }
            }
          }
        }
      `)

  expect(res.errors).toBeUndefined()
  const node = res.data.allSanityBook.edges[0].node
  expect(node.publisher.name).toBe('Bantam Books')
})

test('resolves inline cross dataset field reference', async () => {
  const res = await fetchGraphQL(`
        query {
          allSanityBook {
            edges {
              node {
                author {
                  name
                }
              }
            }
          }
        }
      `)

  expect(res.errors).toBeUndefined()
  const node = res.data.allSanityBook.edges[0].node
  expect(node.author.name).toBe('Neal Stephenson')
})

test('resolves named cross dataset field reference', async () => {
  const res = await fetchGraphQL(`
        query {
          allSanityBook {
            edges {
              node {
                extraAuthor {
                  name
                }
              }
            }
          }
        }
      `)

  expect(res.errors).toBeUndefined()
  const node = res.data.allSanityBook.edges[0].node
  expect(node.extraAuthor.name).toBe('Neal Stephenson')
})

test('it resolves arrays of references', async () => {
  const res = await fetchGraphQL(`
        query {
          allSanityBook {
            edges {
              node {
                genres {
                  title
                }
              }
            }
          }
        }
      `)

  expect(res.errors).toBeUndefined()
  const node = res.data.allSanityBook.edges[0].node
  const expected = [
    {
      title: 'Science Fiction',
    },
    {
      title: 'Cyberpunk',
    },
  ]

  expect(node.genres).toEqual(expected)
})

test('it resolves arrays of cross dataset references', async () => {
  const res = await fetchGraphQL(`
        query {
          allSanityBook {
            edges {
              node {
                coauthors {
                  name
                }
              }
            }
          }
        }
      `)

  expect(res.errors).toBeUndefined()
  const node = res.data.allSanityBook.edges[0].node
  const expected = [
    {
      name: 'Nom de Plume',
    },
    {
      name: 'Neal Stephenson',
    },
  ]

  expect(node.coauthors).toEqual(expected)
})