import test from 'node:test';
import assert from 'node:assert/strict';
import { DRAFT_SCHEMA, DRAFT_TTL, stableDraftJSON, draftPayload, mergeDraftValue, validateDeviceDraft, protectedDraftField } from '../lib/device-drafts.mjs';
const info = {
  "userId": 'u1',
  "organizationId": 'o1',
  "recordKey": 'risk:r1',
  "fingerprint": 'version-a',
  "now": 10000
};
const draft = () => ({
  "schema": DRAFT_SCHEMA,
  ...info,
  "savedAt": 9000,
  "expiresAt": 9000 + DRAFT_TTL,
  "forms": [],
  "states": {
    "risk": 'Draft observation'
  }
});
test('draft belongs to one account, company and record', () => {
  for (const key of ['userId', 'organizationId', 'recordKey']) assert.throws(() => validateDeviceDraft(draft(), {
    ...info,
    [key]: 'other'
  }), /another/);
});
test('current server fingerprint required', () => assert.throws(() => validateDeviceDraft(draft(), {
  ...info,
  "fingerprint": 'version-b'
}), /changed/));
test('draft expires after 24 hours', () => assert.throws(() => validateDeviceDraft(draft(), {
  ...info,
  "now": 9000 + DRAFT_TTL
}), /expired/));
test('future or extended expiry cannot bypass lifetime', () => {
  assert.throws(() => validateDeviceDraft({
    ...draft(),
    "savedAt": 900000
  }, info), /expired/);
  assert.throws(() => validateDeviceDraft({
    ...draft(),
    "expiresAt": 9000 + DRAFT_TTL + 1
  }, info), /expired/);
});
test('invalid draft schema and payload rejected', () => {
  assert.throws(() => validateDeviceDraft({
    ...draft(),
    "schema": 0
  }, info));
  assert.throws(() => validateDeviceDraft({
    ...draft(),
    "forms": {}
  }, info));
});
test('ordinary matching draft accepted', () => assert.equal(validateDeviceDraft(draft(), info).states.risk, 'Draft observation'));
test('nested signatures and formal decisions never stored', () => assert.deepEqual(draftPayload({
  "title": 'Observation',
  "actions": [{
    "id": 'a',
    "action": 'Investigate',
    "status": 'closed',
    "closure_evidence": 'Formal decision',
    "approved_by": 'u1'
  }],
  "password": 'secret',
  "confirmation": true
}), {
  "title": 'Observation',
  "actions": [{
    "id": 'a',
    "action": 'Investigate'
  }]
}));
test('recovery preserves current formal status and approval', () => assert.deepEqual(mergeDraftValue({
  "title": 'Current',
  "status": 'draft',
  "approved_by": null
}, {
  "title": 'Unfinished',
  "status": 'approved',
  "approved_by": 'other'
}), {
  "title": 'Unfinished',
  "status": 'draft',
  "approved_by": null
}));
test('array recovery retains protected values by item identity', () => {
  const result = mergeDraftValue([{
    "id": 'a',
    "status": 'open'
  }, {
    "id": 'b',
    "status": 'closed'
  }], [{
    "id": 'b',
    "text": 'Notes'
  }, {
    "id": 'a',
    "text": 'More notes'
  }]);
  assert.deepEqual(result, [{
    "id": 'b',
    "status": 'closed',
    "text": 'Notes'
  }, {
    "id": 'a',
    "status": 'open',
    "text": 'More notes'
  }]);
});
test('canonical fingerprint input ignores object property order', () => assert.equal(stableDraftJSON({
  "b": 2,
  "a": {
    "d": 4,
    "c": 3
  }
}), stableDraftJSON({
  "a": {
    "c": 3,
    "d": 4
  },
  "b": 2
})));
test('prototype keys cannot be restored', () => {
  const restored = mergeDraftValue({}, JSON.parse('{"__proto__":{"polluted":true},"title":"Safe"}'));
  assert.equal({}.polluted, undefined);
  assert.equal(Object.getPrototypeOf(restored), Object.prototype);
});
test('confirmations, credentials and workflow status excluded', () => {
  for (const name of ['password', 'confirm_review', 'closure_approved', 'status', 'signature', 'verification_result']) assert(protectedDraftField(name));
  assert(!protectedDraftField('hazard_description'));
});
