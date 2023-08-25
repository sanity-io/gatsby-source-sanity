import {getGatsbyImageData, ImageNode} from '../src/images/getGatsbyImageProps'

// Smallish image
const jpegId = 'image-abc123-300x200-jpg'
const jpegRef = {_ref: 'image-abc123-300x200-jpg'}
const jpegResolved: ImageNode = {
  _id: 'image-abc123-300x200-jpg',
  url: 'https://cdn.sanity.io/images/projectId/dataset/abc123-300x200.jpg',
  assetId: 'abc123',
  extension: 'jpg',
  metadata: {
    lqip: 'data:image/jpeg;base64,someString',
    dimensions: {
      width: 300,
      height: 200,
      aspectRatio: 300 / 200,
    },
    palette: {
      dominant: {
        background: 'rebeccapurple',
      },
    },
  },
}

// Largeish image
const webpResolved: ImageNode = {
  _id: 'image-def456-4240x2832-webp',
  url: 'https://cdn.sanity.io/images/projectId/dataset/def456-4240x2832.webp',
  assetId: 'def456',
  extension: 'webp',
  metadata: {
    lqip: 'data:image/webp;base64,someString',
    dimensions: {
      width: 4240,
      height: 2832,
      aspectRatio: 4240 / 2832,
    },
    palette: {
      dominant: {
        background: 'papayawhip',
      },
    },
  },
}

// Tiny image, should generally not be processed apart from format
const smallId = 'image-bf1942-70x70-jpg'

const location = {
  projectId: 'projectId',
  dataset: 'dataset',
}

test('[resolved] gatabyImageData jpg without params', () => {
  expect(getGatsbyImageData(jpegResolved, {}, location)).toMatchSnapshot()
})

test('[resolved] gatsbyImageData fullWidth jpg', () => {
  expect(getGatsbyImageData(jpegResolved, {layout: 'fullWidth'}, location)).toMatchSnapshot()
})

test('[resolved] gatsbyImageData fixed jpg', () => {
  expect(getGatsbyImageData(jpegResolved, {layout: 'fixed'}, location)).toMatchSnapshot()
})

test('[resolved] gatsbyImageData blurred placeholder', () => {
  expect(getGatsbyImageData(jpegResolved, {placeholder: 'blurred'}, location)).toMatchSnapshot()
})

test('[resolved] gatsbyImageData dominantColor placeholder', () => {
  expect(
    getGatsbyImageData(jpegResolved, {placeholder: 'dominantColor'}, location),
  ).toMatchSnapshot()
})

test('[resolved] gatsbyImageData constrained jpg with width (600)', () => {
  expect(getGatsbyImageData(jpegResolved, {width: 600}, location)).toMatchSnapshot()
})

test('[ref] gatabyImageData jpg without params', () => {
  expect(getGatsbyImageData(jpegRef, {}, location)).toMatchSnapshot()
})

test('[ref] gatsbyImageData fullWidth jpg', () => {
  expect(getGatsbyImageData(jpegRef, {layout: 'fullWidth'}, location)).toMatchSnapshot()
})

test('[ref] gatsbyImageData fixed jpg', () => {
  expect(getGatsbyImageData(jpegRef, {layout: 'fixed'}, location)).toMatchSnapshot()
})

test('[ref] gatsbyImageData constrained jpg with width (600)', () => {
  expect(getGatsbyImageData(jpegRef, {width: 600}, location)).toMatchSnapshot()
})

test('[id] gatsbyImageData jpg without params', () => {
  expect(getGatsbyImageData(jpegId, {}, location)).toMatchSnapshot()
})

test('[id] gatsbyImageData fullWidth jpg', () => {
  expect(getGatsbyImageData(jpegId, {layout: 'fullWidth'}, location)).toMatchSnapshot()
})

test('[id] gatsbyImageData fixed jpg', () => {
  expect(getGatsbyImageData(jpegId, {layout: 'fixed'}, location)).toMatchSnapshot()
})

test('[id] gatsbyImageData constrained jpg with width (600)', () => {
  expect(getGatsbyImageData(jpegId, {width: 600}, location)).toMatchSnapshot()
})

// WebP, largish image
test('[resolved] gatsbyImageData webp without params', () => {
  expect(getGatsbyImageData(webpResolved, {}, location)).toMatchSnapshot()
})

test('[resolved] gatsbyImageData webp dominant color', () => {
  expect(getGatsbyImageData(webpResolved, {}, location)).toMatchSnapshot()
})

test('[resolved] gatsbyImageData webp fullWidth', () => {
  expect(getGatsbyImageData(webpResolved, {layout: 'fullWidth'}, location)).toMatchSnapshot()
})

// No upscaling
test('[id] gatsbyImageData, jpeg with width (300) > original size', () => {
  expect(getGatsbyImageData(smallId, {width: 300}, location)).toMatchSnapshot()
})

// No upscaling for fixed with same aspect ratio
test('[id] gatsbyImageData jpeg with width/height (300x300) > original size, same aspect', () => {
  expect(getGatsbyImageData(smallId, {width: 300, height: 300}, location)).toMatchSnapshot()
})

// Upscale for fixed with different aspect ratio
test('[id] gatsbyImageData jpeg with width/height (320x240) > original size, different aspect', () => {
  expect(getGatsbyImageData(smallId, {width: 320, height: 240}, location)).toMatchSnapshot()
})
