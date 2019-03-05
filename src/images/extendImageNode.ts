import {
  GraphQLObjectType,
  GraphQLString,
  GraphQLFloat,
  GraphQLInt,
  GraphQLFieldConfig,
  GraphQLEnumType,
} from 'gatsby/graphql'
import {GatsbyContext, GatsbyOnNodeTypeContext} from '../types/gatsby'
import {PluginConfig} from '../gatsby-node'
import {
  getFixedGatsbyImage,
  getFluidGatsbyImage,
  ImageNode,
  FixedArgs,
  FluidArgs,
  DEFAULT_FLUID_MAX_WIDTH,
  DEFAULT_FIXED_WIDTH,
} from './getGatsbyImageProps'
import {getCacheKey, CACHE_KEYS} from '../util/cache'

const ImageFormatType = new GraphQLEnumType({
  name: 'SanityImageFormat',
  values: {
    NO_CHANGE: {value: ''},
    JPG: {value: 'jpg'},
    PNG: {value: 'png'},
    WEBP: {value: 'webp'},
  },
})

const extensions = new Map()

export function extendImageNode(
  context: GatsbyContext & GatsbyOnNodeTypeContext,
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
        base64: {type: GraphQLString},
        aspectRatio: {type: GraphQLFloat},
        width: {type: GraphQLFloat},
        height: {type: GraphQLFloat},
        src: {type: GraphQLString},
        srcSet: {type: GraphQLString},
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
        base64: {type: GraphQLString},
        aspectRatio: {type: GraphQLFloat},
        src: {type: GraphQLString},
        srcSet: {type: GraphQLString},
        srcWebp: {type: GraphQLString},
        srcSetWebp: {type: GraphQLString},
        sizes: {type: GraphQLString},
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

  return {fixed, fluid}
}
