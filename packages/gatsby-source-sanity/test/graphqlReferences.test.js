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
