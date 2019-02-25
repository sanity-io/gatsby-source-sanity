import {posix as posixPath} from 'path'
import {parse as parseUrl, format as formatUrl} from 'url'

export const DEFAULT_FIXED_WIDTH = 400
export const DEFAULT_FLUID_MAX_WIDTH = 800
export type ImageNode = ImageAsset | ImageRef | string | null | undefined

enum ImageFormat {
  NO_CHANGE = '',
  WEBP = 'webp',
  JPG = 'jpg',
  PNG = 'png'
}

type GatsbyImageProps = {
  base64: string | null
  aspectRatio: number
  src: string
  srcWebp: string
  srcSet: string | null
  srcSetWebp: string | null
}

type GatsbyFixedImageProps = GatsbyImageProps & {
  width: number
  height: number
}

type GatsbyFluidImageProps = GatsbyImageProps & {
  sizes: string
}

type ImageDimensions = {
  width: number
  height: number
  aspectRatio: number
}

type ImageMetadata = {
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

export type FluidArgs = {
  maxWidth?: number
  maxHeight?: number
  sizes?: string
  toFormat?: ImageFormat
}

export type FixedArgs = {
  width?: number
  height?: number
  toFormat?: ImageFormat
}

type SanityLocation = {
  projectId: string
  dataset: string
}

const idPattern = /^image-[A-Za-z0-9]+-\d+x\d+-[a-z]+$/
const sizeMultipliersFixed = [1, 1.5, 2, 3]
const sizeMultipliersFluid = [0.25, 0.5, 1, 1.5, 2, 3]

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

  const ref = node as ImageRef
  const img = node as ImageAsset
  const id = typeof node === 'string' ? node : ref._ref || img._id

  const hasId = !id || idPattern.test(id)
  if (!hasId) {
    return false
  }

  const [, assetId, dimensions, extension] = id.split('-')
  const [width, height] = dimensions.split('x').map(num => parseInt(num, 10))
  const aspectRatio = width / height
  const metadata = img.metadata || {dimensions: {width, height, aspectRatio}}
  const url = img.url || buildImageUrl(loc, {url: '', assetId, extension, metadata})

  return {
    url,
    assetId,
    extension,
    metadata
  }
}

function convertToFormat(url: string, toFormat: string) {
  const parsed = parseUrl(url, true)
  const filename = posixPath.basename(parsed.pathname || '')
  const extension = posixPath.extname(filename).slice(1)
  const isConvertedToTarget = parsed.query.fm === toFormat
  const isOriginal = extension === toFormat

  // If the original matches the target format, remove any explicit conversions
  if (isConvertedToTarget && isOriginal) {
    const {query, ...parts} = parsed
    const {fm, ...params} = query
    return formatUrl({...parts, query: params})
  }

  if (isConvertedToTarget || isOriginal) {
    return url
  }

  const {query, protocol, host, pathname} = parsed
  const newQuery = {...query, fm: toFormat}
  return formatUrl({protocol, host, pathname, query: newQuery})
}

function isWebP(url: string) {
  const isConverted = url.includes('fm=webp')
  const isOriginal = /[a-f0-9]+-\d+x\d+\.webp/.test(url)
  return isConverted || isOriginal
}

export function getFixedGatsbyImage(
  image: ImageNode,
  args: FixedArgs,
  loc: SanityLocation
): GatsbyFixedImageProps | null {
  const props = getBasicImageProps(image, loc)
  if (!props) {
    return null
  }

  const width = args.width || DEFAULT_FIXED_WIDTH
  const height = args.height

  const {url, metadata, extension} = props
  const {dimensions, lqip} = metadata
  let desiredAspectRatio = dimensions.aspectRatio

  // If we're cropping, calculate the specified aspect ratio
  if (args.height) {
    desiredAspectRatio = width / args.height
  }

  let forceConvert: string | null = null
  if (args.toFormat) {
    forceConvert = args.toFormat
  } else if (isWebP(props.url)) {
    forceConvert = 'jpg'
  }

  const widths = sizeMultipliersFixed.map(scale => Math.round(width * scale))
  const initial = {webp: [] as string[], base: [] as string[]}
  const srcSets = widths
    .filter(currentWidth => currentWidth < dimensions.width)
    .reduce((acc, currentWidth, i) => {
      const resolution = `${sizeMultipliersFixed[i]}x`
      const currentHeight = Math.round(currentWidth / desiredAspectRatio)
      const imgUrl = `${url}?w=${currentWidth}&h=${currentHeight}&fit=crop`
      const webpUrl = convertToFormat(imgUrl, 'webp')
      const baseUrl = convertToFormat(imgUrl, forceConvert || props.extension)
      acc.webp.push(`${webpUrl} ${resolution}`)
      acc.base.push(`${baseUrl} ${resolution}`)
      return acc
    }, initial)

  const outputHeight = Math.round(height ? height : width / desiredAspectRatio)
  const imgUrl = `${url}?w=${width}&h=${outputHeight}&fit=crop`

  return {
    base64: lqip || null,
    aspectRatio: desiredAspectRatio,
    width: Math.round(width),
    height: outputHeight,
    src: convertToFormat(imgUrl, forceConvert || extension),
    srcWebp: convertToFormat(imgUrl, 'webp'),
    srcSet: srcSets.base.join(',\n') || null,
    srcSetWebp: srcSets.webp.join(',\n') || null
  }
}

export function getFluidGatsbyImage(
  image: ImageNode,
  args: FluidArgs,
  loc: SanityLocation
): GatsbyFluidImageProps | null {
  const props = getBasicImageProps(image, loc)
  if (!props) {
    return null
  }

  const {url, metadata, extension} = props
  const {dimensions, lqip} = metadata

  const maxWidth = args.maxWidth || DEFAULT_FLUID_MAX_WIDTH
  let desiredAspectRatio = dimensions.aspectRatio

  // If we're cropping, calculate the specified aspect ratio
  if (args.maxHeight) {
    desiredAspectRatio = maxWidth / args.maxHeight
  }

  const maxHeight = args.maxHeight || Math.round(maxWidth / dimensions.aspectRatio)

  let forceConvert: string | null = null
  if (args.toFormat) {
    forceConvert = args.toFormat
  } else if (isWebP(props.url)) {
    forceConvert = 'jpg'
  }

  const sizes = args.sizes || `(max-width: ${maxWidth}px) 100vw, ${maxWidth}px`
  const widths = sizeMultipliersFluid
    .map(scale => Math.round(maxWidth * scale))
    .filter(width => width < dimensions.width)
    .concat(dimensions.width)

  const initial = {webp: [] as string[], base: [] as string[]}
  const srcSets = widths
    .filter(currentWidth => currentWidth < dimensions.width)
    .reduce((acc, currentWidth) => {
      const currentHeight = Math.round(currentWidth / desiredAspectRatio)
      const imgUrl = `${url}?w=${currentWidth}&h=${currentHeight}&fit=crop`

      const webpUrl = convertToFormat(imgUrl, 'webp')
      const baseUrl = convertToFormat(imgUrl, forceConvert || props.extension)
      acc.webp.push(`${webpUrl} ${currentWidth}w`)
      acc.base.push(`${baseUrl} ${currentWidth}w`)
      return acc
    }, initial)

  const baseSrc = `${url}?w=${maxWidth}&h=${maxHeight}&fit=crop`
  const src = convertToFormat(baseSrc, forceConvert || extension)
  const srcWebp = convertToFormat(baseSrc, 'webp')

  return {
    base64: lqip || null,
    aspectRatio: desiredAspectRatio,
    src,
    srcWebp,
    srcSet: srcSets.base.join(',\n') || null,
    srcSetWebp: srcSets.webp.join(',\n') || null,
    sizes
  }
}
