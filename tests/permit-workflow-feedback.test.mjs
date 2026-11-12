import test from 'node:test';
import assert from 'node:assert/strict';
import {permitWorkflowRedirect, permitWorkflowFeedback} from '../lib/permit-workflow-feedback.mjs';

function feedback(stage, blockers, canEditDefinition = true) {
  const url = new URL(permitWorkflowRedirect('permit-c', 'Progression is blocked.', stage, blockers), 'https://example.invalid');
  return permitWorkflowFeedback(Object.fromEntries(url.searchParams), {id: 'permit-c', canEditDefinition});
}

test('incomplete permit returns separate blockers and an editable draft destination', () => {
  const blockers = ['Controlled site is required.', 'Confirm critical control: work party briefed', 'Controlled site is required.'];
  const result = feedback('definition', blockers);
  assert.deepEqual(result.blockers, blockers.slice(0, 2));
  assert.equal(result.href, '/portal/health-safety/permits/permit-c/edit');
  assert.equal(result.label, 'Edit draft permit');
});

test('issue and handback failures retain their blockers and safety controls destination', () => {
  for (const stage of ['issue', 'handback']) {
    const result = feedback(stage, ['Isolation A.1 requires independent verification.']);
    assert.equal(result.href, '/portal/health-safety/permits/permit-c/controls');
    assert.deepEqual(result.blockers, ['Isolation A.1 requires independent verification.']);
  }
  assert.equal(feedback('definition', ['Missing site'], false).label, 'Open Safety controls');
});

test('existing error URLs and malformed blocker lists remain readable without arbitrary destinations', () => {
  assert.equal(permitWorkflowFeedback({}), null);
  for (const workflowBlockers of ['broken JSON', '{}', '[null,12,"Missing work area"]']) {
    const result = permitWorkflowFeedback({workflowError: 'Original message', workflowStage: 'https://other.invalid', workflowBlockers}, {id: 'permit-c'});
    assert.equal(result.message, 'Original message');
    assert.equal(result.href, '/portal/health-safety/permits/permit-c/controls');
    assert.ok(result.blockers.every(value => typeof value === 'string'));
  }
});
