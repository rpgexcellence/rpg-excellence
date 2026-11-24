import test from "node:test";
import assert from "node:assert/strict";
import { fieldworkOverdue, fieldworkState, inspectionPerformance, programmeDue, actionOverdue, sixMonthsBefore } from "../lib/workplace-inspection-overview.mjs";

const now=Date.parse("2026-11-23T12:00:00Z");
const today="2026-11-23";

test("programme cadence lateness remains separate from fieldwork and action status",()=>{
  assert.equal(programmeDue({status:"active",next_inspection_date:"2026-11-22"},today),true);
  assert.equal(programmeDue({status:"paused",next_inspection_date:"2026-11-22"},today),false);
  assert.equal(fieldworkState({status:"planned"}),"planned");
  assert.equal(fieldworkState({status:"in_progress"}),"active");
  assert.equal(fieldworkState({status:"actions_open"}),"completed");
  assert.equal(fieldworkOverdue({status:"planned",planned_end_at:"2026-11-23T11:00:00Z"},now),true);
  assert.equal(fieldworkOverdue({status:"awaiting_review",planned_end_at:"2026-11-23T11:00:00Z"},now),false);
  assert.equal(actionOverdue({status:"open",target_date:"2026-11-22"},today),true);
  assert.equal(actionOverdue({status:"closed",target_date:"2026-11-22"},today),false);
});

test("performance counts measured submissions only and deduplicates repeating checklist findings by inspection and scope",()=>{
  const first={id:"a",programme_id:"p",template_id:"t",status:"completed",completed_at:"2026-11-20T11:00:00Z",planned_end_at:"2026-11-20T11:00:00Z"};
  const second={...first,id:"b",status:"awaiting_review",completed_at:"2026-11-20T12:00:00Z"};
  const third={...first,id:"c",programme_id:"p2",planned_end_at:null};
  const finding={id:"f1",inspection_id:"a",status:"open",created_at:"2026-11-20T11:00:00Z",response:{question_code:"exit",question_text:"Emergency exit clear"}};
  const result=inspectionPerformance([first,second,third,{...first,id:"d",status:"cancelled"}],
    [finding,{...finding,id:"f2"},{...finding,id:"f3",inspection_id:"b"},{...finding,id:"f4",inspection_id:"c"}],now);
  assert.deepEqual([result.onTime,result.late,result.unmeasured],[1,1,1]);
  assert.deepEqual(result.submitted.map(row=>row.id),["a","b","c"]);
  assert.deepEqual(result.repeats[0].findingIds,["f1","f2","f3"]);
  const scoped=inspectionPerformance([first,second],[finding,{...finding,id:"f3",inspection_id:"b"}],now,
    value=>Date.parse(value)>=Date.parse("2026-11-20T11:30:00Z"));
  assert.deepEqual(scoped.submitted.map(row=>row.id),["b"]);
  assert.deepEqual(scoped.repeats,[]);
  assert.deepEqual(result.repeats.map(row=>[row.label,row.count]),[["Emergency exit clear",2]]);
  assert.equal(new Date(sixMonthsBefore(Date.parse("2026-08-31T12:00:00Z"))).toISOString(),"2026-02-28T12:00:00.000Z");
});
