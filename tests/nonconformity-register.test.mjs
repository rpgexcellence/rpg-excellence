import assert from "node:assert/strict";
import test from "node:test";
import { buildNonconformityAnalytics } from "../lib/nonconformity-reporting.mjs";

function finding(id, fields = {}) {
  return {
    id, finding_reference: id, title: "Missing evidence", finding_type: "minor_nc",
    status: "open", created_at: "2026-11-06", agreed_date: "2026-11-27", ...fields,
  };
}

const snapshot = {
  asOf: "2026-11-27",
  currentUserId: "me",
  findings: [
    finding("NC-1", { finding_type: "major_nc", audit_id: "audit", linked_rca_case_id: "capa", agreed_date: "2026-11-23" }),
    finding("NC-2", { source_type: "manual", process_area: "Incoming inspection", responsible_owner_name: "Quality" }),
    finding("NC-3", { status: "closed", closure_verified: false }),
    finding("NC-4", { status: "closed", closure_verified: true, agreed_date: "2026-11-20" }),
    finding("OFI-1", { finding_type: "ofi", source_type: "manual", responsible_owner_name: "Quality" }),
  ],
  audits: [{ id: "audit", audit_type: "supplier", administration_location_label: "Wales", departments: "NDT" }],
  capaCases: [{ id: "capa", case_reference: "8D-01", status: "closed" }],
  access: [
    { id: "access1", finding_id: "NC-1", assignee_user_id: "me", assignee_name: "Quality", status: "assigned" },
    { id: "access2", finding_id: "NC-3", assignee_user_id: "other", assignee_name: "Operations", status: "submitted" },
    { id: "access3", finding_id: "OFI-1", assignee_user_id: "me", assignee_name: "Quality", status: "assigned" },
  ],
};

test("register filters combine multi-select, ownership, location, dates and linked case search", () => {
  const scope = buildNonconformityAnalytics(snapshot, {
    classification: ["major_nc", "minor_nc"], owner: ["Quality", "Operations"], source: ["supplier_audit", "other"],
    ownership: "mine", site: "Wales", department: "NDT", dueFrom: "2026-11-23", dueTo: "2026-11-23",
    workflow: "assigned", capa: "linked", query: "8d-01",
  });
  assert.deepEqual(scope.visibleRows.map(row => row.reference), ["NC-1"]);
  assert.equal(scope.visibleRows[0].daysOverdue, 4);
  assert.equal(scope.visibleRows[0].linkedCapaReference, "8D-01");
  assert.deepEqual(buildNonconformityAnalytics(snapshot, { owner: "Quality" }).visibleRows.map(row => row.id),
    ["NC-1", "NC-2", "OFI-1"]);
  assert.deepEqual(buildNonconformityAnalytics(snapshot, { ownership: "mine" }).visibleRows.map(row => row.id),
    ["NC-1", "OFI-1"]);
  assert.throws(() => buildNonconformityAnalytics(snapshot, { dueFrom: "2026-11-28", dueTo: "2026-11-27" }),
    /valid due date range/);
});

test("KPI slices preserve base totals and closure depends on finding verification", () => {
  const scope = buildNonconformityAnalytics(snapshot, { status: "verification" });
  assert.deepEqual(scope.visibleRows.map(row => row.id), ["NC-3"]);
  assert.equal(scope.findingTotal, 5);
  assert.equal(scope.total, 4);
  assert.equal(scope.closed, 1);
  assert.equal(scope.overdue, 1);
  assert.equal(scope.dueSoon, 2);
  assert.equal(scope.findingRows.find(row => row.id === "NC-4").daysOverdue, null);
  assert.equal(scope.findingRows.find(row => row.id === "NC-2").site, "");
});
