import {graphql} from 'gatsby'

export const sanityImageFixed = graphql`
  fragment GatsbySanityImageFixed on SanityImageFixed {
    base64
    width
    height
    src
    srcSet
  }
`

export const sanityImageFixedNoBase64 = graphql`
  fragment GatsbySanityImageFixed_noBase64 on SanityImageFixed {
    width
    height
    src
    srcSet
  }
`

export const sanityImageFixedPreferWebp = graphql`
  fragment GatsbySanityImageFixed_withWebp on SanityImageFixed {
    base64
    width
    height
    src
    srcSet
    srcWebp
    srcSetWebp
  }
`

export const sanityImageFixedPreferWebpNoBase64 = graphql`
  fragment GatsbySanityImageFixed_withWebp_noBase64 on SanityImageFixed {
    width
    height
    src
    srcSet
    srcWebp
    srcSetWebp
  }
`

export const sanityImageFluid = graphql`
  fragment GatsbySanityImageFluid on SanityImageFluid {
    base64
    aspectRatio
    src
    srcSet
    sizes
  }
`

export const sanityImageFluidNoBase64 = graphql`
  fragment GatsbySanityImageFluid_noBase64 on SanityImageFluid {
    aspectRatio
    src
    srcSet
    sizes
  }
`

export const sanityImageFluidPreferWebp = graphql`
  fragment GatsbySanityImageFluid_withWebp on SanityImageFluid {
    base64
    aspectRatio
    src
    srcSet
    srcWebp
    srcSetWebp
    sizes
  }
`

export const SanityImageAssetFluidPreferWebpNoBase64 = graphql`
  fragment GatsbySanityImageFluid_withWebp_noBase64 on SanityImageFluid {
    aspectRatio
    src
    srcSet
    srcWebp
    srcSetWebp
    sizes
  }
`
