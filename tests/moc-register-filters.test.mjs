import test from "node:test";
import assert from "node:assert/strict";
import { filteredChanges, emptyFilters, overdue } from "../app/portal/health-safety/moc/register-filters.mjs";

const rows = [
  { id:"move", change_type:"move_machinery", pathway:"lite", location:"Corby", department:"HSE", affected_area:"Workshop", status:"hse_gate", target_date:"2026-11-22", asset:{asset_reference:"CAR0002"} },
  { id:"process", change_type:"process_change", pathway:"lite", location:"London", department:"Training", status:"hse_gate", target_date:"2026-11-23" },
  { id:"remove", change_type:"remove_equipment", pathway:"full", location:"Corby", department:"HSE", status:"closed", target_date:"2026-10-15" },
  { id:"rejected", change_type:"process_change", pathway:"full", location:"Corby", status:"rejected", target_date:"2026-10-15" },
];
const today = "2026-11-23";
const filter = (filters={}, options={}) => filteredChanges(rows,{view:"all",today,search:"",filters:{...emptyFilters,...filters},...options}).map(row=>row.id);

test("unions ticks within each filter and intersects different filters", () => {
  assert.deepEqual(filter({type:["move_machinery","process_change"],pathway:["lite"],area:["Workshop","London"],status:["hse_gate","closed"]}),["move","process"]);
  assert.deepEqual(filter({type:["move_machinery","process_change"],pathway:["full"],area:["Corby"]}),["rejected"]);
  assert.deepEqual(filter({pathway:["lite","full"],status:["closed","hse_gate"]}),["move","process","remove"]);
});

test("area options match either site or recorded area, and search and stage views combine", () => {
  assert.deepEqual(filter({area:["HSE","Training"]}),["move","process","remove"]);
  assert.deepEqual(filter({area:["Corby","London"]},{view:"gate",search:"CAR0002"}),["move"]);
  assert.deepEqual(filter({status:["closed"]},{view:"gate"}),[]);
  assert.deepEqual(filter(),["move","process","remove","rejected"]);
});

test("overdue includes open records after their target date and excludes terminal records", () => {
  assert.deepEqual(filter({}, {view:"overdue"}),["move"]);
  assert.equal(overdue({status:"hse_gate"},today),false);
});
