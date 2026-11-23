import { PRE_FIELDWORK } from "./workplace-inspection-policy.mjs";

export const OPEN_ACTIONS = ["open", "accepted", "in_progress", "evidence_submitted", "awaiting_verification"];
export const openFinding = item => !["closed","cancelled"].includes(item.status);
const FIELDWORK_FINISHED = new Set(["awaiting_review","actions_open","awaiting_verification","completed"]);
export const fieldworkState = item => PRE_FIELDWORK.includes(item.status) ? "planned" :
  item.status==="in_progress" ? "active" : FIELDWORK_FINISHED.has(item.status) ? "completed" : "other";
export const programmeDue = (item,today) => item.status==="active" && Boolean(item.next_inspection_date && item.next_inspection_date<today);
export const actionOverdue = (item,today) => OPEN_ACTIONS.includes(item.status) && Boolean(item.target_date && item.target_date<today);
export const fieldworkOverdue = (item,now) => ["planned","active"].includes(fieldworkState(item)) &&
  Boolean(item.planned_end_at && Date.parse(item.planned_end_at)<now);

export function sixMonthsBefore(now){
  const date = new Date(now);
  const day = date.getUTCDate();
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth()-6);
  const end = new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth()+1,0)).getUTCDate();
  date.setUTCDate(Math.min(day,end));
  return date.getTime();
}

export function inspectionPerformance(inspections,findings,now){
  const since = sixMonthsBefore(now);
  const inWindow = value => {const date=Date.parse(value);return date>=since&&date<=now;};
  const submitted = inspections.filter(row=>fieldworkState(row)==="completed"&&inWindow(row.completed_at));
  const comparable = submitted.filter(row=>Number.isFinite(Date.parse(row.planned_end_at)));
  const onTime = comparable.filter(row=>Date.parse(row.completed_at)<=Date.parse(row.planned_end_at)).length;
  const byId = new Map(inspections.map(row=>[row.id,row]));
  const byQuestion = new Map();
  for(const finding of findings){
    const inspection = byId.get(finding.inspection_id);
    const question = finding.response?.question_code;
    const scope = inspection?.programme_id || inspection?.zone_id;
    if(!scope||!question||finding.status==="cancelled"||finding.finding_type==="positive_practice"||!inWindow(finding.created_at))continue;
    const key = JSON.stringify([scope,inspection.template_id,question]);
    if(!byQuestion.has(key))byQuestion.set(key,{label:finding.response.question_text||question,inspectionIds:new Set(),scope:inspection.administration_location_label});
    byQuestion.get(key).inspectionIds.add(inspection.id);
  }
  const repeats = [...byQuestion.entries()].map(([key,{label,scope,inspectionIds}])=>({key,label,scope,count:inspectionIds.size}))
    .filter(row=>row.count>1).sort((a,b)=>b.count-a.count||a.label.localeCompare(b.label));
  return {onTime,late:comparable.length-onTime,unmeasured:submitted.length-comparable.length,repeats};
}
