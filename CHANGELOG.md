# Change Log

All notable changes will be documented in this file.

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
