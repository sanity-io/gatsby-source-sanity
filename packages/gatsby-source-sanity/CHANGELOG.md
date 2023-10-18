<!-- markdownlint-disable --><!-- textlint-disable -->

# 📓 Changelog

All notable changes to this project will be documented in this file. See
[Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## [7.9.1](https://github.com/sanity-io/gatsby-source-sanity/compare/v7.9.0...v7.9.1) (2023-10-18)

### Bug Fixes

- sanityClient() does not accept undefined as apiHost ([#272](https://github.com/sanity-io/gatsby-source-sanity/issues/272)) ([224b994](https://github.com/sanity-io/gatsby-source-sanity/commit/224b994aed47676fa6c6b1a1c5b7a6c20624ce8f))

## [7.9.0](https://github.com/sanity-io/gatsby-source-sanity/compare/v7.8.1...v7.9.0) (2023-10-17)

### Features

- support shared content ([#269](https://github.com/sanity-io/gatsby-source-sanity/issues/269)) ([b77309f](https://github.com/sanity-io/gatsby-source-sanity/commit/b77309f03288bc29882066f2811fcc8869fc7e35))

### Bug Fixes

- only apply prefix once ([#255](https://github.com/sanity-io/gatsby-source-sanity/issues/255)) ([bd64f80](https://github.com/sanity-io/gatsby-source-sanity/commit/bd64f8042f14e48a28d4b30bc415cdeb03e1c9d5))

## [7.8.1](https://github.com/sanity-io/gatsby-source-sanity/compare/v7.8.0...v7.8.1) (2023-08-02)

### Bug Fixes

- **deps:** update non-major ([#239](https://github.com/sanity-io/gatsby-source-sanity/issues/239)) ([02eecf6](https://github.com/sanity-io/gatsby-source-sanity/commit/02eecf692cdc6c5e2f13c27b2a288b5ad5a9a369))
- use resolver for lists ([#248](https://github.com/sanity-io/gatsby-source-sanity/issues/248)) ([e587dce](https://github.com/sanity-io/gatsby-source-sanity/commit/e587dcecc793196f7d2fb71fcb447f2f28f32d1b))

## [7.8.0](https://github.com/sanity-io/gatsby-source-sanity/compare/v7.7.0...v7.8.0) (2023-07-12)

### Features

- add support for type prefix ([#243](https://github.com/sanity-io/gatsby-source-sanity/issues/243)) ([48ab7ea](https://github.com/sanity-io/gatsby-source-sanity/commit/48ab7ea1e4a8bcc8082df1bc6efe27071438e159))

## [7.7.0](https://github.com/sanity-io/gatsby-source-sanity/compare/v7.6.3...v7.7.0) (2023-07-06)

### Features

- use `[@link](https://github.com/link)` directive instead of custom resolvers ([#242](https://github.com/sanity-io/gatsby-source-sanity/issues/242)) ([834e5bf](https://github.com/sanity-io/gatsby-source-sanity/commit/834e5bf2f666f94328901886939358d2eae071b1))

## [7.6.3](https://github.com/sanity-io/gatsby-source-sanity/compare/v7.6.2...v7.6.3) (2023-02-04)

### Bug Fixes

- **deps:** update dependencies (non-major) to ^4.5.0 ([#219](https://github.com/sanity-io/gatsby-source-sanity/issues/219)) ([f9639c7](https://github.com/sanity-io/gatsby-source-sanity/commit/f9639c7c6d1d63d5967dc5f1a8b0bcb9fb40ac22))

## [7.6.2](https://github.com/sanity-io/gatsby-source-sanity/compare/v7.6.1...v7.6.2) (2023-01-20)

### Bug Fixes

- **deps:** update dependencies (non-major) ([#201](https://github.com/sanity-io/gatsby-source-sanity/issues/201)) ([991b913](https://github.com/sanity-io/gatsby-source-sanity/commit/991b91362bd8df8aa360ec7e77f2c87ae7d1a5de))
- getDocumentIds pagination query if custom \_id values are used ([#208](https://github.com/sanity-io/gatsby-source-sanity/issues/208)) ([a3357dc](https://github.com/sanity-io/gatsby-source-sanity/commit/a3357dc822019f30571fcf35bac1f7e762fbaf8b))

## [7.6.1](https://github.com/sanity-io/gatsby-source-sanity/compare/v7.6.0...v7.6.1) (2022-12-14)

### Bug Fixes

- **deps:** Revert axios v1 bump in [#185](https://github.com/sanity-io/gatsby-source-sanity/issues/185) ([#207](https://github.com/sanity-io/gatsby-source-sanity/issues/207)) ([820c7b2](https://github.com/sanity-io/gatsby-source-sanity/commit/820c7b2849dd831308cd0d213f7de60007849993))

## [7.6.0](https://github.com/sanity-io/gatsby-source-sanity/compare/v7.5.1...v7.6.0) (2022-11-22)

### Features

- support gatsby v5 ([#195](https://github.com/sanity-io/gatsby-source-sanity/issues/195)) ([063d533](https://github.com/sanity-io/gatsby-source-sanity/commit/063d5335f23f667a0e5e1b087d886d4ec9989a97))

### Bug Fixes

- **deps:** update dependency @sanity/client to v3 ([#178](https://github.com/sanity-io/gatsby-source-sanity/issues/178)) ([c7952b7](https://github.com/sanity-io/gatsby-source-sanity/commit/c7952b7fe4edcc80f9a2f0becb26812653f550fc))
- **deps:** update dependency axios to v1 ([#185](https://github.com/sanity-io/gatsby-source-sanity/issues/185)) ([7b0d7e6](https://github.com/sanity-io/gatsby-source-sanity/commit/7b0d7e6efe272cc4d278bfda39547727f9f5221c))
- **deps:** update dependency semver to ^7.3.8 ([#184](https://github.com/sanity-io/gatsby-source-sanity/issues/184)) ([504db33](https://github.com/sanity-io/gatsby-source-sanity/commit/504db337574e93e297ba2e99869ac851438dddf3))

## [7.5.1](https://github.com/sanity-io/gatsby-source-sanity/compare/v7.5.0...v7.5.1) (2022-09-29)

### Bug Fixes

- bump @sanity/image-url to fix rounding errors in crop rects ([#132](https://github.com/sanity-io/gatsby-source-sanity/issues/132)) ([b894dca](https://github.com/sanity-io/gatsby-source-sanity/commit/b894dca5f0fd8422754e9e4fcf88fbdd967c2f0d))
- **deps:** update dependencies (non-major) ([#165](https://github.com/sanity-io/gatsby-source-sanity/issues/165)) ([bb6536b](https://github.com/sanity-io/gatsby-source-sanity/commit/bb6536ba96f5844a8bbc7b84a1e5dc2e93b160b5))

## [7.5.0](https://github.com/sanity-io/gatsby-source-sanity/compare/v7.4.1...v7.5.0) (2022-09-29)

### Bug Fixes

- helps incremental builds of large datasets by paginating the ([2a7ff63](https://github.com/sanity-io/gatsby-source-sanity/commit/2a7ff638af621647544137ee9030371f401bff5f)), closes [#149](https://github.com/sanity-io/gatsby-source-sanity/issues/149)
- use latest image cdn packages ([#176](https://github.com/sanity-io/gatsby-source-sanity/issues/176)) ([fb7026b](https://github.com/sanity-io/gatsby-source-sanity/commit/fb7026bd019f98066107e00eca3d8cdfe6819fbf))

## [7.4.2](https://github.com/sanity-io/gatsby-source-sanity/compare/v7.4.1...v7.4.2) (2022-09-28)

### Bug Fixes

- helps incremental builds of large datasets by paginating the ([2a7ff63](https://github.com/sanity-io/gatsby-source-sanity/commit/2a7ff638af621647544137ee9030371f401bff5f)), closes [#149](https://github.com/sanity-io/gatsby-source-sanity/issues/149)
- use latest image cdn packages ([#176](https://github.com/sanity-io/gatsby-source-sanity/issues/176)) ([fb7026b](https://github.com/sanity-io/gatsby-source-sanity/commit/fb7026bd019f98066107e00eca3d8cdfe6819fbf))

## 7.4.1

### Fixes

- Prevent the `resolveReferences` gatsby function's `remapRawFields` call from attaching `Internal` object to the resolved gatsby node, fixing Gatsby Cloud incremental build issues.

## 7.4.0

### Changes

- Add Gatsby Image CDN support ([#148](https://github.com/sanity-io/gatsby-source-sanity/pull/148))

## 7.3.2

### Fixes

- Ensure `semver` doesn't break Gatsby v3 builds when creating node manifests

## 7.3.1

### Changes

- Use Gatsby's node manifest API v2 ([#140](https://github.com/sanity-io/gatsby-source-sanity/pull/140))

## 7.3.0

### Changes

- Support for webhook-based previews through Gatsby's preview servers

## 7.2.1

### Fixes

- Watch Mode: Instead of relying on a fixed `bufferTime` to batch updates, we're now waiting until Gatsby's internals are quiet to run updates.

## 7.2.0

### Changes

- Allow configuration of the `watchModeBuffer` option

## 7.1.0

### Changes

- Support for Gatsby v4

## 7.0.7

### Fixes

- Use automatic format for source images. Fixes WebP source images not being displayed on Safari 13 and below.

## 7.0.5

### Changes

- Add request tags to outgoing requests from plugin

### Fixes

- Remove outdated/unused image fragments

## 7.0.4

### Fixes

- Fix broken drafts overlaying and watch mode

## 7.0.3

### Fixes

- Bring back the gatsbyImageData on image nodes
- Set more specific peer deps + engines update

## 7.0.2

### Fixes

- Prevent API versioning error by specifying API version to use

## 7.0.0

### BREAKING

- Drop support for Gatsby v2 or earlier.
- Remove `getFluidGatsbyImage()` and `getFixedGatsbyImage()` in favor of `getGatsbyImageData()`.

See [Migration guide](MIGRATION.md) for more details.

### Changes

- Add support for Gatsby v3.
- Introduce `getGatsbyImageData()` that adds support for gatsby-plugin-image
- Fix race condition that sometimes causes Gatsby development instances to revert to the previously published version upon publish ([#87](https://github.com/sanity-io/gatsby-source-sanity/issues/87))
- Add Node v14 to test matrix
- Improve error reporting

## 6.0.5

### Changes

- Use official Gatsby type definitions where possible
- Add structured reporting for improved Gatsby Cloud integration
- Export `ImageFormat` type definition

## 6.0.4

### Changes

- Provide document count when sourcing nodes

## 6.0.3

### Changes

- Export image prop type interfaces

## 6.0.2

### Changes

- Exclude listener creation/updates from being sent in watch mode
- Add path resolution for typescript definitions

## 6.0.1

### Changes

- Optimize incremental builds when using the refresh endpoint with webhooks

## 6.0.0

### BREAKING

- Raw fields without an underscore prefix `rawBody` vs `_rawBody` have been removed, use the underscored version instead
- `sanity` prefix removed for fields that were not on document types (`sanityId` => `id`, `sanityChildren` => `children`)

### Fixes

- `_raw` fields now available in nested fields
- Several improvements to reference resolving in raw fields

## 5.0.3

### Fixes

- Add GraphQL resolvers on conflict-free Gatsby fields

### Changes

- Warn when renaming fields due to Gatsby internal prop conflicts

## 5.0.2

### Fixes

- Include original image size in srcSet

## 5.0.1

### Changes

- Add `<link rel="preconnect" href="https://cdn.sanity.io">` to `<head>`, potentially speeding up loading of images

## 5.0.0

### BREAKING

- `resolveReferences` no longer returns `_raw` fields - they are mapped to their original field names instead
- `resolveReferences` returns `null` if the reference cannot be resolved
- Image and file asset documents maintain their original document ID instead of remapping to a Gatsby node ID in UUID shape

## 4.0.5

### Changes

- Exposed `resolveReferences` method for rare cases where you need to resolve from userland/custom GraphQL resolvers

## 4.0.4

### Fixes

- The RootQuery type from the Sanity GraphQL API is no longer added as a type in Gatsby
- Document types that are not defined in the GraphQL schema are now skipped (with a warning) instead of preventing the build from completing

## 4.0.3

### Changes

- Add `dateformat` directive to date fields, reintroducing `dateFormat` field-level argument

## 4.0.2

### Changes

- Upgrade dependencies to their latest versions

## 4.0.1

### Fixes

- Try to resolve all lists with custom resolvers, since we cannot know whether or not they contain references at schema define time

## 4.0.0

### BREAKING

- Add `dontInfer` directive to declared schema types, which prevents fields that are not declared in the GraphQL schema from appearing in the Gatsby GraphQL schema. Remember to run `sanity graphql deploy` after changing your schema, or you will not be able to query for the new additions.

## 3.0.0

### BREAKING

- A deployed GraphQL schema is now _required_ to use the plugin. The reasoning behind this is that the generated/inferred schemas inside of Gatsby are very unpredictable - maintaining support for both inferred _and_ generated schemas is too much work.

### Fixes

- Compile an ES5 target in order for the Gatsby image props methods to be usable in older browsers

## 2.1.0

### Fixes

- Explicitly declare field resolvers for unions and reference fields. Fixes:
  - Fields that can be more than a single type (polymorphic fields)
  - Arrays containing both references _and_ inline objects are now handled

## 2.0.3

### Changes

- Allow passing image object to `getGatsbyImageProps()`

## 2.0.2

### Changes

- Replace URL parsing with browser-compatible version

## 2.0.0

### BREAKING

- Require Gatsby >= 2.2.0
- Explicitly define all fields based on GraphQL schema
