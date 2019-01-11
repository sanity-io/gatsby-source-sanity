import {PluginConfig} from '../gatsby-node'

export type StateCache = {
  [key: string]: any
}

export enum CACHE_KEYS {
  TYPE_MAP = 'typeMap'
}

export function getCacheKey(config: PluginConfig, suffix: CACHE_KEYS) {
  return `${config.projectId}-${config.dataset}-${suffix}`
}
