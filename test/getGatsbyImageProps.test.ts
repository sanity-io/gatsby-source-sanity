import {
  getFixedGatsbyImage,
  getFluidGatsbyImage,
  getGatsbyImageData,
} from '../src/images/getGatsbyImageProps'

// Smallish image
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
      aspectRatio: 300 / 200,
    },
  },
}

// Largeish image
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
      aspectRatio: 4240 / 2832,
    },
  },
}

// Tiny image, should generally not be processed apart from format
const smallId = 'image-bf1942-70x70-jpg'

const location = {
  projectId: 'projectId',
  dataset: 'dataset',
}

// JPEG, smallish image
test('[resolved] fixed, jpg without params', () => {
  expect(getFixedGatsbyImage(jpegResolved, {}, location)).toMatchSnapshot()
})

test('[resolved] gatabyImageData jpg without params', () => {
  expect(getGatsbyImageData(jpegResolved, {}, location)).toMatchSnapshot()
})

test('[resolved] fluid, jpg without params', () => {
  expect(getFluidGatsbyImage(jpegResolved, {}, location)).toMatchSnapshot()
})

test('[resolved] gatsbyImageData fullWidth jpg', () => {
  expect(getGatsbyImageData(jpegResolved, {layout: 'fullWidth'}, location)).toMatchSnapshot()
})

test('[resolved] gatsbyImageData fixed jpg', () => {
  expect(getGatsbyImageData(jpegResolved, {layout: 'fixed'}, location)).toMatchSnapshot()
})

test('[resolved] fixed, jpg with width (600)', () => {
  expect(getFixedGatsbyImage(jpegResolved, {width: 600}, location)).toMatchSnapshot()
})

test('[resolved] gatsbyImageData constrained jpg with width (600)', () => {
  expect(getGatsbyImageData(jpegResolved, {width: 600}, location)).toMatchSnapshot()
})

test('[resolved] fluid, jpg with max width (1200)', () => {
  expect(getFluidGatsbyImage(jpegResolved, {maxWidth: 1200}, location)).toMatchSnapshot()
})

test('[resolved] fixed, jpg with width (600) + height (300)', () => {
  expect(getFixedGatsbyImage(jpegResolved, {width: 600, height: 300}, location)).toMatchSnapshot()
})

test('[resolved] fluid, jpg with max width (1200) + max height (768)', () => {
  expect(
    getFluidGatsbyImage(jpegResolved, {maxWidth: 1200, maxHeight: 768}, location),
  ).toMatchSnapshot()
})

test('[ref] fixed, jpg without params', () => {
  expect(getFixedGatsbyImage(jpegRef, {}, location)).toMatchSnapshot()
})
test('[ref] gatabyImageData jpg without params', () => {
  expect(getGatsbyImageData(jpegRef, {}, location)).toMatchSnapshot()
})

test('[ref] fluid, jpg without params', () => {
  expect(getFluidGatsbyImage(jpegRef, {}, location)).toMatchSnapshot()
})

test('[ref] gatsbyImageData fullWidth jpg', () => {
  expect(getGatsbyImageData(jpegRef, {layout: 'fullWidth'}, location)).toMatchSnapshot()
})

test('[ref] gatsbyImageData fixed jpg', () => {
  expect(getGatsbyImageData(jpegRef, {layout: 'fixed'}, location)).toMatchSnapshot()
})

test('[ref] fixed, jpg with width (600)', () => {
  expect(getFixedGatsbyImage(jpegRef, {width: 600}, location)).toMatchSnapshot()
})

test('[ref] gatsbyImageData constrained jpg with width (600)', () => {
  expect(getGatsbyImageData(jpegRef, {width: 600}, location)).toMatchSnapshot()
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

test('[id] gatsbyImageData jpg without params', () => {
  expect(getGatsbyImageData(jpegId, {}, location)).toMatchSnapshot()
})

test('[id] fluid, jpg without params', () => {
  expect(getFluidGatsbyImage(jpegId, {}, location)).toMatchSnapshot()
})

test('[id] gatsbyImageData fullWidth jpg', () => {
  expect(getGatsbyImageData(jpegId, {layout: 'fullWidth'}, location)).toMatchSnapshot()
})

test('[id] gatsbyImageData fixed jpg', () => {
  expect(getGatsbyImageData(jpegId, {layout: 'fixed'}, location)).toMatchSnapshot()
})

test('[id] fixed, jpg with width (600)', () => {
  expect(getFixedGatsbyImage(jpegId, {width: 600}, location)).toMatchSnapshot()
})

test('[id] gatsbyImageData constrained jpg with width (600)', () => {
  expect(getGatsbyImageData(jpegId, {width: 600}, location)).toMatchSnapshot()
})

test('[id] fluid, jpg with max width (1200)', () => {
  expect(getFluidGatsbyImage(jpegId, {maxWidth: 1200}, location)).toMatchSnapshot()
})

test('[id] fixed, jpg with width (600) + height (300)', () => {
  expect(getFixedGatsbyImage(jpegId, {width: 600, height: 300}, location)).toMatchSnapshot()
})

test('[id] gatsbyImageData jpg with width (600) + height (300)', () => {
  expect(getFixedGatsbyImage(jpegId, {width: 600, height: 300}, location)).toMatchSnapshot()
})

test('[id] fluid, jpg with max width (1200) + max height (768)', () => {
  expect(getFluidGatsbyImage(jpegId, {maxWidth: 1200, maxHeight: 768}, location)).toMatchSnapshot()
})

// WebP, largish image
test('[resolved] fixed, webp without params', () => {
  expect(getFixedGatsbyImage(webpResolved, {}, location)).toMatchSnapshot()
})

test('[resolved] gatsbyImageData webp without params', () => {
  expect(getGatsbyImageData(webpResolved, {}, location)).toMatchSnapshot()
})

test('[resolved] fluid, webp without params', () => {
  expect(getFluidGatsbyImage(webpResolved, {}, location)).toMatchSnapshot()
})

test('[resolved] gatsbyImageData webp fullWidth', () => {
  expect(getGatsbyImageData(webpResolved, {layout: 'fullWidth'}, location)).toMatchSnapshot()
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
    getFluidGatsbyImage(webpResolved, {maxWidth: 1200, maxHeight: 768}, location),
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

// No upscaling
test('[id] fluid, jpeg with max width (300) > original size', () => {
  expect(getFluidGatsbyImage(smallId, {maxWidth: 300}, location)).toMatchSnapshot()
})

test('[id] gatsbyImageData, jpeg with width (300) > original size', () => {
  expect(getGatsbyImageData(smallId, {width: 300}, location)).toMatchSnapshot()
})

// No upscaling for fixed with same aspect ratio
test('[id] fixed, jpeg with width/height (300x300) > original size, same aspect', () => {
  expect(getFixedGatsbyImage(smallId, {width: 300, height: 300}, location)).toMatchSnapshot()
})
test('[id] gatsbyImageData jpeg with width/height (300x300) > original size, same aspect', () => {
  expect(getGatsbyImageData(smallId, {width: 300, height: 300}, location)).toMatchSnapshot()
})

// Upscale for fixed with different aspect ratio
test('[id] fixed, jpeg with width/height (320x240) > original size, different aspect', () => {
  expect(getFixedGatsbyImage(smallId, {width: 320, height: 240}, location)).toMatchSnapshot()
})
test('[id] gatsbyImageData jpeg with width/height (320x240) > original size, different aspect', () => {
  expect(getGatsbyImageData(smallId, {width: 320, height: 240}, location)).toMatchSnapshot()
})

// No width/height parameters if size matches original
test('[id] fixed, jpeg with width/height matching original', () => {
  expect(getFixedGatsbyImage(smallId, {width: 70, height: 70}, location)).toMatchSnapshot()
})

// Does downscale
test('[id] fixed, jpeg with width/height (50) < original size', () => {
  expect(getFixedGatsbyImage(smallId, {width: 50, height: 50}, location)).toMatchSnapshot()
})
