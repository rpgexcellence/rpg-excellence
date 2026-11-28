import assert from "node:assert/strict";
import test from "node:test";
import { buildWorkplaceFindingsBoard } from "../lib/workplace-findings-board.mjs";

const site = { siteKey: "a", site: "North", zoneKey: "north-workshop", zone: "Workshop" };
const south = { siteKey: "b", site: "South", zoneKey: "south-workshop", zone: "Workshop" };
const asOf = Date.parse("2026-11-28T12:00:00Z");
const today = "2026-11-28";
const question = { question_code: "Q05", question_text: "Escape routes clear" };
const findings = [
  { ...site, id:"f1", inspection_id:"i1", status:"assigned", priority:"high", finding_type:"unsafe_condition", created_at:"2026-09-20T10:00:00Z", response:question },
  { ...site, id:"f2", inspection_id:"i2", status:"closed", priority:"medium", finding_type:"unsafe_condition", created_at:"2026-10-26T10:00:00Z", response:question },
  { ...site, id:"f3", inspection_id:"i2", status:"open", priority:"low", finding_type:"positive_practice", created_at:"2026-11-06T10:00:00Z", response:question },
  { ...south, id:"f4", inspection_id:"i3", status:"open", priority:"critical", finding_type:"immediate_danger", created_at:"2026-11-07T10:00:00Z" },
  { ...site, id:"draft", inspection_id:"i1", status:"cancelled", priority:"critical", finding_type:"unsafe_condition", created_at:"2026-11-05T10:00:00Z" },
];
const actions = [
  { ...site, id:"a1", reference:"A1", finding_id:"f1", priority:"high", status:"awaiting_verification", target_date:"2026-11-27", verification_result:"pending" },
  { ...site, id:"a2", reference:"A2", finding_id:"f2", priority:"medium", status:"closed", target_date:"2026-11-15", effectiveness_result:"effective", verified_at:"2026-11-12T10:00:00Z", verifierRecorded:true },
  { ...south, id:"a3", reference:"A3", finding_id:"f4", priority:"medium", status:"open", target_date:"2026-11-28", verification_result:"partly_effective", verified_at:"2026-11-21T10:00:00Z" },
  { ...site, id:"a4", reference:"A4", finding_id:"f1", priority:"medium", status:"closed", target_date:"2026-11-15", effectiveness_result:"effective", verified_at:"2026-11-12T10:00:00Z", verifierRecorded:false },
];
const inspections = [
  { id:"i1", programme_id:"p1", template_id:"t1" }, { id:"i2", programme_id:"p1", template_id:"t1" },
  { id:"i3", programme_id:"p2", template_id:"t1" },
];
const input = { findings, actions, inspections, asOf, today };
const ids = item => item.rows.map(row=>row.id);

test("workplace board distinguishes raised findings, verified actions and the live backlog", () => {
  const board = buildWorkplaceFindingsBoard(input);
  assert.equal(board.totalFindings, 4);
  assert.equal(board.findingsByType.reduce((total,item)=>total+item.count,0), 4);
  assert.deepEqual(ids(board.trend.at(-1).raised), ["f3","f4"]);
  assert.deepEqual(ids(board.trend.at(-1).verified), ["a2"]);
  assert.equal(board.verifiedTotal, 2);
  assert.deepEqual(ids(board.outcomes.find(item=>item.key==="partly_effective")), ["a3"]);
  assert.deepEqual(ids(board.summary.find(item=>item.key==="overdue")), ["a1"]);
  assert.deepEqual(board.priorities.map(row=>row.id), ["a1","a3"]);
});

test("recurrence counts distinct inspections and filters use stable site and zone identities", () => {
  const board = buildWorkplaceFindingsBoard(input);
  assert.deepEqual(board.recurrence.map(ids), [["f1","f2"]]);
  const southOnly = buildWorkplaceFindingsBoard({ ...input, filters:{site:"b",zone:"south-workshop"} });
  assert.deepEqual(ids(southOnly.summary[0]), ["f4"]);
  assert.equal(southOnly.overdueBySite.length, 0);
  assert.equal(southOnly.recurrence.length, 0);
  const high = buildWorkplaceFindingsBoard({ ...input, filters:{priority:"critical"} });
  assert.deepEqual(ids(high.summary[0]), ["f4"]);
  assert.equal(high.attention.find(item=>item.key==="no-action").count, 0);
});
