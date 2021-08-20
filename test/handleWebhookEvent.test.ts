import {SanityWebhookV1Body, SanityWebhookV2Body} from '../src/types/sanity'
import {validateWebhookPayload} from '../src/util/handleWebhookEvent'

const V2: SanityWebhookV2Body = {
  dataset: 'production',
  projectId: 'projectId',
  operation: 'create',
  __webhooksVersion: 'v2',
  documentId: 'doc',
  after: {
    _id: '_id',
    _rev: '_rev',
    _createdAt: '_createdAt',
    _updatedAt: '_updatedAt',
    _type: '_type',
  },
}

const V2Faulty: SanityWebhookV2Body = {
  dataset: 'production',
  projectId: 'projectId',
  operation: 'create',
  // Different version
  __webhooksVersion: '2' as any,
  documentId: 'doc',
  after: {
    _id: '_id',
    _rev: '_rev',
    _createdAt: '_createdAt',
    _updatedAt: '_updatedAt',
    _type: '_type',
  },
}

const V1: SanityWebhookV1Body = {
  ids: {
    created: [],
    updated: [],
    deleted: [],
  },
}

const V1Faulty = {
  ids: {
    updated: [],
    deleted: [],
  },
}

const V2withIds = {
  dataset: 'production',
  projectId: 'projectId',
  operation: 'create',
  __webhooksVersion: 'v2',
  documentId: 'doc',
  ids: {
    created: [],
    updated: [],
    deleted: [],
  },
  after: {
    _id: '_id',
    _rev: '_rev',
    _createdAt: '_createdAt',
    _updatedAt: '_updatedAt',
    _type: '_type',
  },
}

test('webhook payload - V2', () => {
  expect(validateWebhookPayload(V2)).toEqual('v2')
})

test('webhook payload - faulty V2', () => {
  expect(validateWebhookPayload(V2Faulty)).toEqual(false)
})

test('webhook payload - V1', () => {
  expect(validateWebhookPayload(V1)).toEqual('v1')
})

test('webhook payload - faulty V1', () => {
  expect(validateWebhookPayload(V1Faulty as any)).toEqual(false)
})

test('webhook payload - V2 w/ ids', () => {
  expect(validateWebhookPayload(V2withIds as any)).toEqual('v2')
})
