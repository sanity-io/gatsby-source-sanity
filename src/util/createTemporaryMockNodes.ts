import {removeGatsbyInternalProps} from './removeGatsbyInternalProps'
import {GatsbyContext} from '../types/gatsby'
import {PluginConfig} from '../gatsby-node'
import {getCacheKey, CACHE_KEYS, StateCache} from './cache'
import {TypeMap, defaultTypeMap} from './remoteGraphQLSchema'
import debug from '../debug'

/**
 * Gatsby doesn't generate collection queries for declared third-party schemas,
 * and declaring a schema also causes all sorts of weird and hard to debug problems.
 *
 * This function reads a generated type map of a remote GraphQL schema and generates
 * example values for each schema type, then creates Gatsby nodes for each type,
 * which results in Gatsby generating queries and schema types that have all the
 * possible fields included. Once the schema is created, we remove the mock nodes
 * so they are not returned in queries. This is done through a bit of a hack,
 * which utilizes the exposed `emitter` on the Gatsby context and listening for
 * the `SET_SCHEMA` action to occur. These are internals and might change in the
 * future, but we rely on them for now because the alternative is to require data
 * to be present and have representative values in all fields before one can start
 * writing queries.
 *
 * There is a community effort (with Gatsby HQ support upcoming) to introduce a
 * proper API for declaring schema types, which will make this hack unnecessary.
 * Until it lands, this is the best we can do.
 */
export async function createTemporaryMockNodes(
  context: GatsbyContext,
  pluginConfig: PluginConfig,
  stateCache: StateCache,
) {
  const {emitter, actions, reporter} = context
  const {createNode, deleteNode} = actions

  // Sanity-check (heh) some undocumented, half-internal APIs
  const canMock = emitter && typeof emitter.on === 'function' && typeof emitter.off === 'function'
  if (!canMock) {
    reporter.warn('[sanity] `emitter` API not received, Gatsby internals might have changed')
    reporter.warn('[sanity] Please create issue: https://github.com/sanity-io/gatsby-source-sanity')
    return
  }

  const typeMapKey = getCacheKey(pluginConfig, CACHE_KEYS.TYPE_MAP)
  const typeMap = (stateCache[typeMapKey] || defaultTypeMap) as TypeMap
  const exampleValues = typeMap.exampleValues
  const exampleTypes = exampleValues && Object.keys(exampleValues)
  if (!exampleTypes || exampleTypes.length === 0) {
    if (Object.keys(typeMap.objects).length > 0) {
      reporter.warn('[sanity] No example values generated, fields might be missing!')
    }
    return
  }

  const onSchemaUpdate = () => {
    debug('Schema updated, removing mock nodes')
    exampleTypes.forEach(typeName => {
      deleteNode({node: exampleValues[typeName]})
    })

    emitter.off('SET_SCHEMA', onSchemaUpdate)
  }

  debug('Creating mock nodes with example value')
  exampleTypes.forEach(typeName => {
    createNode(removeGatsbyInternalProps(exampleValues[typeName]))
  })

  emitter.on('SET_SCHEMA', onSchemaUpdate)
}
