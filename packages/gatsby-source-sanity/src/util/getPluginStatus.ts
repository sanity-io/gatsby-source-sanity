import {SourceNodesArgs} from 'gatsby'

export default function getPluginStatus(args: SourceNodesArgs) {
  return args.store.getState().status.plugins?.[`gatsby-source-sanity`]
}
