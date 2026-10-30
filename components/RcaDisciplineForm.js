"use client";

import { saveCapaStageState } from "../app/portal/rca/[id]/capa/actions";
import { gateFields } from "../lib/rca-workflow.mjs";
import { useActionState, startTransition } from "react";
import {
  manageStandaloneRca,
  saveDiscipline,
  addCorrectiveAction,
  addCauseHypothesis,
  saveCauseProfile,
} from "../app/portal/rca/[id]/actions";

const formActions = { manageStandaloneRca, saveCapaStage: saveCapaStageState, saveDiscipline, addCorrectiveAction, addCauseHypothesis, saveCauseProfile };

export default function RcaDisciplineForm({ actionName, children, discipline = null, gateData = {}, profile = "general_8d", people = [], detectedAt = null, className = undefined }) {
  const action = Object.prototype.hasOwnProperty.call(formActions, actionName) ? formActions[actionName] : null;
  if (typeof action !== "function") {
    return <div role="alert" style={{ padding: "12px 14px", borderRadius: 10, background: "#fff1f0", color: "#b42318", lineHeight: 1.5 }}>This form could not load its save action. Refresh the page after the deployment completes.</div>;
  }
  return <ConnectedForm action={action} className={className}>
    {actionName === "saveDiscipline" && <GateFields discipline={discipline} data={gateData} profile={profile} people={people} detectedAt={detectedAt} />}
    {children}
  </ConnectedForm>;
}

function ConnectedForm({ action, children, className }) {
  const [state, formAction, pending] = useActionState(action, null);
  return <form onSubmit={event => {
    event.preventDefault();
    if (pending) return;
    const data = new FormData(event.currentTarget);
    data.set("intent", event.nativeEvent.submitter?.value || "save");
    startTransition(() => formAction(data));
  }} aria-busy={pending}>
    {state?.error && <p role="alert" style={{ padding: "12px 14px", border: "1px solid #fda29b", borderRadius: 10, background: "#fff1f0", color: "#b42318", lineHeight: 1.5 }}>{state.error}</p>}
    <fieldset className={className} disabled={pending} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>{children}</fieldset>
    {pending && <p role="status" style={{ color: "#607089" }}>Saving…</p>}
  </form>;
}

function GateFields({discipline,data,profile,people,detectedAt}) {
  const fields=gateFields(discipline,profile);
  if(!fields.length)return null;
  const defaultDeadline=()=>{const start=Date.parse(detectedAt);return Number.isFinite(start)?new Date(start+(Number(discipline)===0?2:30)*86400000).toISOString().slice(0,16):"";};
  return <details open style={{marginTop:18,border:"1px solid #cfdae8",borderRadius:12,padding:16}}>
    <summary style={{fontWeight:850,cursor:"pointer"}}>D{discipline} approval evidence</summary>
    <p style={{color:'#607089',lineHeight:1.6}}>Save an incomplete draft at any time. Required approval evidence is checked when you approve the stage. Dates and times use UTC.</p>
    <input type="hidden" name="gate_data_present" value="1" />
    <div style={{display:'grid',gap:14}}>{fields.map(field=><label key={field.key} style={{display:'grid',gap:6,fontWeight:750}}>{field.label}{field.required?' *':''}
      <small style={{color:'#607089',fontWeight:400,lineHeight:1.5}}>{field.guide}</small>
      {field.type==='person'?<select name={'gate_'+field.key} defaultValue={data[field.key]||''} style={gateInput}><option value="">Select company person</option>{people.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select>:field.type==='textarea'?<textarea name={'gate_'+field.key} rows={3} maxLength={12000} defaultValue={data[field.key]||''} style={gateInput}/>:<input name={'gate_'+field.key} type={field.type} defaultValue={data[field.key]||(field.key==='milestone_due_at'?defaultDeadline():'')} style={gateInput}/>}
    </label>)}</div>
  </details>;
}
const gateInput={boxSizing:'border-box',width:'100%',minWidth:0,padding:12,border:'1px solid #cfdae8',borderRadius:9,font:'inherit',fontWeight:400,fontSize:16};
