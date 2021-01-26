import {
  GraphQLObjectType,
  GraphQLString,
  GraphQLFloat,
  GraphQLInt,
  GraphQLEnumType,
  GraphQLNonNull,
  GraphQLFieldConfig,
  GraphQLJSON,
} from 'gatsby/graphql'
import {PluginConfig} from '../gatsby-node'
import {getCacheKey, CACHE_KEYS} from '../util/cache'
import {
  getFixedGatsbyImage,
  getFluidGatsbyImage,
  ImageNode,
  FixedArgs,
  FluidArgs,
  DEFAULT_FLUID_MAX_WIDTH,
  DEFAULT_FIXED_WIDTH,
  getGatsbyImageData,
  GatsbyImageDataArgs,
} from './getGatsbyImageProps'

const ImageFormatType = new GraphQLEnumType({
  name: 'SanityImageFormat',
  values: {
    NO_CHANGE: {value: ''},
    JPG: {value: 'jpg'},
    PNG: {value: 'png'},
    WEBP: {value: 'webp'},
  },
})

const ImageFitType = new GraphQLEnumType({
  name: 'SanityImageFit',
  values: {
    CLIP: {value: 'clip'},
    CROP: {value: 'crop'},
    FILL: {value: 'fill'},
    FILLMAX: {value: 'fillmax'},
    MAX: {value: 'max'},
    SCALE: {value: 'scale'},
    MIN: {value: 'min'},
  },
})

const ImageLayoutType = new GraphQLEnumType({
  name: `GatsbyImageLayout`,
  values: {
    FIXED: {value: `fixed`},
    FULL_WIDTH: {value: `fullWidth`},
    CONSTRAINED: {value: `constrained`},
  },
})

const ImagePlaceholderType = new GraphQLEnumType({
  name: `GatsbyImagePlaceholder`,
  values: {
    DOMINANT_COLOR: {value: `dominantColor`},
    BLURRED: {value: `blurred`},
    NONE: {value: `none`},
  },
})

const extensions = new Map()

export function extendImageNode(
  config: PluginConfig,
): {[key: string]: GraphQLFieldConfig<any, any>} {
  const key = getCacheKey(config, CACHE_KEYS.IMAGE_EXTENSIONS)

  if (extensions.has(key)) {
    return extensions.get(key)
  }

  const extension = getExtension(config)
  extensions.set(key, extension)
  return extension
}

function getExtension(config: PluginConfig) {
  const location = {projectId: config.projectId, dataset: config.dataset}
  const fixed = {
    type: new GraphQLObjectType({
      name: 'SanityImageFixed',
      fields: {
        width: {type: new GraphQLNonNull(GraphQLFloat)},
        height: {type: new GraphQLNonNull(GraphQLFloat)},
        src: {type: new GraphQLNonNull(GraphQLString)},
        srcSet: {type: new GraphQLNonNull(GraphQLString)},
        base64: {type: GraphQLString},
        srcWebp: {type: GraphQLString},
        srcSetWebp: {type: GraphQLString},
      },
    }),
    args: {
      width: {
        type: GraphQLInt,
        defaultValue: DEFAULT_FIXED_WIDTH,
      },
      height: {
        type: GraphQLInt,
      },
      toFormat: {
        type: ImageFormatType,
        defaultValue: '',
      },
    },
    resolve: (image: ImageNode, args: FixedArgs) => getFixedGatsbyImage(image, args, location),
  }

  const fluid = {
    type: new GraphQLObjectType({
      name: 'SanityImageFluid',
      fields: {
        aspectRatio: {type: new GraphQLNonNull(GraphQLFloat)},
        src: {type: new GraphQLNonNull(GraphQLString)},
        srcSet: {type: new GraphQLNonNull(GraphQLString)},
        sizes: {type: new GraphQLNonNull(GraphQLString)},
        base64: {type: GraphQLString},
        srcWebp: {type: GraphQLString},
        srcSetWebp: {type: GraphQLString},
      },
    }),
    args: {
      maxWidth: {
        type: GraphQLInt,
        defaultValue: DEFAULT_FLUID_MAX_WIDTH,
      },
      maxHeight: {
        type: GraphQLInt,
      },
      sizes: {
        type: GraphQLString,
      },
      toFormat: {
        type: ImageFormatType,
        defaultValue: '',
      },
    },
    resolve: (image: ImageNode, args: FluidArgs) => getFluidGatsbyImage(image, args, location),
  }

  const gatsbyImageData = {
    type: new GraphQLNonNull(GraphQLJSON),
    args: {
      layout: {
        type: ImageLayoutType,
        defaultValue: `constrained`,
        description: `
            The layout for the image.
            FIXED: A static image sized, that does not resize according to the screen width
            FULL_WIDTH: The image resizes to fit its container. Pass a "sizes" option if it isn't going to be the full width of the screen. 
            CONSTRAINED: Resizes to fit its container, up to a maximum width, at which point it will remain fixed in size.
            `,
      },
      width: {
        type: GraphQLInt,
        description: `
        The display width of the generated image for layout = FIXED, and the display width of the largest image for layout = CONSTRAINED.  
        The actual largest image resolution will be this value multiplied by the largest value in outputPixelDensities
        Ignored if layout = FLUID.
        `,
      },
      height: {
        type: GraphQLInt,
        description: `
        If set, the height of the generated image. If omitted, it is calculated from the supplied width, matching the aspect ratio of the source image.`,
      },
      placeholder: {
        type: ImagePlaceholderType,
        defaultValue: `dominantColor`,
        description: `
            Format of generated placeholder image, displayed while the main image loads. 
            BLURRED: a blurred, low resolution image, encoded as a base64 data URI (default)
            DOMINANT_COLOR: a solid color, calculated from the dominant color of the image. 
            NONE: no placeholder.`,
      },
      sizes: {
        type: GraphQLString,
        description: `
            The "sizes" property, passed to the img tag. This describes the display size of the image. 
            This does not affect the generated images, but is used by the browser to decide which images to download. You can leave this blank for fixed images, or if the responsive image
            container will be the full width of the screen. In these cases we will generate an appropriate value.
        `,
      },
      aspectRatio: {
        type: GraphQLFloat,
        description: `
        If set along with width or height, this will set the value of the other dimension to match the provided aspect ratio, cropping the image if needed. 
        If neither width or height is provided, height will be set based on the intrinsic width of the source image.
        `,
      },
      fit: {
        type: ImageFitType,
        defaultValue: 'cover',
      },
    },
    resolve: (image: ImageNode, args: GatsbyImageDataArgs) =>
      getGatsbyImageData(image, args, location),
  }

  return {fixed, fluid, gatsbyImageData}
}
