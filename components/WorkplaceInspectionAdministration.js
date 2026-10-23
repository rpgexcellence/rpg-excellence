"use client";
import { useActionState } from "react";
import { EDITABLE_APPOINTMENTS } from "../lib/workplace-inspection-policy.mjs";
function Message({state}) {
  return state?.error ? <div className="wpiMessage error" role="alert">{state.error}</div> : state?.success ? <div className="wpiMessage success" role="status">{state.success}</div> : null;
}
function PersonOptions({people,current}) {
  return <><option value="">Select active Company User</option>{!people.some(p=>p.id===current&&p.account_status==='active') ? <option value={current} disabled>Current appointment — select an active user</option> : null}{people.filter(p=>p.account_status==='active').map(p=><option key={p.id} value={p.id}>{p.label}</option>)}</>;
}
export default function WorkplaceInspectionAdministration({inspection,people,canAdminister,canStart,startAction,updateAction,stageTitle,leadName}) {
  const [startState,startForm,starting]=useActionState(startAction,null);
  const [editState,editForm,saving]=useActionState(updateAction,null);
  const planned=['planned','draft','due'].includes(inspection.status);
  return <>
    {planned ? <section className="wpiPanel" style={{marginTop:14}} aria-label="Start assigned inspection">
      <h2>{stageTitle}</h2><p className="wpiLead">Assigned to <strong>{leadName}</strong>. Scheduling creates the record; opening it does not start fieldwork.</p>
      {canStart ? <form action={startForm}><input type="hidden" name="inspection_id" value={inspection.id}/><button className="wpiButton primary" disabled={starting}>{starting?'Starting…':'Start inspection'}</button></form> : <div className="wpiGuidance">The assigned lead inspector needs an active linked account with Risk Management Create / edit access, then must sign in and select Start inspection. Administrators can amend the appointment below.</div>}
      <Message state={startState}/>
    </section> : null}
    {canAdminister ? <section className="wpiPanel" style={{marginTop:14}}>
      <details><summary style={{fontWeight:850,cursor:'pointer',padding:'5px 0'}}>Administration — edit inspection details</summary>
      <p className="wpiLead">Changes apply to this inspection only. Use Edit programme for future inspection defaults. Existing answers, assessor identities and evidence are retained.</p>
      {EDITABLE_APPOINTMENTS.includes(inspection.status) ? <form key={inspection.updated_at} action={editForm} className="wpiProgrammeForm">
        <input type="hidden" name="inspection_id" value={inspection.id}/><input type="hidden" name="expected_updated_at" value={inspection.updated_at}/>
        <label className="wpiField"><span>Inspection title *</span><input name="title" defaultValue={inspection.title} maxLength={180} required/></label>
        <div className="wpiFormGrid three">{[['accountable_person_id','Accountable owner'],['lead_inspector_person_id','Lead inspector / assessor'],['reviewer_person_id','Independent reviewer']].map(([key,label])=><label className="wpiField" key={key}><span>{label} *</span><select name={key} defaultValue={inspection[key]} required><PersonOptions people={people} current={inspection[key]}/></select></label>)}</div>
        <div className="wpiFormGrid"><label className="wpiField"><span>Planned start (UTC) *</span><input type="datetime-local" name="planned_start" defaultValue={inspection.planned_start_at?.slice(0,16)} required/></label><label className="wpiField"><span>Planned end (UTC) *</span><input type="datetime-local" name="planned_end" defaultValue={inspection.planned_end_at?.slice(0,16)} required/></label></div>
        <label className="wpiField"><span>Inspection scope</span><textarea name="scope" rows={3} defaultValue={inspection.scope || ''} maxLength={3000}/></label>
        <label className="wpiField"><span>Reason for change *</span><textarea name="change_reason" rows={2} maxLength={2000} required placeholder="Explain the appointment, scope or scheduling change."/></label>
        <p className="wpiLead">The reviewer cannot be the lead inspector or anyone who has recorded fieldwork. Changes while awaiting review return the record to fieldwork for resubmission. Details are locked after independent approval.</p>
        <Message state={editState}/><button className="wpiButton primary" disabled={saving}>{saving?'Saving…':'Save inspection details'}</button>
      </form> : <div className="wpiGuidance">This record has passed independent review or is closed. Its approved details are locked.</div>}
      </details>
    </section> : null}
  </>;
}
