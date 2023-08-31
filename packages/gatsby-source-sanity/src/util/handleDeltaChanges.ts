import {SanityClient} from '@sanity/client'
import {SourceNodesArgs} from 'gatsby'
import debug from '../debug'
import {SanityDocument} from '../types/sanity'
import {SyncWithGatsby} from './getSyncWithGatsby'
import { CACHE_KEYS, getCacheKey } from './cache'
import { PluginConfig } from './validateConfig'

export const sleep = (ms: number) => {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// Ensures document changes are persisted to the query engine.
const SLEEP_DURATION = 500

/**
 * Queries all documents changed since last build & adds them to Gatsby's store
 */
export default async function handleDeltaChanges({
  args,
  lastBuildTime,
  client,
  syncWithGatsby,
  config,
}: {
  args: SourceNodesArgs
  lastBuildTime: Date
  client: SanityClient
  syncWithGatsby: SyncWithGatsby
  config: PluginConfig
}): Promise<boolean> {
  await sleep(SLEEP_DURATION)

  try {
    const changedDocs = await client.fetch<SanityDocument[]>(
      '*[!(_type match "system.**") && _updatedAt > $timestamp]',
      {
        timestamp: lastBuildTime.toISOString(),
      },
    )
    changedDocs.forEach((doc) => {
      syncWithGatsby(doc._id, doc)
    })
    await args.cache.set(getCacheKey(config, CACHE_KEYS.LAST_BUILD), new Date().toISOString())
    args.reporter.info(`[sanity] ${changedDocs.length} documents updated.`)
    return true
  } catch (error) {
    debug(`[sanity] failed to handleDeltaChanges`, error)
    return false
  }
}
