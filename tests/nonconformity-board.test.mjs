import assert from "node:assert/strict";
import test from "node:test";
import { buildNonconformityAnalytics } from "../lib/nonconformity-reporting.mjs";
import { buildNonconformityBoard } from "../lib/nonconformity-board.mjs";

const findings = [
  { id: "one", finding_type: "major_nc", status: "closed", closure_verified: true, closure_verified_at: "2026-11-05",
    created_at: "2026-06-01", source_category: "supplier", linked_rca_case_id: "case-one" },
  { id: "two", finding_type: "minor_nc", status: "action_in_progress", agreed_date: "2026-10-01",
    created_at: "2026-07-02", source_category: "internal_audit", linked_rca_case_id: "case-two" },
  { id: "three", finding_type: "minor_nc", status: "closed", closure_verified: false, closure_verified_at: "2026-11-05",
    created_at: "2026-11-02", source_category: "internal_audit", linked_rca_case_id: "case-three" },
  { id: "four", finding_type: "ofi", created_at: "2026-11-01", source_category: "supplier" },
];
const snapshot = {
  asOf: "2026-11-27", findings,
  capaCases: [{ id: "case-one", status: "closed" }, { id: "case-two", status: "effectiveness_review" }],
  access: [{ id: "access-one", finding_id: "one" }, { id: "access-two", finding_id: "two", status: "verified_effective" }],
};
const boardData = {
  decisions: [
    { id: "access-one", finding_id: "one", rca_case_id: "case-one", effectiveness_result: "effective", verified_at: "2026-11-05" },
    { id: "access-two", finding_id: "two", rca_case_id: "wrong-case", effectiveness_result: "effective", verified_at: "2026-11-05" },
  ],
  actions: [
    { case_id: "case-one", discipline: 5, selection_status: "selected", effectiveness_result: "not_effective", verified_at: "2026-09-12" },
    { case_id: "case-two", discipline: 5, selection_status: "selected", effectiveness_result: "unable_to_verify", verified_at: "2026-10-12" },
    { case_id: "case-two", discipline: 5, selection_status: "selected", effectiveness_result: "effective", verified_at: "2026-11-07" },
    { case_id: "case-two", discipline: 5, selection_status: "unselected", effectiveness_result: "not_effective", verified_at: "2026-11-07" },
    { case_id: "case-three", discipline: 5, selection_status: "selected", effectiveness_result: "effective", verified_at: "2026-11-07" },
  ],
  causes: [
    { case_id: "case-one", cause_type: "systemic", status: "validated", profile_code: "A1" },
    { case_id: "case-one", cause_type: "systemic", status: "validated", profile_code: "A2" },
    { case_id: "case-two", cause_type: "systemic", status: "validated", profile_code: "A2" },
    { case_id: "case-two", cause_type: "occurrence", status: "validated", profile_code: "B3" },
    { case_id: "case-three", cause_type: "systemic", status: "validated", profile_code: "B3" },
  ],
};

test("management board charts use the same scoped findings and independent verification dates", () => {
  const board = buildNonconformityBoard(buildNonconformityAnalytics(snapshot), boardData);
  assert.equal(board.trend[0].date, "2026-06");
  assert.deepEqual(board.trend[0].raised.rows.map(row => row.id), ["one"]);
  assert.deepEqual(board.trend.at(-1).verified.rows.map(row => row.id), ["one"]);
  assert.equal(board.sources.reduce((sum, item) => sum + item.count, 0), 3);
  assert.equal(board.classification.reduce((sum, item) => sum + item.count, 0), 4);
  assert.deepEqual(board.attention.find(item => item.key === "verification").rows.map(row => row.id), ["two", "three"]);
  const filtered = buildNonconformityBoard(buildNonconformityAnalytics(snapshot, { source: ["supplier"] }), boardData);
  assert.deepEqual(filtered.trend.at(-1).verified.rows.map(row => row.id), ["one"]);
  assert.equal(filtered.recurring.items.length, 0);
});

test("outcome and cause drill-downs deduplicate findings and ignore inaccessible or uncontrolled evidence", () => {
  const board = buildNonconformityBoard(buildNonconformityAnalytics(snapshot), boardData);
  assert.equal(board.effectiveness.total, 2);
  assert.equal(board.effectiveness.items.find(item => item.key === "effective").rows[0].chartContext.basis, "Finding verification");
  const unable = board.effectiveness.items.find(item => item.key === "unable_to_verify");
  assert.deepEqual(unable.rows.map(row => row.id), ["two"]);
  assert.equal(unable.rows[0].chartContext.date, "2026-10-12");
  assert.equal(board.recurring.covered, 2);
  assert.deepEqual(board.recurring.items.map(item => [item.key, item.count]), [["A", 2]]);
  const unavailable = buildNonconformityBoard(buildNonconformityAnalytics(snapshot), { decisions: [], actions: null, causes: null });
  assert.equal(unavailable.effectiveness, null);
  assert.equal(unavailable.recurring, null);
});
