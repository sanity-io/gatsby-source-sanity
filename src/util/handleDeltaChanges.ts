import {SanityClient} from '@sanity/client'
import {SourceNodesArgs} from 'gatsby'
import {getTypeName, ProcessingOptions, toGatsbyNode} from './normalize'
import debug from '../debug'
import {SanityDocument} from '../types/sanity'
import {registerBuildTime} from './getPluginStatus'

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
  processingOptions,
}: {
  args: SourceNodesArgs
  lastBuildTime: Date
  client: SanityClient
  processingOptions: ProcessingOptions
}): Promise<boolean> {
  await sleep(SLEEP_DURATION)

  try {
    const changedDocs = await client.fetch(
      '*[!(_type match "system.**") && _updatedAt > $timestamp]',
      {
        timestamp: lastBuildTime.toISOString(),
      },
    )
    handleChangedDocuments(args, changedDocs, processingOptions)
    registerBuildTime(args)
    args.reporter.info(`[sanity] ${changedDocs.length} documents updated.`)
    return true
  } catch (error) {
    debug(`[sanity] failed to handleDeltaChanges`, error)
    return false
  }
}

function handleChangedDocuments(
  args: SourceNodesArgs,
  changedDocs: SanityDocument[],
  processingOptions: ProcessingOptions,
) {
  const {reporter, actions} = args
  const {typeMap} = processingOptions

  return changedDocs.reduce((count, doc) => {
    const type = getTypeName(doc._type)
    if (!typeMap.objects[type]) {
      reporter.warn(
        `[sanity] Document "${doc._id}" has type ${doc._type} (${type}), which is not declared in the GraphQL schema. Make sure you run "graphql deploy". Skipping document.`,
      )
      return count
    }

    debug('%s document with ID %s', 'Changed', doc._id)
    actions.createNode(toGatsbyNode(doc, processingOptions))
    return count + 1
  }, 0)
}
