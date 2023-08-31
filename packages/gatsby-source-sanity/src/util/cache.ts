import {PluginConfig} from './validateConfig'

export type StateCache = {
  [key: string]: any
}

export enum CACHE_KEYS {
  TYPE_MAP = 'typeMap',
  GRAPHQL_SDL = 'graphqlSdl',
  IMAGE_EXTENSIONS = 'imageExt',
  LAST_BUILD = 'lastBuildTime',
  CONFIG_MAP = 'sanityConfigMap',
}

export type SanityConfigMap = {[key: string]: PluginConfig}

export function getCacheKey(config: PluginConfig, suffix: CACHE_KEYS) {
  return `${config.projectId}-${config.dataset}-${config.typePrefix ?? ''}-${suffix}`
}
