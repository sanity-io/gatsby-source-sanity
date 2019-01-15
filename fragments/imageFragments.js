import {graphql} from 'gatsby'

export const sanityImageResolutions = graphql`
  fragment GatsbySanityImageResolutions on SanityImageFixed {
    base64
    width
    height
    src
    srcSet
  }
`

export const sanityImageResolutionsNoBase64 = graphql`
  fragment GatsbySanityImageResolutions_noBase64 on SanityImageFixed {
    width
    height
    src
    srcSet
  }
`

export const sanityImageSizes = graphql`
  fragment GatsbySanityImageSizes on SanityImageFluid {
    base64
    aspectRatio
    src
    srcSet
    sizes
  }
`

export const sanityImageSizesNoBase64 = graphql`
  fragment GatsbySanityImageSizes_noBase64 on SanityImageFluid {
    aspectRatio
    src
    srcSet
    sizes
  }
`

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
