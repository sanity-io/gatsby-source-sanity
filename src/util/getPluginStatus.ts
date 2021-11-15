import {SourceNodesArgs} from 'gatsby'

export default function getPluginStatus(args: SourceNodesArgs) {
  return args.store.getState().status.plugins?.[`gatsby-source-sanity`]
}

const LAST_BUILD_KEY = "lastBuildTime"

export function getLastBuildTime(args: SourceNodesArgs): Date | undefined {
  try {
    return new Date(getPluginStatus(args)[LAST_BUILD_KEY])
  } catch (error) {
    // Not a date, return undefined
    return
  }
}

export async function registerBuildTime(args: SourceNodesArgs) {
  args.actions.setPluginStatus({
    ...(getPluginStatus(args) || {}),
    [LAST_BUILD_KEY]: new Date().toISOString(),
  })
}