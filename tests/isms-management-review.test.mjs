import test from "node:test";
import assert from "node:assert/strict";
import { managementReview } from "../app/portal/soa/management-board/leadership.mjs";

const today = "2026-11-20";
const emptySecurity = { above: [], serious: [], activeRisks: [], activeIncidents: [], incidentVerification: [], pending: [], expired: [], expiring: [], unresolved: [] };
const review = overrides => managementReview({ today, security: emptySecurity, treatments: [], entries: [], registers: [], ...overrides });

test("a known above-appetite risk is red even when another source is unavailable", () => {
  const result = review({ security: { ...emptySecurity, above: [{ id: "risk" }], activeIncidents: null } });
  assert.equal(result.status, "red");
  assert.equal(result.missingSources, true);
  assert.equal(result.exceptions[0].key, "risks");
});

test("due-date boundaries, closed states and awaiting verification are independent", () => {
  const result = review({ treatments: [
    { id: "a", status: "implemented", target_date: "2026-11-19" },
    { id: "b", status: "planned", target_date: today },
    { id: "c", status: "planned", target_date: "2026-12-20" },
    { id: "d", status: "planned", target_date: "2026-12-21" },
    { id: "e", status: "verified", target_date: "2026-11-19" },
    { id: "f", status: "cancelled", target_date: "2026-11-19" },
  ], entries: [
    { id: "g", action_status: "awaiting_verification", target_date: today },
    { id: "h", action_status: "verified", target_date: "2026-11-19" },
  ], registers: [
    { id: "i", status: "superseded", review_due_at: "2026-11-19" },
    { id: "j", status: "under_review", review_due_at: "2026-11-19T00:00:00Z" },
  ] });
  assert.equal(result.status, "red");
  assert.deepEqual(result.work[0].overdue.map(row => row.id), ["a"]);
  assert.deepEqual(result.work[0].verification.map(row => row.id), ["a"]);
  assert.deepEqual(result.work[0].today.map(row => row.id), ["b"]);
  assert.deepEqual(result.work[0].upcoming.map(row => row.id), ["c"]);
  assert.deepEqual(result.work[1].verification.map(row => row.id), ["g"]);
  assert.deepEqual(result.work[3].overdue.map(row => row.id), ["j"]);
  assert.deepEqual(result.reviewQueue.map(row => row.id), ["j"]);
});

test("no records and unavailable sources never imply green", () => {
  assert.equal(review().status, "neutral");
  assert.equal(review({ registers: [{ status: "approved" }], treatments: null }).status, "neutral");
  assert.equal(review({ registers: [{ status: "draft" }] }).status, "orange");
  assert.equal(review({ controls: { applicable: [{}], effective: [] } }).status, "orange");
  assert.equal(review({ registers: [{ status: "approved" }], controls: { applicable: [{}], effective: [{}] } }).status, "green");
});
