import {createElement} from 'react'
import {GatsbySsrContext} from './types/gatsby'
import {PluginConfig} from './gatsby-node'

export const onRenderBody = ({setHeadComponents}: GatsbySsrContext, config: PluginConfig) => {
  setHeadComponents([
    createElement('link', {
      rel: 'preconnect',
      key: 'sanity-cdn-preconnect',
      href: 'https://cdn.sanity.io',
    }),
  ])
}
