"use client";

import { useActionState, useMemo, useState } from "react";

const metrics = [
  ["otd", "On-time delivery", "Lines received by agreed date / lines due"],
  ["conformity", "Product or service conformity", "Accepted lines / inspected lines"],
  ["escapes", "Quality escapes", "Defects found after acceptance or use"],
  ["capa", "Corrective-action closure", "Actions closed on time / actions due"],
  ["response", "Response to issues", "Responses within agreed SLA / requests"],
];
const assuranceFields = [["audit","Supplier audit"],["nc_capa","Nonconformities and CAPA"],["certification","Certification and competence"],["traceability","Traceability and records"],["change_control","Change control"]];
const aerospaceFields = [["product_safety","Product safety and critical items"],["counterfeit","Counterfeit part prevention"],["configuration","Configuration and first article"],["subtier","Sub-tier oversight and flow-down"],["special_processes","Special processes and concessions"]];
const riskFields = [["capacity","Capacity and delivery resilience"],["financial","Financial and single-source exposure"],["continuity","Continuity and disruption"],["regulatory","Regulatory, HSE and sustainability"]];
const commercialFields = [["demand","Demand and forecast"],["cost","Cost and value"],["changes","Upcoming changes"]];
const addMonths = (dateValue, months = 3) => { const d = dateValue ? new Date(`${dateValue}T12:00:00Z`) : new Date(); d.setUTCMonth(d.getUTCMonth() + months); return d.toISOString().slice(0,10); };
const currentQuarter = (dateValue) => { const d = dateValue ? new Date(`${dateValue}T12:00:00Z`) : new Date(); return `Q${Math.floor(d.getUTCMonth()/3)+1} ${d.getUTCFullYear()}`; };

export default function QbrForm({ supplier, review, approvers, audits, ncStats }) {
  const boundAction = saveAction.bind(null, supplier.id);
  const [state, action, pending] = useActionState(boundAction, {});
  const today = new Date().toISOString().slice(0,10);
  const [reviewDate, setReviewDate] = useState(review?.review_date || today);
  const [nextDate, setNextDate] = useState(review?.next_qbr_date || addMonths(review?.review_date || today));
  const [scorecard, setScorecard] = useState(review?.scorecard || {});
  const [assurance, setAssurance] = useState(review?.assurance_review || {});
  const [aerospace, setAerospace] = useState(review?.aerospace_review || {});
  const [risk, setRisk] = useState(review?.risk_review || {});
  const [commercial, setCommercial] = useState(review?.commercial_review || {});
  const [actions, setActions] = useState(review?.actions?.length ? review.actions : [{ id:"", action:"", owner:"", due:"", status:"open" }]);
  const quarter = useMemo(() => currentQuarter(reviewDate), [reviewDate]);
  const updateObject = (setter, key, value) => setter(current => ({...current, [key]: value}));
  const updateMetric = (key, field, value) => setScorecard(current => ({...current, [key]: {...(current[key]||{}), [field]:value}}));
  const updateAction = (index, field, value) => setActions(current => current.map((item,i)=>i===index?{...item,[field]:value}:item));

  return <form action={action} className="qbrForm">
    <input type="hidden" name="qbr_id" value={review?.id || ""}/><input type="hidden" name="qbr_reference" value={review?.qbr_reference || ""}/><input type="hidden" name="quarter" value={quarter}/>
    <input type="hidden" name="scorecard" value={JSON.stringify(scorecard)}/><input type="hidden" name="assurance_review" value={JSON.stringify(assurance)}/><input type="hidden" name="aerospace_review" value={JSON.stringify(aerospace)}/><input type="hidden" name="risk_review" value={JSON.stringify(risk)}/><input type="hidden" name="commercial_review" value={JSON.stringify(commercial)}/><input type="hidden" name="actions" value={JSON.stringify(actions)}/>
    {state?.error && <div className="qbrError" role="alert">{state.error}</div>}
    <Section number="01" title="Review details & executive decision" text="Confirm the controlled period, participants, conclusion and risk-based recommendation.">
      <div className="qbrGrid"><Read label="Supplier and approved scope" value={`${supplier.legal_name} · ${supplier.approval_scope || supplier.supply_description}`}/><Read label="Current approval and risk" value={`${String(supplier.approval_status).replaceAll("_"," ")} · ${supplier.risk_result?.riskBand || "Not assessed"}`}/><label>Review date *<input type="date" name="review_date" value={reviewDate} onChange={e=>{setReviewDate(e.target.value);setNextDate(addMonths(e.target.value));}} required/></label><Read label="Quarter" value={quarter}/><label className="wide">Buyer and supplier participants<textarea name="participants" defaultValue={review?.participants || ""} placeholder="Names, roles and organisations"/></label><label className="wide">Quarterly conclusion<textarea name="executive_conclusion" defaultValue={review?.executive_conclusion || ""} placeholder="What changed, material concerns, supplier response and business impact"/></label><label>Recommended decision<select name="recommended_decision" defaultValue={review?.recommended_decision || "maintain"}><option value="maintain">Maintain approval</option><option value="conditional">Conditional approval</option><option value="escalate">Escalate</option><option value="suspend">Suspend</option><option value="remove">Remove</option></select></label><label>Authorised approver<select name="approver_person_id" defaultValue={review?.approver_person_id || ""}><option value="">Select approver</option>{approvers.map(p=><option key={p.id} value={p.id}>{p.first_name} {p.last_name} · {p.position || "Approver"}</option>)}</select></label><label className="wide">Decision rationale and exception<textarea name="decision_rationale" defaultValue={review?.decision_rationale || ""} placeholder="Evidence considered and any departure from the risk-based recommendation"/></label></div>
    </Section>
    <Section number="02" title="Performance scorecard" text="Compare actual results with the target and previous quarter; use N/A with a reason when unavailable."><div className="qbrScore"><div className="head"><span>Measure</span><span>Target</span><span>Prior</span><span>Actual</span><span>Trend</span></div>{metrics.map(([key,label,definition])=><div key={key}><span><b>{label}</b><small>{definition}</small></span>{["target","prior","actual"].map(field=><input key={field} value={scorecard[key]?.[field]||""} onChange={e=>updateMetric(key,field,e.target.value)} placeholder="% / N/A"/>)}<select value={scorecard[key]?.trend||"stable"} onChange={e=>updateMetric(key,"trend",e.target.value)}><option value="improving">↑ Improving</option><option value="stable">→ Stable</option><option value="declining">↓ Declining</option></select></div>)}</div><label className="qbrWide">Scorecard interpretation<textarea value={scorecard.interpretation||""} onChange={e=>updateObject(setScorecard,"interpretation",e.target.value)} placeholder="Explain misses, data confidence, commercial effect and corrective action"/></label></Section>
    <ReviewSection number="03" title="Quality and audit assurance" fields={assuranceFields} value={assurance} setter={setAssurance}/>
    <ReviewSection number="04" title="Aerospace requirements where applicable" text="Complete for AS9100 or contractual aerospace scope; record N/A with a reason when not applicable." fields={aerospaceFields} value={aerospace} setter={setAerospace}/>
    <Section number="05" title="Risk and business continuity" text="Assess operational resilience and the controls protecting supply continuity."><div className="qbrFacts"><b>Live linked position</b><span>{ncStats.open} open NC · {ncStats.pending} pending · {ncStats.closed} closed</span><span>{audits.length} linked supplier audit{audits.length===1?"":"s"}</span></div><ReviewFields fields={riskFields} value={risk} setter={setRisk}/></Section>
    <ReviewSection number="06" title="Commercial and forward plan" fields={commercialFields} value={commercial} setter={setCommercial}/>
    <Section number="07" title="Action and escalation register" text="Carry forward open actions and link material quality actions to the controlled CAPA record."><div className="qbrActions">{actions.map((item,index)=><article key={index}><input value={item.id} onChange={e=>updateAction(index,"id",e.target.value)} placeholder="ID / issue"/><input value={item.action} onChange={e=>updateAction(index,"action",e.target.value)} placeholder="Action and evidence required"/><input value={item.owner} onChange={e=>updateAction(index,"owner",e.target.value)} placeholder="Owner"/><input type="date" value={item.due} onChange={e=>updateAction(index,"due",e.target.value)}/><select value={item.status} onChange={e=>updateAction(index,"status",e.target.value)}><option value="open">Open</option><option value="pending">Pending evidence</option><option value="closed">Closed</option></select><button type="button" onClick={()=>setActions(current=>current.filter((_,i)=>i!==index))}>Remove</button></article>)}</div><button className="qbrAdd" type="button" onClick={()=>setActions(current=>[...current,{id:"",action:"",owner:"",due:"",status:"open"}])}>+ Add action</button></Section>
    <Section number="08" title="Monitoring and approval record" text="The quarterly engine calculates the next QBR from the current review date."><div className="qbrGrid"><label>Monitoring level<select name="monitoring_level" defaultValue={review?.monitoring_level || "routine"}><option value="routine">Routine</option><option value="enhanced">Enhanced</option><option value="restricted">Restricted</option></select></label><label>Next QBR date *<input type="date" name="next_qbr_date" value={nextDate} onChange={e=>setNextDate(e.target.value)} required/><small>Automatically set three months after the review date; an authorised user may adjust it.</small></label><label>Approval expiry<input type="date" name="approval_expiry" defaultValue={review?.approval_expiry || supplier.approval_expiry || ""}/></label><label className="wide">Approval conditions<textarea name="approval_conditions" defaultValue={review?.approval_conditions || supplier.approval_conditions || ""}/></label></div></Section>
    <footer className="qbrSubmit"><div><b>{review?.qbr_reference || "New controlled QBR"}</b><span>Drafts remain editable. Complete only after the review decision has been authorised.</span></div><button name="intent" value="draft" disabled={pending}>Save draft</button><button className="primary" name="intent" value="complete" disabled={pending}>{pending?"Saving…":"Complete QBR"}</button></footer>
  </form>;
}

import { saveSupplierQbr as saveAction } from "./actions";
function Section({number,title,text,children}){return <section className="qbrSection"><header><span>{number}</span><div><h2>{title}</h2>{text&&<p>{text}</p>}</div></header>{children}</section>}
function Read({label,value}){return <div className="qbrRead"><span>{label}</span><b>{value||"Not set"}</b></div>}
function ReviewFields({fields,value,setter}){return <div className="qbrGrid">{fields.map(([key,label])=><label className="wide" key={key}>{label}<textarea value={value[key]||""} onChange={e=>setter(current=>({...current,[key]:e.target.value}))} placeholder="Evidence reviewed, conclusion and follow-up"/></label>)}</div>}
function ReviewSection({number,title,text,fields,value,setter}){return <Section number={number} title={title} text={text}><ReviewFields fields={fields} value={value} setter={setter}/></Section>}
