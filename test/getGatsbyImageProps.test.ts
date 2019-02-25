import {getFixedGatsbyImage, getFluidGatsbyImage} from '../src/images/getGatsbyImageProps'

const jpegId = 'image-abc123-300x200-jpg'
const jpegRef = {_ref: 'image-abc123-300x200-jpg'}
const jpegResolved = {
  _id: 'image-abc123-300x200-jpg',
  url: 'https://cdn.sanity.io/images/projectId/dataset/abc123-300x200.jpg',
  assetId: 'abc123',
  extension: 'jpg',
  metadata: {
    lqip: 'data:image/jpeg;base64,someString',
    dimensions: {
      width: 300,
      height: 200,
      aspectRatio: 300 / 200
    }
  }
}

const webpId = 'image-def456-4240x2832-webp'
const webpRef = {_ref: 'image-def456-4240x2832-webp'}
const webpResolved = {
  _id: 'image-def456-4240x2832-webp',
  url: 'https://cdn.sanity.io/images/projectId/dataset/def456-4240x2832.webp',
  assetId: 'def456',
  extension: 'webp',
  metadata: {
    lqip: 'data:image/webp;base64,someString',
    dimensions: {
      width: 4240,
      height: 2832,
      aspectRatio: 4240 / 2832
    }
  }
}

const location = {
  projectId: 'projectId',
  dataset: 'dataset'
}
;(noop => {
  noop(webpId, webpRef, webpResolved, jpegId, jpegRef)
})((...args: any[]) => null)

// JPEG
test('[resolved] fixed, jpg without params', () => {
  expect(getFixedGatsbyImage(jpegResolved, {}, location)).toMatchSnapshot()
})

test('[resolved] fluid, jpg without params', () => {
  expect(getFluidGatsbyImage(jpegResolved, {}, location)).toMatchSnapshot()
})

test('[resolved] fixed, jpg with width (600)', () => {
  expect(getFixedGatsbyImage(jpegResolved, {width: 600}, location)).toMatchSnapshot()
})

test('[resolved] fluid, jpg with max width (1200)', () => {
  expect(getFluidGatsbyImage(jpegResolved, {maxWidth: 1200}, location)).toMatchSnapshot()
})

test('[resolved] fixed, jpg with width (600) + height (300)', () => {
  expect(getFixedGatsbyImage(jpegResolved, {width: 600, height: 300}, location)).toMatchSnapshot()
})

test('[resolved] fluid, jpg with max width (1200) + max height (768)', () => {
  expect(
    getFluidGatsbyImage(jpegResolved, {maxWidth: 1200, maxHeight: 768}, location)
  ).toMatchSnapshot()
})

test('[ref] fixed, jpg without params', () => {
  expect(getFixedGatsbyImage(jpegRef, {}, location)).toMatchSnapshot()
})

test('[ref] fluid, jpg without params', () => {
  expect(getFluidGatsbyImage(jpegRef, {}, location)).toMatchSnapshot()
})

test('[ref] fixed, jpg with width (600)', () => {
  expect(getFixedGatsbyImage(jpegRef, {width: 600}, location)).toMatchSnapshot()
})

test('[ref] fluid, jpg with max width (1200)', () => {
  expect(getFluidGatsbyImage(jpegRef, {maxWidth: 1200}, location)).toMatchSnapshot()
})

test('[ref] fixed, jpg with width (600) + height (300)', () => {
  expect(getFixedGatsbyImage(jpegRef, {width: 600, height: 300}, location)).toMatchSnapshot()
})

test('[ref] fluid, jpg with max width (1200) + max height (768)', () => {
  expect(getFluidGatsbyImage(jpegRef, {maxWidth: 1200, maxHeight: 768}, location)).toMatchSnapshot()
})

test('[id] fixed, jpg without params', () => {
  expect(getFixedGatsbyImage(jpegId, {}, location)).toMatchSnapshot()
})

test('[id] fluid, jpg without params', () => {
  expect(getFluidGatsbyImage(jpegId, {}, location)).toMatchSnapshot()
})

test('[id] fixed, jpg with width (600)', () => {
  expect(getFixedGatsbyImage(jpegId, {width: 600}, location)).toMatchSnapshot()
})

test('[id] fluid, jpg with max width (1200)', () => {
  expect(getFluidGatsbyImage(jpegId, {maxWidth: 1200}, location)).toMatchSnapshot()
})

test('[id] fixed, jpg with width (600) + height (300)', () => {
  expect(getFixedGatsbyImage(jpegId, {width: 600, height: 300}, location)).toMatchSnapshot()
})

test('[id] fluid, jpg with max width (1200) + max height (768)', () => {
  expect(getFluidGatsbyImage(jpegId, {maxWidth: 1200, maxHeight: 768}, location)).toMatchSnapshot()
})

// WebP
test('[resolved] fixed, webp without params', () => {
  expect(getFixedGatsbyImage(webpResolved, {}, location)).toMatchSnapshot()
})

test('[resolved] fluid, webp without params', () => {
  expect(getFluidGatsbyImage(webpResolved, {}, location)).toMatchSnapshot()
})

test('[resolved] fixed, webp with width (600)', () => {
  expect(getFixedGatsbyImage(webpResolved, {width: 600}, location)).toMatchSnapshot()
})

test('[resolved] fluid, webp with max width (1200)', () => {
  expect(getFluidGatsbyImage(webpResolved, {maxWidth: 1200}, location)).toMatchSnapshot()
})

test('[resolved] fixed, webp with width (600) + height (300)', () => {
  expect(getFixedGatsbyImage(webpResolved, {width: 600, height: 300}, location)).toMatchSnapshot()
})

test('[resolved] fluid, webp with max width (1200) + max height (768)', () => {
  expect(
    getFluidGatsbyImage(webpResolved, {maxWidth: 1200, maxHeight: 768}, location)
  ).toMatchSnapshot()
})

test('[ref] fixed, webp without params', () => {
  expect(getFixedGatsbyImage(webpRef, {}, location)).toMatchSnapshot()
})

test('[ref] fluid, webp without params', () => {
  expect(getFluidGatsbyImage(webpRef, {}, location)).toMatchSnapshot()
})

test('[ref] fixed, webp with width (600)', () => {
  expect(getFixedGatsbyImage(webpRef, {width: 600}, location)).toMatchSnapshot()
})

test('[ref] fluid, webp with max width (1200)', () => {
  expect(getFluidGatsbyImage(webpRef, {maxWidth: 1200}, location)).toMatchSnapshot()
})

test('[ref] fixed, webp with width (600) + height (300)', () => {
  expect(getFixedGatsbyImage(webpRef, {width: 600, height: 300}, location)).toMatchSnapshot()
})

test('[ref] fluid, webp with max width (1200) + max height (768)', () => {
  expect(getFluidGatsbyImage(webpRef, {maxWidth: 1200, maxHeight: 768}, location)).toMatchSnapshot()
})

test('[id] fixed, webp without params', () => {
  expect(getFixedGatsbyImage(webpId, {}, location)).toMatchSnapshot()
})

test('[id] fluid, webp without params', () => {
  expect(getFluidGatsbyImage(webpId, {}, location)).toMatchSnapshot()
})

test('[id] fixed, webp with width (600)', () => {
  expect(getFixedGatsbyImage(webpId, {width: 600}, location)).toMatchSnapshot()
})

test('[id] fluid, webp with max width (1200)', () => {
  expect(getFluidGatsbyImage(webpId, {maxWidth: 1200}, location)).toMatchSnapshot()
})

test('[id] fixed, webp with width (600) + height (300)', () => {
  expect(getFixedGatsbyImage(webpId, {width: 600, height: 300}, location)).toMatchSnapshot()
})

test('[id] fluid, webp with max width (1200) + max height (768)', () => {
  expect(getFluidGatsbyImage(webpId, {maxWidth: 1200, maxHeight: 768}, location)).toMatchSnapshot()
})
