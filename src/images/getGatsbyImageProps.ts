import parseUrl from 'url-parse'

export const LOWEST_FLUID_BREAKPOINT_WIDTH = 100
export const DEFAULT_FIXED_WIDTH = 400
export const DEFAULT_FLUID_MAX_WIDTH = 800
export type ImageNode = ImageAsset | ImageObject | ImageRef | string | null | undefined

export enum ImageFormat {
  NO_CHANGE = '',
  WEBP = 'webp',
  JPG = 'jpg',
  PNG = 'png',
}

export interface GatsbyFixedImageProps {
  width: number
  height: number
  src: string
  srcSet: string
  base64?: string
  tracedSVG?: string
  srcWebp?: string
  srcSetWebp?: string
  media?: string
}

export type GatsbyFluidImageProps = {
  aspectRatio: number
  src: string
  srcSet: string
  sizes: string
  base64?: string
  tracedSVG?: string
  srcWebp?: string
  srcSetWebp?: string
  media?: string
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

type ImageObject = {
  asset: ImageRef | ImageAsset
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

function convertToFormat(url: string, toFormat: string) {
  const parsed = parseUrl(url, true)
  const filename = parsed.pathname.replace(/.*\//, '')
  const extension = filename.replace(/.*\./, '')
  const isConvertedToTarget = parsed.query.fm === toFormat
  const isOriginal = extension === toFormat

  // If the original matches the target format, remove any explicit conversions
  if (isConvertedToTarget && isOriginal) {
    const {fm, ...params} = parsed.query
    parsed.set('query', params)
    return parsed.toString()
  }

  if (isConvertedToTarget || isOriginal) {
    return url
  }

  const newQuery = {...parsed.query, fm: toFormat}
  parsed.set('query', newQuery)
  return parsed.toString()
}

function isWebP(url: string) {
  const isConverted = url.includes('fm=webp')
  const isOriginal = /[a-f0-9]+-\d+x\d+\.webp/.test(url)
  return isConverted || isOriginal
}

export function getFixedGatsbyImage(
  image: ImageNode,
  args: FixedArgs,
  loc: SanityLocation,
): GatsbyFixedImageProps | null {
  const props = getBasicImageProps(image, loc)
  if (!props) {
    return null
  }

  const width = args.width || DEFAULT_FIXED_WIDTH
  const height = args.height

  const {url, metadata, extension} = props
  const {dimensions, lqip} = metadata
  const isOriginalSize = (w: number, h: number) => w === dimensions.width && h === dimensions.height
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

  const hasOriginalRatio = desiredAspectRatio === dimensions.aspectRatio
  const outputHeight = Math.round(height ? height : width / desiredAspectRatio)
  const imgUrl =
    isOriginalSize(width, outputHeight) ||
    (hasOriginalRatio && width > dimensions.width && outputHeight > dimensions.height)
      ? url
      : `${url}?w=${width}&h=${outputHeight}&fit=crop`

  const widths = sizeMultipliersFixed.map((scale) => Math.round(width * scale))
  const initial = {webp: [] as string[], base: [] as string[]}
  const srcSets = widths
    .filter((currentWidth) => currentWidth <= dimensions.width)
    .reduce((acc, currentWidth, i) => {
      const resolution = `${sizeMultipliersFixed[i]}x`
      const currentHeight = Math.round(currentWidth / desiredAspectRatio)
      const imgUrl = isOriginalSize(currentWidth, currentHeight)
        ? url
        : `${url}?w=${currentWidth}&h=${currentHeight}&fit=crop`

      const webpUrl = convertToFormat(imgUrl, 'webp')
      const baseUrl = convertToFormat(imgUrl, forceConvert || props.extension)
      acc.webp.push(`${webpUrl} ${resolution}`)
      acc.base.push(`${baseUrl} ${resolution}`)
      return acc
    }, initial)

  const src = convertToFormat(imgUrl, forceConvert || extension)
  const srcWebp = convertToFormat(imgUrl, 'webp')

  return {
    base64: lqip || undefined,
    width: Math.round(width),
    height: outputHeight,
    src,
    srcWebp,
    srcSet: srcSets.base.join(',\n') || `${src} 1x`,
    srcSetWebp: srcSets.webp.join(',\n') || `${srcWebp} 1x`,
  }
}

export function getFluidGatsbyImage(
  image: ImageNode,
  args: FluidArgs,
  loc: SanityLocation,
): GatsbyFluidImageProps | null {
  const props = getBasicImageProps(image, loc)
  if (!props) {
    return null
  }

  const {url, metadata, extension} = props
  const {dimensions, lqip} = metadata
  const isOriginalSize = (w: number, h: number) => w === dimensions.width && h === dimensions.height

  const maxWidth = Math.min(args.maxWidth || DEFAULT_FLUID_MAX_WIDTH, dimensions.width)
  const specifiedMaxHeight = args.maxHeight
    ? Math.min(args.maxHeight, dimensions.height)
    : undefined
  let desiredAspectRatio = dimensions.aspectRatio

  // If we're cropping, calculate the specified aspect ratio
  if (specifiedMaxHeight) {
    desiredAspectRatio = maxWidth / specifiedMaxHeight
  }

  const maxHeight = specifiedMaxHeight || Math.round(maxWidth / dimensions.aspectRatio)

  let forceConvert: string | null = null
  if (args.toFormat) {
    forceConvert = args.toFormat
  } else if (isWebP(props.url)) {
    forceConvert = 'jpg'
  }

  const baseSrc =
    isOriginalSize(maxWidth, maxHeight) ||
    (maxWidth >= dimensions.width && maxHeight >= dimensions.height)
      ? url
      : `${url}?w=${maxWidth}&h=${maxHeight}&fit=crop`

  const src = convertToFormat(baseSrc, forceConvert || extension)
  const srcWebp = convertToFormat(baseSrc, 'webp')

  const sizes = args.sizes || `(max-width: ${maxWidth}px) 100vw, ${maxWidth}px`
  const widths = sizeMultipliersFluid
    .map((scale) => Math.round(maxWidth * scale))
    .filter((width) => width < dimensions.width && width > LOWEST_FLUID_BREAKPOINT_WIDTH)
    .concat(dimensions.width)

  const initial = {webp: [] as string[], base: [] as string[]}
  const srcSets = widths
    .filter((currentWidth) => currentWidth <= dimensions.width)
    .reduce((acc, currentWidth) => {
      const currentHeight = Math.round(currentWidth / desiredAspectRatio)
      const imgUrl = isOriginalSize(currentWidth, currentHeight)
        ? url
        : `${url}?w=${currentWidth}&h=${currentHeight}&fit=crop`

      const webpUrl = convertToFormat(imgUrl, 'webp')
      const baseUrl = convertToFormat(imgUrl, forceConvert || props.extension)
      acc.webp.push(`${webpUrl} ${currentWidth}w`)
      acc.base.push(`${baseUrl} ${currentWidth}w`)
      return acc
    }, initial)

  return {
    base64: lqip || undefined,
    aspectRatio: desiredAspectRatio,
    src,
    srcWebp,
    srcSet: srcSets.base.join(',\n'),
    srcSetWebp: srcSets.webp.join(',\n'),
    sizes,
  }
}
