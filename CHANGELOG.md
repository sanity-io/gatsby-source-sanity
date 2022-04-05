# Change Log

All notable changes will be documented in this file.

## 7.4.2

### Fixes

- Improve incremental builds of large datasets by paginating fetching of document IDs, and optimizing their lookups using a set ([#149](https://github.com/sanity-io/gatsby-source-sanity/issues/149)).

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
