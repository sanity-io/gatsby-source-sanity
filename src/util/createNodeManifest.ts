import {Actions, Node, SourceNodesArgs} from 'gatsby'
import {getGatsbyVersion} from 'gatsby-core-utils'
import {lt, prerelease} from 'semver'
import debug from '../debug'
import {SanityInputNode} from '../types/gatsby'

let warnOnceForNoSupport: boolean
let warnOnceToUpgradeGatsby: boolean

const GATSBY_VERSION_MANIFEST_V2 = `4.3.0`
const gatsbyVersion = getGatsbyVersion()
const gatsbyVersionIsPrerelease = prerelease(gatsbyVersion)
const shouldUpgradeGatsbyVersion =
  lt(gatsbyVersion, GATSBY_VERSION_MANIFEST_V2) && !gatsbyVersionIsPrerelease

export default function createNodeManifest(
  actions: Actions,
  args: SourceNodesArgs,
  node: SanityInputNode,
  publishedId: string,
) {
  try {
    const {unstable_createNodeManifest} = actions as Actions & {
      unstable_createNodeManifest: (props: {
        manifestId: string
        node: Node
        updatedAtUTC: string
      }) => void
    }
    const {getNode} = args
    const type = node.internal.type
    const autogeneratedTypes = ['SanityFileAsset', 'SanityImageAsset']

    const createNodeManifestIsSupported = typeof unstable_createNodeManifest === 'function'
    const nodeTypeNeedsManifest = autogeneratedTypes.includes(type) === false
    const shouldCreateNodeManifest = createNodeManifestIsSupported && nodeTypeNeedsManifest

    if (shouldCreateNodeManifest) {
      if (shouldUpgradeGatsbyVersion && !warnOnceToUpgradeGatsby) {
        console.warn(
          `Your site is doing more work than it needs to for Preview, upgrade to Gatsby ^${GATSBY_VERSION_MANIFEST_V2} for better performance`,
        )
        warnOnceToUpgradeGatsby = true
      }

      const updatedAt = new Date((node._updatedAt as string) || Date.now())

      const nodeForManifest = getNode(node.id) as Node
      const manifestId = `${publishedId}-${updatedAt.toISOString()}`

      unstable_createNodeManifest({
        manifestId,
        node: nodeForManifest,
        updatedAtUTC: updatedAt.toUTCString(),
      })
    } else if (!createNodeManifestIsSupported && !warnOnceForNoSupport) {
      args.reporter.warn(
        `Sanity: Your version of Gatsby core doesn't support Content Sync (via the unstable_createNodeManifest action). Please upgrade to the latest version to use Content Sync in your site.`,
      )
      warnOnceForNoSupport = true
    }
  } catch (e) {
    let result = (e as Error).message
    debug(`Cannot create node manifest`, result)
  }
}
