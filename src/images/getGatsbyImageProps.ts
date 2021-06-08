import {
  generateImageData,
  IGatsbyImageData,
  IGatsbyImageHelperArgs,
  Layout,
} from 'gatsby-plugin-image'

export type ImageNode = ImageAsset | ImageObject | ImageRef | string | null | undefined
import imageUrlBuilder from '@sanity/image-url'
import {ImageUrlBuilder} from '@sanity/image-url/lib/types/builder'

export const EVERY_BREAKPOINT = [
  320,
  654,
  768,
  1024,
  1366,
  1600,
  1920,
  2048,
  2560,
  3440,
  3840,
  4096,
]

export enum ImageFormat {
  NO_CHANGE = '',
  WEBP = 'webp',
  JPG = 'jpg',
  PNG = 'png',
}

type ImagePalette = {
  darkMuted?: ImagePaletteSwatch
  lightVibrant?: ImagePaletteSwatch
  darkVibrant?: ImagePaletteSwatch
  vibrant?: ImagePaletteSwatch
  dominant?: ImagePaletteSwatch
  lightMuted?: ImagePaletteSwatch
  muted?: ImagePaletteSwatch
}

type ImagePaletteSwatch = {
  background?: string
  foreground?: string
  population?: number
  title?: string
}

type ImageDimensions = {
  width: number
  height: number
  aspectRatio: number
}

type ImageMetadata = {
  palette?: ImagePalette
  dimensions: ImageDimensions
  lqip?: string
}

type ImageAssetStub = {
  url: string
  assetId: string
  extension: string
  metadata: ImageMetadata
}

type ImageAsset = ImageAssetStub & {
  _id: string
}

type ImageRef = {
  _ref: string
}

type ImageObject = {
  asset: ImageRef | ImageAsset
}

export type ImageArgs = {
  maxWidth?: number
  maxHeight?: number
  sizes?: string
  toFormat?: ImageFormat
}

type SanityLocation = {
  projectId: string
  dataset: string
}

const idPattern = /^image-[A-Za-z0-9]+-\d+x\d+-[a-z]+$/

function buildImageUrl(loc: SanityLocation, stub: ImageAssetStub) {
  const {projectId, dataset} = loc
  const {assetId, extension, metadata} = stub
  const {width, height} = metadata.dimensions
  const base = 'https://cdn.sanity.io/images'

  return `${base}/${projectId}/${dataset}/${assetId}-${width}x${height}.${extension}`
}

function getBasicImageProps(node: ImageNode, loc: SanityLocation): ImageAssetStub | false {
  if (!node) {
    return false
  }

  const obj = node as ImageObject
  const ref = node as ImageRef
  const img = node as ImageAsset

  let id: string = ''
  if (typeof node === 'string') {
    id = node
  } else if (obj.asset) {
    id = (obj.asset as ImageRef)._ref || (obj.asset as ImageAsset)._id
  } else {
    id = ref._ref || img._id
  }

  const hasId = !id || idPattern.test(id)
  if (!hasId) {
    return false
  }

  const [, assetId, dimensions, extension] = id.split('-')
  const [width, height] = dimensions.split('x').map((num) => parseInt(num, 10))
  const aspectRatio = width / height
  const metadata = img.metadata || {dimensions: {width, height, aspectRatio}}
  const url = img.url || buildImageUrl(loc, {url: '', assetId, extension, metadata})

  return {
    url,
    assetId,
    extension,
    metadata,
  }
}

const fitMap = new Map<ImageFit, IGatsbyImageHelperArgs['fit']>([
  [`clip`, `inside`],
  [`crop`, `cover`],
  [`fill`, `contain`],
  [`fillmax`, `contain`],
  [`max`, `inside`],
  [`scale`, `fill`],
  [`min`, `inside`],
])

const generateImageSource: IGatsbyImageHelperArgs['generateImageSource'] = (
  filename,
  width,
  height,
  toFormat,
  fit,
  options,
) => {
  const {builder} = options as {builder: ImageUrlBuilder}
  const src = builder.width(width).height(height).auto('format').url() as string
  return {width, height, format: 'auto', src}
}

type ImageFit = 'clip' | 'crop' | 'fill' | 'fillmax' | 'max' | 'scale' | 'min'

export type GatsbyImageDataArgs = {
  width?: number
  height?: number
  aspectRatio?: number
  layout?: Layout
  sizes?: string
  placeholder?: 'blurred' | 'dominantColor' | 'none'
  fit?: ImageFit
}

// gatsby-plugin-image
export function getGatsbyImageData(
  image: ImageNode,
  {fit, ...args}: GatsbyImageDataArgs,
  loc: SanityLocation,
): IGatsbyImageData | null {
  const imageStub = getBasicImageProps(image, loc)

  if (!imageStub || !image) {
    return null
  }

  const {width, height} = imageStub.metadata.dimensions

  const builder = imageUrlBuilder(loc).image(image)

  const imageProps = generateImageData({
    ...args,
    pluginName: `gatsby-source-sanity`,
    sourceMetadata: {
      format: 'auto',
      width,
      height,
    },
    fit: fit ? fitMap.get(fit) : undefined,
    filename: imageStub.url,
    generateImageSource,
    options: {builder},
    formats: ['auto'],
    breakpoints: EVERY_BREAKPOINT,
  })

  let placeholderDataURI: string | undefined

  if (args.placeholder === `dominantColor`) {
    imageProps.backgroundColor = imageStub.metadata.palette?.dominant?.background
  }

  if (args.placeholder === `blurred`) {
    imageProps.placeholder = imageStub.metadata.lqip
      ? {fallback: imageStub.metadata.lqip}
      : undefined
  }

  if (placeholderDataURI) {
    imageProps.placeholder = {fallback: placeholderDataURI}
  }

  return imageProps
}
