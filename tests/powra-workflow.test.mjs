import assert from "node:assert/strict";
import { test } from "node:test";
import { closureOptions, decidePowra, powraDecision, powraOutstanding, powraStatus, powraViews } from "../lib/powra-workflow.mjs";

const yes = [{answer:"yes"}];
const covered = {linked:true,noHazards:true,stop:false};
const hazard = {remaining_risk:"low",control:"Verified isolation",verified:true};

test("Stop Work overrides every start and incomplete checks cannot release work", () => {
  assert.equal(decidePowra(yes,[],{...covered,stop:true}),"stop_work");
  assert.equal(decidePowra([{answer:"no"},{answer:""}],[],covered),"stop_work");
  assert.equal(decidePowra([{answer:""}],[],covered),"pending");
  assert.equal(decidePowra(yes,[{...hazard,remaining_risk:"high"}],covered),"stop_work");
  assert.equal(decidePowra(yes,[],{...covered,noHazards:false}),"pending");
});

test("Changed hazards need review, and controls require explicit verification", () => {
  assert.equal(decidePowra(yes,[{...hazard,changed:true}],covered),"supervisor_review");
  assert.equal(decidePowra(yes,[hazard],{...covered,linked:false}),"supervisor_review");
  assert.equal(decidePowra(yes,[{...hazard,verified:false}],covered),"additional_controls");
  assert.equal(decidePowra(yes,[{...hazard,control:""}],covered),"additional_controls");
  assert.equal(decidePowra(yes,[hazard],covered),"safe_to_start");
});

test("Status, decision and outcome stay independent on closed and historical records", () => {
  const closed = {status:"closed",decision:"stop_work",end_review:{outcome:"stopped"}};
  assert.equal(powraDecision(closed),"stop_work");
  assert.equal(powraStatus(closed),"Closed");
  assert.deepEqual(powraViews(closed),["closed"]);
  assert.deepEqual(closureOptions("stop_work"),["stopped"]);
  assert.equal(powraStatus({...closed,decision:"safe_to_start",end_review:{outcome:"completed"}}),"Completed");
  assert.equal(powraOutstanding({hazards:[{control:"Old hazard"}]}),null);
  const hold = {status:"supervisor_review",decision:"supervisor_review",end_review:{point_of_work:{additional_controls:true}}};
  assert.equal(powraDecision(hold),"additional_controls");
  assert.equal(powraStatus(hold),"On hold");
  assert.deepEqual(powraViews(hold),["active"]);
});
