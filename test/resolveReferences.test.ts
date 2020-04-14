import {resolveReferences} from '../src/util/resolveReferences'

function reverse(id: string) {
  return id
    .split('')
    .reverse()
    .join('')
}

const createNodeId = (id: string) => id

test('resolves Sanity references', () => {
  const _id = 'abc123'
  const getNode = (id: string) => (id === '-abc123' ? {_id, id: _id, bar: 'baz'} : undefined)
  expect(
    resolveReferences(
      {foo: {_ref: _id}},
      {createNodeId, getNode},
      {maxDepth: 5, overlayDrafts: true},
    ),
  ).toEqual({
    foo: {_id, id: _id, bar: 'baz'},
  })
})

test('uses non-draft if overlayDrafts is set to true', () => {
  const _id = 'abc123'
  const getNode = (id: string) => (id === '-abc123' ? {_id, id: _id, bar: 'baz'} : undefined)
  expect(
    resolveReferences(
      {foo: {_ref: `drafts.${_id}`}},
      {createNodeId, getNode},
      {maxDepth: 5, overlayDrafts: true},
    ),
  ).toEqual({
    foo: {_id, id: _id, bar: 'baz'},
  })
})

test('uses draft id if overlayDrafts is set to false', () => {
  const _id = 'abc123'
  const getNode = (id: string) => (id === '-abc123' ? {_id, id: _id, bar: 'baz'} : undefined)
  expect(
    resolveReferences(
      {foo: {_ref: `drafts.${_id}`}},
      {createNodeId, getNode},
      {maxDepth: 5, overlayDrafts: false},
    ),
  ).toEqual({
    foo: null,
  })
})

test('resolves references in arrays', () => {
  const _id = 'abc123'
  const getNode = (id: string) => (id === '-abc123' ? {_id, id: _id, bar: 'baz'} : undefined)
  expect(
    resolveReferences(
      {foo: [{_ref: _id}]},
      {createNodeId, getNode},
      {maxDepth: 5, overlayDrafts: true},
    ),
  ).toEqual({
    foo: [{_id, id: _id, bar: 'baz'}],
  })
})

test('resolves to max depth specified', () => {
  const _id = 'abc123'
  const node = {_id, id: _id, bar: 'baz', child: {_ref: _id}}
  const getNode = (id: string) => (id === '-abc123' ? node : undefined)
  expect(
    resolveReferences(
      {foo: {_ref: _id}},
      {createNodeId, getNode},
      {maxDepth: 5, overlayDrafts: false},
    ),
  ).toEqual({
    foo: {
      _id: 'abc123',
      bar: 'baz',
      child: {
        _id: 'abc123',
        bar: 'baz',
        child: {
          _id: 'abc123',
          bar: 'baz',
          child: {
            _ref: 'abc123',
          },
          id: 'abc123',
        },
        id: 'abc123',
      },
      id: 'abc123',
    },
  })
})

test('remaps raw fields from returned nodes', () => {
  const _id = 'abc123' // Sanity ID
  const id = '-321cba' // Gatsby ID
  const getNode = (id: string) => {
    switch (id) {
      case '-321cba':
        return {
          _id,
          id,
          bar: 'baz',
          foo: [{_ref: '-gatsbyId'}],
          _rawDataFoo: [{_ref: 'def'}],
        }
      case '-fed':
        return {_id: 'def', id: '-fed', its: 'def'}
      default:
        return undefined
    }
  }

  expect(
    resolveReferences(
      {foo: [{_ref: _id}]},
      {createNodeId: reverse, getNode},
      {maxDepth: 5, overlayDrafts: true},
    ),
  ).toEqual({
    foo: [{_id, id, bar: 'baz', foo: [{_id: 'def', id: '-fed', its: 'def'}]}],
  })
})
