import {createElement} from 'react'
import {GatsbySSR, RenderBodyArgs} from 'gatsby'

export const onRenderBody: GatsbySSR['onRenderBody'] = ({
  setHeadComponents,
}: RenderBodyArgs): any => {
  setHeadComponents([
    createElement('link', {
      rel: 'preconnect',
      key: 'sanity-cdn-preconnect',
      href: 'https://cdn.sanity.io',
    }),
  ])
}
