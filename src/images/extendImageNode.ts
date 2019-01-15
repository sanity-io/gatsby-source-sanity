import {
  GraphQLObjectType,
  GraphQLString,
  GraphQLFloat,
  GraphQLInt,
  GraphQLFieldConfig
} from 'gatsby/graphql'
import {GatsbyContext, GatsbyOnNodeTypeContext} from '../types/gatsby'
import {PluginConfig} from '../gatsby-node'

type ImageAsset = {
  _id: string
  size: number
  url: string
  mimeType: string
  metadata: {
    dimensions: {width: number; height: number; aspectRatio: number}
    lqip?: string
  }
} | null

type FluidArgs = {
  maxWidth?: number
  maxHeight?: number
  sizes?: string
}

type FixedArgs = {
  width?: number
  height?: number
}

const idPattern = /^image-[A-Za-z0-9]+-\d+x\d+-[a-z]+$/
const sizeMultipliersFixed = [1, 1.5, 2, 3]
const sizeMultipliersFluid = [0.25, 0.5, 1, 1.5, 2, 3]

export function extendImageNode(
  context: GatsbyContext & GatsbyOnNodeTypeContext,
  config: PluginConfig
): {[key: string]: GraphQLFieldConfig<any, any>} {
  return extension
}

function isValidImage(img: ImageAsset) {
  const hasId = img && typeof img._id === 'string' && idPattern.test(img._id)
  if (!hasId) {
    return false
  }

  return img && img.metadata && img.metadata.dimensions.width
}

function resolveFixed(image: ImageAsset, options: FixedArgs) {
  if (image === null || !isValidImage(image)) {
    return null
  }

  const width = options.width || 400
  const height = options.height
  const {dimensions, lqip} = image.metadata
  const widths = sizeMultipliersFixed.map(scale => Math.round(width * scale))
  const srcSet = widths
    .filter(currentWidth => currentWidth < dimensions.width)
    .map((currentWidth, i) => {
      const resolution = `${sizeMultipliersFixed[i]}x`
      const currentHeight = Math.round(currentWidth / dimensions.aspectRatio)
      const url = `${image.url}?w=${currentWidth}&h=${currentHeight}&fit=crop`
      return `${url} ${resolution}`
    })
    .join(`,\n`)

  return {
    base64: lqip,
    aspectRatio: dimensions.aspectRatio,
    width: Math.round(width),
    height: Math.round(height ? height : width / dimensions.aspectRatio),
    src: `${image.url}?w=${width}`,
    srcSet
  }
}

function resolveFluid(image: ImageAsset, options: FluidArgs) {
  if (!isValidImage(image)) {
    return null
  }

  if (image === null || !isValidImage(image)) {
    return null
  }

  const {dimensions, lqip} = image.metadata
  const maxWidth = options.maxWidth
    ? options.maxWidth
    : (options.maxHeight || 1) * dimensions.aspectRatio
  const maxHeight = Math.round(maxWidth / dimensions.aspectRatio)

  const sizes = options.sizes || `(max-width: ${maxWidth}px) 100vw, ${maxWidth}px`
  const widths = sizeMultipliersFluid
    .map(scale => Math.round(maxWidth * scale))
    .filter(width => width < dimensions.width)
    .concat(dimensions.width)

  const srcSet = widths
    .map(currentWidth => {
      const currentHeight = Math.round(currentWidth / dimensions.aspectRatio)
      const url = `${image.url}?w=${currentWidth}&h=${currentHeight}&fit=crop`
      return `${url} ${currentWidth}w`
    })
    .join(`,\n`)

  const src = `${image.url}?w=${maxWidth}&h=${maxHeight}`

  return {
    base64: lqip,
    aspectRatio: dimensions.aspectRatio,
    src,
    srcSet,
    sizes
  }
}

const fixed = {
  type: new GraphQLObjectType({
    name: 'SanityImageFixed',
    fields: {
      base64: {type: GraphQLString},
      aspectRatio: {type: GraphQLFloat},
      width: {type: GraphQLFloat},
      height: {type: GraphQLFloat},
      src: {type: GraphQLString},
      srcSet: {type: GraphQLString}
    }
  }),
  args: {
    width: {
      type: GraphQLInt,
      defaultValue: 400
    },
    height: {
      type: GraphQLInt
    }
  },
  resolve: resolveFixed
}

const fluid = {
  type: new GraphQLObjectType({
    name: 'SanityImageFluid',
    fields: {
      base64: {type: GraphQLString},
      aspectRatio: {type: GraphQLFloat},
      src: {type: GraphQLString},
      srcSet: {type: GraphQLString},
      sizes: {type: GraphQLString}
    }
  }),
  args: {
    maxWidth: {
      type: GraphQLInt,
      defaultValue: 800
    },
    maxHeight: {
      type: GraphQLInt
    },
    sizes: {
      type: GraphQLString
    }
  },
  resolve: resolveFluid
}

const extension = {
  fixed,
  fluid,
  resolutions: fixed,
  sizes: fluid
}
