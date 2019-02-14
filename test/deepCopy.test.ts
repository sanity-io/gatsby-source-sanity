import {deepCopy} from '../src/util/deepCopy'

test('shallow copy', () => {
  const original = {a: 'xyzzy'}
  const copied = deepCopy(original, 1)
  expect(copied).toHaveProperty('a', 'xyzzy')
  expect(original).toEqual(copied)
  expect(original === copied).toBe(false)
})

test('deep copy of nested objects stop at the desired depth', () => {
  const original = {a: 'xyzzy', b: {c: 2, d: {e: 3}}}
  const copiedDepth1 = deepCopy(original, 1)
  expect(copiedDepth1).toHaveProperty('a', 'xyzzy')
  expect(copiedDepth1).toHaveProperty('b', {})
  expect(copiedDepth1).toEqual({a: 'xyzzy', b: {}})

  const copiedDepth2 = deepCopy(original, 2)
  expect(copiedDepth2).toHaveProperty('a', 'xyzzy')
  expect(copiedDepth2).toHaveProperty('b', {c: 2, d: {}})
  expect(copiedDepth2).toEqual({a: 'xyzzy', b: {c: 2, d: {}}})
})

test('deep copy of nested arrays stop at the desired depth', () => {
  const original = {a: 'xyzzy', b: [{c: 2}, {d: [1, 2]}]}
  const copiedDepth1 = deepCopy(original, 1)
  expect(copiedDepth1).toHaveProperty('a', 'xyzzy')
  expect(copiedDepth1).toHaveProperty('b', [])
  expect(copiedDepth1).toEqual({a: 'xyzzy', b: []})

  const copiedDepth2 = deepCopy(original, 2)
  expect(copiedDepth2).toHaveProperty('a', 'xyzzy')
  expect(copiedDepth2).toHaveProperty('b', [{}, {}])
  expect(copiedDepth2).toEqual({a: 'xyzzy', b: [{}, {}]})

  const copiedDepth3 = deepCopy(original, 3)
  expect(copiedDepth3).toHaveProperty('a', 'xyzzy')
  expect(copiedDepth3).toHaveProperty('b', [{c: 2}, {d: []}])
  expect(copiedDepth3).toEqual({a: 'xyzzy', b: [{c: 2}, {d: []}]})
})

test('deep copy of all kinds of crazy stuff', () => {
  const original = {
    a: 'xyzzy',
    b: {c: {d: [1, 2]}},
    e: false,
    f: -0.9,
    g: [true, ['h', ['i', [{k: 5, l: false, m: [{n: ''}, -3, [2, ['33']]]}]]]]
  }
  const copiedDepth1 = deepCopy(original, 1)
  const expectedDepth1 = {a: 'xyzzy', b: {}, e: false, f: -0.9, g: []}
  expect(copiedDepth1).toEqual(expectedDepth1)

  const copiedDepth2 = deepCopy(original, 2)
  const expectedDepth2 = {a: 'xyzzy', b: {c: {}}, e: false, f: -0.9, g: [true, []]}
  expect(copiedDepth2).toEqual(expectedDepth2)

  const copiedDepth3 = deepCopy(original, 3)
  const expectedDepth3 = {a: 'xyzzy', b: {c: {d: []}}, e: false, f: -0.9, g: [true, ['h', []]]}
  expect(copiedDepth3).toEqual(expectedDepth3)

  const copiedDepth9 = deepCopy(original, 9)
  const expectedDepth9 = {
    a: 'xyzzy',
    b: {c: {d: [1, 2]}},
    e: false,
    f: -0.9,
    g: [true, ['h', ['i', [{k: 5, l: false, m: [{n: ''}, -3, [2, ['33']]]}]]]]
  }
  expect(copiedDepth9).toEqual(expectedDepth9)
  expect(original === copiedDepth9).toBe(false)
})
