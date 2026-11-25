import assert from "node:assert/strict";
import { test } from "node:test";
import { filterStatements, readinessLabel, statementCsv, summarizeControls } from "../app/portal/soa/soa-register.mjs";

const catalog = ["5.1", "5.2", "5.3", "5.4", "5.5"].map(control_id => ({ control_id }));
const applicable = (control_id, implementation_status, extra = {}) => ({
  control_id, implementation_status, applicability: "applicable", applicability_justification: "Recorded reason", ...extra,
});

test("coverage groups every catalogue control once and excludes undecided and excluded controls from the rate", () => {
  const result = summarizeControls(catalog, [
    applicable("5.1", "effective"),
    applicable("5.2", "partially_implemented"),
    applicable("5.3", "planned"),
    applicable("5.4", "implemented", { applicability: "not_applicable" }),
  ], [{ control_id: "5.1", evidence_kind: "implementation" }], [], []);
  assert.equal(result.total, 5);
  assert.equal(result.applicable, 3);
  assert.deepEqual(Object.values(result.coverage).map(items => items.length), [1, 1, 1, 1, 1]);
  assert.deepEqual(result.gaps.evidence, [catalog[1]]);
  assert.deepEqual(result.gaps.decision, [catalog[4]]);
  const second = summarizeControls(catalog, [], [], [], []);
  assert.equal(second.applicable, 0);
  assert.equal(second.coverage.pending.length, 5);
});

test("approval readiness uses live evidence, justification and treatment links without changing draft status", () => {
  const entries = [
    applicable("5.1", "implemented", { inclusion_source: "risk_treatment" }),
    applicable("5.2", "planned", { applicability: "not_applicable", applicability_justification: "  " }),
  ];
  const risk = { id: "r1", risk_reference: "ISR-1", status: "archived" };
  const links = [{ control_id: "5.1", risk_id: "r1" }, { control_id: "5.1", risk_id: "unavailable" }];
  const evidence = [{ control_id: "5.1", evidence_kind: "implementation" }];
  const blocking = summarizeControls(catalog.slice(0, 2), entries, evidence, links, [risk]);
  assert.equal(blocking.ready, false);
  assert.deepEqual(blocking.gaps.reason, [catalog[1]]);
  assert.deepEqual(blocking.gaps.treatment, [catalog[0]]);
  assert.equal(blocking.linkedRisks.length, 1);
  entries[1].applicability_justification = "Outside scope";
  const currentRisk = { ...risk, status: "active" };
  const ready = summarizeControls(catalog.slice(0, 2), entries, evidence, links, [currentRisk]);
  const row = { status: "draft", summary: ready };
  assert.equal(readinessLabel(row), "Ready for review");
  assert.equal(row.status, "draft");
  assert.equal(readinessLabel({ summary: summarizeControls([], [], [], [], []) }), "Unavailable");
});

test("type and status filters use OR within each group and CSV protects Excel against formulas", () => {
  const first = { title: '=HYPERLINK("test")', reference: "SOA-A", type: "standalone", status: "draft",
    summary: { linkedRisks: [{ risk_reference: "ISR-007", title: "Recovery risk" }], total: 93 } };
  const second = { ...first, title: "Linked", type: "assessment", reference: "SOA-B", status: "approved", summary: { ...first.summary, linkedRisks: [] } };
  const filtered = filterStatements([first, second], { query: "recovery", types: ["standalone", "assessment"], statuses: ["draft", "approved"] });
  assert.deepEqual(filtered, [first]);
  const csv = statementCsv(filtered);
  assert.ok(csv.includes("'=HYPERLINK"));
  assert.ok(csv.includes('""test""'));
  assert.ok(!csv.includes("SOA-B"));
});
