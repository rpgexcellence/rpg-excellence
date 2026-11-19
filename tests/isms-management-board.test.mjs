import test from "node:test";
import assert from "node:assert/strict";
import { boardDate, controlMetrics, percentage, securityMetrics } from "../app/portal/soa/management-board/metrics.mjs";

test("risk appetite uses each linked threshold and excludes drafts and closed records", () => {
  const risk = (id, status, score, methodology_id) => ({ id, status, residual_score: score, methodology_id });
  const records = {
    risks: [
      risk("draft", "draft", 25, "low"),
      risk("closed", "closed", 25, "low"),
      risk("archived", "archived", 25, "low"),
      risk("at", "approved", 9, "low"),
      risk("above", "review_due", 10, "low"),
      risk("below", "assessed", 12, "high"),
      risk("missing", "acceptance_pending", 25, "retired"),
    ],
    methodologies: [{ id: "low", appetite_score: 9 }, { id: "high", appetite_score: 15 }],
  };
  const result = securityMetrics(records, "2026-11-19", "2026", "all");
  assert.equal(result.activeRisks.length, 4);
  assert.deepEqual(result.above.map(row => row.id), ["above"]);
  assert.deepEqual(result.unresolved.map(row => row.id), ["missing"]);
  assert.equal(securityMetrics({ ...records, methodologies: null }, "2026-11-19", "2026", "all").above, undefined);
});

test("cohort filters do not change backlog and treatment and incident due dates exclude today", () => {
  const treatment = (id, status, target_date) => ({ id, status, target_date });
  const incident = (id, status, severity, target_recovery_date) => ({ id, status, severity, target_recovery_date });
  const records = {
    treatments: [
      treatment("implemented", "implemented", "2026-11-18"),
      treatment("today", "planned", "2026-11-19"),
      treatment("verified", "verified", "2026-09-15"),
      treatment("cancelled", "cancelled", "2026-09-15"),
      treatment("undated", "planned"),
      treatment("previous", "planned", "2025-09-15"),
    ],
    incidents: [
      incident("active", "awaiting_verification", "high", "2026-11-18"),
      incident("today", "recovery", "low", "2026-11-19"),
      incident("closed", "closed", "critical", "2026-11-18"),
      incident("cancelled", "cancelled", "critical", "2026-11-18"),
    ],
  };
  const result = securityMetrics(records, "2026-11-19", "2026", "3");
  assert.deepEqual(result.overdue.map(row => row.id), ["implemented", "previous"]);
  assert.deepEqual(result.undated.map(row => row.id), ["undated"]);
  assert.deepEqual(result.cohorts.map(row => [row.number, row.rows.length, row.verified.length]), [[3, 1, 1]]);
  assert.deepEqual(result.activeIncidents.map(row => row.id), ["active", "today"]);
  assert.deepEqual(result.serious.map(row => row.id), ["active"]);
  assert.deepEqual(result.overdueRecovery.map(row => row.id), ["active"]);
  assert.deepEqual(result.incidentVerification.map(row => row.id), ["active"]);
});

test("control effectiveness uses applicable entries only and an empty denominator is N/A", () => {
  const rows = [
    { control_id: "5.1", applicability: "applicable", implementation_status: "implemented" },
    { control_id: "5.2", applicability: "applicable", implementation_status: "effective" },
    { control_id: "5.3", applicability: "pending", implementation_status: "effective" },
    { control_id: "5.4", applicability: "not_applicable", implementation_status: "effective" },
  ];
  const result = controlMetrics(rows, new Map(rows.map(row => [row.control_id, { theme: "organisational" }])));
  assert.equal(percentage(result.effective.length, result.applicable.length), 50);
  assert.equal(result.implemented.length, 2);
  assert.equal(result.decided.length, 3);
  assert.equal(result.groups[0].effective, 1);
  assert.equal(percentage(0, 0), null);
});

test("acceptance windows include today and the 30-day boundary, excluding closed risks", () => {
  const records = {
    risks: [{id: "live", status: "approved"}, {id: "closed", status: "closed"}],
    acceptances: [
      {id: "a", risk_id: "live", decision: "accepted", expires_at: "2026-12-19"},
      {id: "b", risk_id: "live", decision: "accepted", expires_at: "2026-12-20"},
      {id: "c", risk_id: "live", decision: "accepted", expires_at: "2026-11-19"},
      {id: "d", risk_id: "live", decision: "accepted", expires_at: "2026-11-18"},
      {id: "e", risk_id: "closed", decision: "pending"},
      {id: "f", risk_id: "live", decision: "pending"},
    ],
  };
  const result = securityMetrics(records, "2026-11-19", "2026", "all");
  assert.deepEqual(result.expiring.map(row => row.id), ["a", "c"]);
  assert.deepEqual(result.expired.map(row => row.id), ["d"]);
  assert.deepEqual(result.pending.map(row => row.id), ["f"]);
  assert.equal(boardDate(new Date("2026-07-01T23:30:00Z")), "2026-07-02");
});
