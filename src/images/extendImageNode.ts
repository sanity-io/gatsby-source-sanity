import {
  GraphQLObjectType,
  GraphQLString,
  GraphQLFloat,
  GraphQLInt,
  GraphQLEnumType,
  GraphQLNonNull,
  GraphQLFieldConfig,
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
} from './getGatsbyImageProps'

import {getGatsbyImageFieldConfig} from 'gatsby-plugin-image/graphql-utils'

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

  return {
    fixed,
    fluid,
    gatsbyImageData: getGatsbyImageFieldConfig(getGatsbyImageData, {
      placeholder: {
        type: ImagePlaceholderType,
        defaultValue: `dominantColor`,
        description: `
          Format of generated placeholder image, displayed while the main image loads. 
          BLURRED: a blurred, low resolution image, encoded as a base64 data URI (default)
          DOMINANT_COLOR: a solid color, calculated from the dominant color of the image. 
          NONE: no placeholder.`,
      },
      fit: {
        type: ImageFitType,
        defaultValue: 'cover',
      },
    }),
  }
}
