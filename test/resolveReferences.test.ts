import {resolveReferences} from '../src/util/resolveReferences'

const createNodeId = (id: string) => id

test('resolves Sanity references', () => {
  const _id = 'abc123'
  const getNode = (id: string) => (id === 'abc123' ? {_id, id: _id, bar: 'baz'} : undefined)
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
  const getNode = (id: string) => (id === 'abc123' ? {_id, id: _id, bar: 'baz'} : undefined)
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
  const getNode = (id: string) => (id === 'abc123' ? {_id, id: _id, bar: 'baz'} : undefined)
  expect(
    resolveReferences(
      {foo: {_ref: `drafts.${_id}`}},
      {createNodeId, getNode},
      {maxDepth: 5, overlayDrafts: false},
    ),
  ).toEqual({
    foo: {_ref: `drafts.${_id}`},
  })
})

test('resolves Gatsby references', () => {
  const _id = 'abc123'
  const getNode = (id: string) => (id === 'abc123' ? {_id, id: _id, bar: 'baz'} : undefined)
  expect(
    resolveReferences(
      {foo___NODE: _id},
      {createNodeId, getNode},
      {maxDepth: 5, overlayDrafts: true},
    ),
  ).toEqual({
    foo: {_id, id: _id, bar: 'baz'},
  })
})

test('resolves Gatsby array references', () => {
  const _id = 'abc123'
  const getNode = (id: string) => (id === 'abc123' ? {_id, id: _id, bar: 'baz'} : undefined)
  expect(
    resolveReferences(
      {foo___NODE: [_id]},
      {createNodeId, getNode},
      {maxDepth: 5, overlayDrafts: true},
    ),
  ).toEqual({
    foo: [{_id, id: _id, bar: 'baz'}],
  })
})

test('resolves references in arrays', () => {
  const _id = 'abc123'
  const getNode = (id: string) => (id === 'abc123' ? {_id, id: _id, bar: 'baz'} : undefined)
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
  const getNode = (id: string) => (id === 'abc123' ? node : undefined)
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
