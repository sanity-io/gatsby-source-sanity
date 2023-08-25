import {SourceNodesArgs} from 'gatsby'
import type { PluginConfig } from './validateConfig'
import { CACHE_KEYS, getCacheKey } from './cache'

// FIXME: Should this use args.cache instead? args.store is an internal API.
export default function getPluginStatus(args: SourceNodesArgs) {
  return args.store.getState().status.plugins?.[`gatsby-source-sanity`]
}

export function getLastBuildTime(args: SourceNodesArgs, pluginConfig: PluginConfig): Date | undefined {
  const cacheKey = getCacheKey(pluginConfig, CACHE_KEYS.LAST_BUILD_KEY)
  try {
    return new Date(getPluginStatus(args)[cacheKey])
  } catch (error) {
    // Not a date, return undefined
    return
  }
}

export async function registerBuildTime(args: SourceNodesArgs, pluginConfig: PluginConfig) {
  const cacheKey = getCacheKey(pluginConfig, CACHE_KEYS.LAST_BUILD_KEY)
  args.actions.setPluginStatus({
    ...(getPluginStatus(args) || {}),
    [cacheKey]: new Date().toISOString(),
  })
}
