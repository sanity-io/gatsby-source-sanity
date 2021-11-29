import {GraphQLEnumType, GraphQLFieldConfigMap} from 'gatsby/graphql'
import {getCacheKey, CACHE_KEYS} from '../util/cache'
import {ImageNode, ImageArgs, getGatsbyImageData} from './getGatsbyImageProps'

import {getGatsbyImageFieldConfig} from 'gatsby-plugin-image/graphql-utils'
import {PluginConfig} from '../util/validateConfig'

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
  name: `SanityGatsbyImagePlaceholder`,
  values: {
    DOMINANT_COLOR: {value: `dominantColor`},
    BLURRED: {value: `blurred`},
    NONE: {value: `none`},
  },
})

const extensions = new Map<string, GraphQLFieldConfigMap<any, any>>()

export function extendImageNode(config: PluginConfig): GraphQLFieldConfigMap<any, any> {
  const key = getCacheKey(config, CACHE_KEYS.IMAGE_EXTENSIONS)

  if (extensions.has(key)) {
    return extensions.get(key) as GraphQLFieldConfigMap<any, any>
  }

  const extension = getExtension(config)
  extensions.set(key, extension)
  return extension
}

function getExtension(config: PluginConfig): GraphQLFieldConfigMap<any, any> {
  const location = {projectId: config.projectId, dataset: config.dataset}
  return {
    gatsbyImageData: getGatsbyImageFieldConfig<any, any, any>(
      (image: ImageNode, args: ImageArgs) => getGatsbyImageData(image, args, location),
      {
        placeholder: {
          type: ImagePlaceholderType,
          defaultValue: `dominantColor`,
          description: `Format of generated placeholder image, displayed while the main image loads.
BLURRED: a blurred, low resolution image, encoded as a base64 data URI (default)
DOMINANT_COLOR: a solid color, calculated from the dominant color of the image.
NONE: no placeholder.`,
        },
        fit: {
          type: ImageFitType,
          defaultValue: 'fill',
        },
      },
    ) as any,
  }
}
