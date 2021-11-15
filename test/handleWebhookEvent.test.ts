import {SanityWebhookDeleteBody} from '../src/types/sanity'
import {validateWebhookPayload} from '../src/util/handleWebhookEvent'

const DeleteHook: SanityWebhookDeleteBody = {
  dataset: 'production',
  projectId: 'projectId',
  documentId: 'doc',
  operation: 'delete',
}

const DeleteHookFaulty = {
  dataset: 'production',
  projectId: 'projectId',
}

const V1Hooks = {
  ids: {
    created: [],
    updated: [],
    deleted: [],
  },
}

test('webhook payload - delete', () => {
  expect(validateWebhookPayload(DeleteHook)).toEqual('delete-operation')
})

test('webhook payload - delete faulty', () => {
  expect(validateWebhookPayload(DeleteHookFaulty)).toEqual(false)
})

test('webhook payload - V1', () => {
  expect(validateWebhookPayload(V1Hooks)).toEqual(false)
})

test('webhook payload - create/update', () => {
  expect(validateWebhookPayload({})).toEqual(false)
})
