# Change Log

All notable changes will be documented in this file.

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
