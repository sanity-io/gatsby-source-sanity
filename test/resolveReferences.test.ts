import {Node} from 'gatsby'
import {resolveReferences} from '../src/util/resolveReferences'

function reverse(id: string) {
  return id.split('').reverse().join('')
}

// Gatsby's `getNode()` is typed to _always_ return a node, which... aint true.
const noNode: Node = (undefined as unknown) as Node
const createNodeId = (id: string) => id

test('resolves Sanity references', () => {
  const _id = 'abc123'
  const getNode = (id: string) =>
    id === '-abc123'
      ? {
          _id,
          id: _id,
          bar: 'baz',
          parent: `someParent`,
          internal: {
            owner: `asdf`,
            type: `asdf`,
            contentDigest: `asdf`,
          },
          children: [],
        }
      : noNode

  expect(
    resolveReferences(
      {foo: {_ref: _id}},
      {createNodeId, getNode},
      {maxDepth: 5, overlayDrafts: true},
    ),
  ).toEqual({
    foo: {
      _id,
      id: _id,
      bar: 'baz',
      parent: `someParent`,
      internal: {
        owner: `asdf`,
        type: `asdf`,
        contentDigest: `asdf`,
      },
      children: [],
    },
  })
})

test('uses non-draft if overlayDrafts is set to true', () => {
  const _id = 'abc123'
  const getNode = (id: string) =>
    id === '-abc123'
      ? {
          _id,
          id: _id,
          bar: 'baz',
          parent: `someParent`,
          internal: {
            owner: `asdf`,
            type: `asdf`,
            contentDigest: `asdf`,
          },
          children: [],
        }
      : noNode

  expect(
    resolveReferences(
      {foo: {_ref: `drafts.${_id}`}},
      {createNodeId, getNode},
      {maxDepth: 5, overlayDrafts: true},
    ),
  ).toEqual({
    foo: {
      _id,
      id: _id,
      bar: 'baz',
      parent: `someParent`,
      internal: {
        owner: `asdf`,
        type: `asdf`,
        contentDigest: `asdf`,
      },
      children: [],
    },
  })
})

test('uses draft id if overlayDrafts is set to false', () => {
  const _id = 'abc123'
  const getNode = (id: string) =>
    id === '-abc123'
      ? {
          _id,
          id: _id,
          bar: 'baz',
          parent: `someParent`,
          internal: {
            owner: `asdf`,
            type: `asdf`,
            contentDigest: `asdf`,
          },
          children: [],
        }
      : noNode

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
  const getNode = (id: string) =>
    id === '-abc123'
      ? {
          _id,
          id: _id,
          bar: 'baz',
          parent: `someParent`,
          internal: {
            owner: `asdf`,
            type: `asdf`,
            contentDigest: `asdf`,
          },
          children: [],
        }
      : noNode

  expect(
    resolveReferences(
      {foo: [{_ref: _id}]},
      {createNodeId, getNode},
      {maxDepth: 5, overlayDrafts: true},
    ),
  ).toEqual({
    foo: [
      {
        _id,
        id: _id,
        bar: 'baz',
        parent: `someParent`,
        internal: {
          owner: `asdf`,
          type: `asdf`,
          contentDigest: `asdf`,
        },
        children: [],
      },
    ],
  })
})

test('resolves to max depth specified', () => {
  const _id = 'abc123'
  const node = {
    _id,
    id: _id,
    bar: 'baz',
    child: {_ref: _id},
    parent: `someParent`,
    internal: {
      owner: `asdf`,
      type: `asdf`,
      contentDigest: `asdf`,
    },
    children: [],
  }

  const getNode = (id: string) => (id === '-abc123' ? node : noNode)
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
          parent: `someParent`,
          internal: {
            owner: `asdf`,
            type: `asdf`,
            contentDigest: `asdf`,
          },
          children: [],
        },
        id: 'abc123',
        parent: `someParent`,
        internal: {
          owner: `asdf`,
          type: `asdf`,
          contentDigest: `asdf`,
        },
        children: [],
      },
      id: 'abc123',
      parent: `someParent`,
      internal: {
        owner: `asdf`,
        type: `asdf`,
        contentDigest: `asdf`,
      },
      children: [],
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
          parent: `someParent`,
          internal: {
            owner: `asdf`,
            type: `asdf`,
            contentDigest: `asdf`,
          },
          children: [],
        }
      case '-fed':
        return {
          _id: 'def',
          id: '-fed',
          its: 'def',
          parent: `someParent`,
          internal: {
            owner: `asdf`,
            type: `asdf`,
            contentDigest: `asdf`,
          },
          children: [],
        }
      default:
        return noNode
    }
  }

  expect(
    resolveReferences(
      {foo: [{_ref: _id}]},
      {createNodeId: reverse, getNode},
      {maxDepth: 5, overlayDrafts: true},
    ),
  ).toEqual({
    foo: [
      {
        _id,
        id,
        bar: 'baz',
        foo: [
          {
            _id: 'def',
            id: '-fed',
            its: 'def',
            parent: `someParent`,
            internal: {
              owner: `asdf`,
              type: `asdf`,
              contentDigest: `asdf`,
            },
            children: [],
          },
        ],
        parent: `someParent`,
        internal: {
          owner: `asdf`,
          type: `asdf`,
          contentDigest: `asdf`,
        },
        children: [],
      },
    ],
  })
})
