import test from "node:test";
import assert from "node:assert/strict";
import { healthSafetyPosition, residualBand, riskMatrixPosition } from "../lib/health-safety-dashboard.mjs";

test("matrix links retain distinct likelihood and severity cells with the same score", () => {
  const positions = [[1, 4], [2, 2], [4, 1]].map(([likelihood, severity]) => riskMatrixPosition(likelihood, severity));
  assert.deepEqual(positions.map(position => position.cell), ["1-4", "2-2", "4-1"]);
  assert.ok(positions.every(position => position.score === 4 && residualBand(position.score) === "acceptable"));
  for (const input of [[null, 4], [1, 0], [6, 5], [2.5, 4]]) {
    assert.equal(riskMatrixPosition(...input), null);
  }
});

const today = "2026-11-20";
const current = { id: "current", status: "approved", review_date: today };
const historical = { id: "historical", status: "superseded", review_date: "2026-11-18" };
const hazard = (score, id = "current") => ({ assessment_id: id, residual_score: score, current_score: 20 });
const action = (id, status, priority, target_date, assessment_id = "current") => ({ id, status, priority, target_date, assessment_id });

test("historic records and inherent ratings do not drive current residual escalation", () => {
  const result = healthSafetyPosition({ assessments: [current, historical], hazards: [hazard(5), hazard(25, "historical")], actions: [action("historic", "open", "critical", "2026-11-19", "historical")] }, today);
  assert.equal(result.status, "orange");
  assert.equal(result.current.length, 1);
  assert.equal(result.unacceptable.length, 0);
  assert.equal(result.scored.length, 1);
  assert.equal(result.reviewDates.today.length, 1);
  assert.equal(result.reviewDates.overdue.length, 0);
  assert.equal(residualBand(15), "unacceptable");
  assert.equal(residualBand(10), "inadequate");
});

test("overdue high-priority actions and unacceptable residual hazards stay visible even if the calendar fails", () => {
  const actions = [action("overdue", "verification", "high", "2026-11-19"), action("today", "open", "medium", today), action("next", "open", "medium", "2026-12-20"), action("outside", "open", "medium", "2026-12-21"), action("effective", "effective", "high", "2026-11-19")];
  const result = healthSafetyPosition({ assessments: [current], hazards: [hazard(15)], actions, inspections: null }, today);
  assert.equal(result.status, "red");
  assert.equal(result.missingRecords, true);
  assert.deepEqual(result.exceptions.slice(0, 2).map(row => row.key), ["unacceptable", "overdue-high"]);
  assert.deepEqual(result.actionDates.overdue.map(row => row.id), ["overdue"]);
  assert.deepEqual(result.actionDates.today.map(row => row.id), ["today"]);
  assert.deepEqual(result.actionDates.upcoming.map(row => row.id), ["next"]);
  assert.deepEqual(result.awaiting.map(row => row.id), ["overdue"]);
  assert.deepEqual(result.verified.map(row => row.id), ["effective"]);
});

test("only a populated, scored board without an exception is green", () => {
  const base = { assessments: [{ ...current, review_date: "2027-01-15" }], hazards: [hazard(4)], actions: [] };
  assert.equal(healthSafetyPosition(base, today).status, "green");
  assert.equal(healthSafetyPosition({ ...base, hazards: [hazard(null)] }, today).status, "neutral");
  assert.equal(healthSafetyPosition({ ...base, assessments: [], hazards: [] }, today).status, "neutral");
  assert.equal(healthSafetyPosition({ ...base, inspections: { overdue: [{}] } }, today).status, "orange");
});
