"use client";

import { useMemo, useState } from "react";

const TYPES=[["security_event","Security event"],["unauthorised_access","Unauthorised access"],["data_breach","Personal data breach"],["malware","Malware or ransomware"],["phishing","Phishing or social engineering"],["service_disruption","Service disruption"],["api_integration","API or integration incident"],["supplier_incident","Supplier incident"],["vulnerability","Vulnerability"],["other","Other"]];
const STATUSES=[["reported","Reported"],["triage","Triage"],["contained","Contained"],["investigating","Investigating"],["recovery","Recovery"],["action_required","Action required"],["awaiting_verification","Awaiting verification"],["closed","Closed"],["cancelled","Cancelled"]];
const EVIDENCE=[["log","Log"],["screenshot","Screenshot"],["request_id","Request identifier"],["configuration","Configuration"],["communication","Communication"],["specialist_report","Specialist report"],["other","Other"]];
const iso=(value)=>value?new Date(value).toISOString().slice(0,16):"";

function Person({name,label,people,value,required=false,help}) {
  return <label><span>{label}{required?" *":""}</span><select name={name} defaultValue={value||""} required={required}><option value="">Not assigned</option>{people.map((person)=><option key={person.id} value={person.id}>{person.name}{person.position?` · ${person.position}`:""}</option>)}</select>{help&&<small>{help}</small>}</label>;
}
function Area({name,label,value,placeholder}) {
  return <label className="sifWide"><span>{label}</span><textarea name={name} defaultValue={value||""} rows="4" placeholder={placeholder}/></label>;
}
function LinkSelect({name,label,items,value,render}) {
  return <label><span>{label}</span><select name={name} defaultValue={value||""}><option value="">Not linked</option>{items.map((item)=><option key={item.id} value={item.id}>{render(item)}</option>)}</select></label>;
}

export default function SecurityIncidentForm({action,incident=null,options,linkedDocumentIds=[]}) {
  const [query,setQuery]=useState("");
  const [selected,setSelected]=useState(linkedDocumentIds);
  const [status,setStatus]=useState(incident?.status||"reported");
  const closureReady=Boolean(incident?.verification_result==="effective"&&incident?.verified_at&&incident?.closure_approved_at);
  const available=useMemo(()=>options.documents.filter((document)=>!selected.includes(document.id)&&`${document.document_number} ${document.title}`.toLowerCase().includes(query.toLowerCase())),[options.documents,query,selected]);
  const add=(id)=>{if(id&&!selected.includes(id))setSelected((current)=>[...current,id]);setQuery("");};

  return <form action={action} className="sif"><style>{styles}</style><input type="hidden" name="id" value={incident?.id||""}/>
    <section><header><small>1 · CLASSIFICATION</small><h2>Report and classify</h2><p>Record what is known. Severity and status may change as evidence develops.</p></header><div className="sifGrid">
      <label className="sifWide"><span>Incident title *</span><input name="title" defaultValue={incident?.title||""} required maxLength="220" placeholder="Short factual description"/></label>
      <label><span>Incident type *</span><select name="incident_type" defaultValue={incident?.incident_type||"security_event"}>{TYPES.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label>
      <label><span>Severity *</span><select name="severity" defaultValue={incident?.severity||"medium"}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option></select><small>Use impact, scale, sensitivity and continuing harm.</small></label>
      <label><span>Status *</span><select name="status" value={status} onChange={(event)=>setStatus(event.target.value)}>{STATUSES.map(([v,l])=><option key={v} value={v} disabled={v==="closed"&&!closureReady}>{l}{v==="closed"&&!closureReady?" — verification and approval required":""}</option>)}</select><small>Awaiting verification opens the independent decision stage. Closed remains locked until verification and approval are recorded.</small></label>
      <label><span>Detected at *</span><input type="datetime-local" name="detected_at" defaultValue={iso(incident?.detected_at)||new Date().toISOString().slice(0,16)} required/></label>
      <label><span>Awareness at</span><input type="datetime-local" name="awareness_at" defaultValue={iso(incident?.awareness_at)}/><small>Starts the UK GDPR notification clock where applicable.</small></label>
      <label><span>Target recovery date</span><input type="date" name="target_recovery_date" defaultValue={incident?.target_recovery_date||""}/></label>
      <label><span>Administration site</span><select name="administration_location_id" defaultValue={incident?.administration_location_id||""}><option value="">Organisation wide / not selected</option>{options.sites.map((site)=><option key={site.id} value={site.id}>{site.label}</option>)}</select></label>
      <label><span>Affected organisation or customer</span><input name="affected_organization" defaultValue={incident?.affected_organization||""}/></label>
      <label><span>Affected service</span><input name="affected_service" defaultValue={incident?.affected_service||""}/></label>
      <Area name="description" label="Observed event and circumstances *" value={incident?.description} placeholder="What happened, how it was detected, current facts and known uncertainties."/>
      <Area name="affected_data" label="Affected data or records" value={incident?.affected_data} placeholder="Categories, sensitivity, approximate scale and protection applied."/>
      <Area name="immediate_impact" label="Immediate impact" value={incident?.immediate_impact} placeholder="Customer, service, privacy, contractual or business consequences."/>
      <Area name="continuing_risk" label="Continuing risk" value={incident?.continuing_risk} placeholder="What could still happen and which controls remain uncertain."/>
    </div></section>

    <section><header><small>2 · CONTROLLED ROLES</small><h2>Assign Company Users</h2><p>Only active users from this organisation are available. Assignment does not itself constitute verification or approval.</p></header><div className="sifGrid">
      <Person name="incident_lead_person_id" label="Incident lead" people={options.people} value={incident?.incident_lead_person_id} required help="Coordinates the response and owns the incident record."/>
      <Person name="technical_lead_person_id" label="Technical lead" people={options.people} value={incident?.technical_lead_person_id}/>
      <Person name="privacy_lead_person_id" label="Privacy lead" people={options.people} value={incident?.privacy_lead_person_id}/>
      <Person name="communications_lead_person_id" label="Communications lead" people={options.people} value={incident?.communications_lead_person_id}/>
      <Person name="verifier_person_id" label="Independent verifier" people={options.people} value={incident?.verifier_person_id} help="Cannot be the incident lead. This user must sign in and personally record the verification decision."/>
      <Person name="closure_approved_by_person_id" label="Closure approver" people={options.people} value={incident?.closure_approved_by_person_id} help="This user must sign in and personally approve closure after effective verification."/>
    </div></section>

    <section><header><small>3 · PRIVACY AND NOTIFICATION</small><h2>Assess reporting obligations</h2><p>Record the decision even when notification is not required.</p></header><div className="sifGrid">
      <label className="sifCheck sifWide"><input type="checkbox" name="personal_data_involved" value="true" defaultChecked={incident?.personal_data_involved}/><span><b>Personal data may be involved</b><small>Complete the risk and notification assessment.</small></span></label>
      <label><span>ICO notification required</span><select name="ico_notification_required" defaultValue={incident?.ico_notification_required===true?"yes":incident?.ico_notification_required===false?"no":""}><option value="">Assessment pending</option><option value="yes">Yes</option><option value="no">No</option></select></label>
      <label><span>ICO notified at</span><input type="datetime-local" name="ico_notified_at" defaultValue={iso(incident?.ico_notified_at)}/></label>
      <label><span>Affected people notification</span><select name="affected_people_notification_required" defaultValue={incident?.affected_people_notification_required===true?"yes":incident?.affected_people_notification_required===false?"no":""}><option value="">Assessment pending</option><option value="yes">Required</option><option value="no">Not required</option></select></label>
      <label><span>Affected people notified at</span><input type="datetime-local" name="affected_people_notified_at" defaultValue={iso(incident?.affected_people_notified_at)}/></label>
      <label><span>NCSC reported at</span><input type="datetime-local" name="ncsc_reported_at" defaultValue={iso(incident?.ncsc_reported_at)}/></label>
      <Area name="notification_assessment" label="Notification decision and rationale" value={incident?.notification_assessment} placeholder="Risk to individuals, authority decision, contractual reporting and any reason for delay or non-notification."/>
    </div></section>

    <section><header><small>4 · RESPONSE AND RECOVERY</small><h2>Record controlled response</h2></header><div className="sifGrid">
      <Area name="containment_summary" label="Containment" value={incident?.containment_summary} placeholder="Credentials revoked, access isolated, unsafe functions disabled and evidence preserved."/>
      <Area name="investigation_summary" label="Investigation" value={incident?.investigation_summary} placeholder="Entry route, scope, affected records, duration and control failures."/>
      <Area name="root_cause_summary" label="Root cause and extent" value={incident?.root_cause_summary} placeholder="Evidence-based cause, extent and recurrence risk."/>
      <Area name="recovery_summary" label="Recovery and verification evidence" value={incident?.recovery_summary} placeholder="Known-safe restoration, integrity checks, monitoring and effectiveness result."/>
      <Area name="lessons_learned" label="Lessons learned" value={incident?.lessons_learned} placeholder="Improvements to controls, training, suppliers, documentation or architecture."/>
    </div></section>

    {(status==="awaiting_verification"||status==="closed")&&<section className="sifGate"><header><small>5 · INDEPENDENT VERIFICATION AND CLOSURE GATE</small><h2>Verify effectiveness before closure</h2><p>The assigned users must record their own decisions. Selecting their names does not constitute verification or approval.</p></header><div className="sifGrid">
      <label><span>Independent verification decision *</span><select name="verification_result" defaultValue={incident?.verification_result||"pending"}><option value="pending">Pending — no decision recorded</option><option value="effective">Effective — recovery verified</option><option value="not_effective">Not effective — further action required</option></select><small>Only the assigned Independent Verifier may record this decision. A Not effective decision returns the incident to Action required.</small></label>
      <label><span>Verification record</span><input value={incident?.verified_at?`Recorded ${new Date(incident.verified_at).toLocaleString()}`:"Not yet recorded"} readOnly/></label>
      <Area name="verification_summary" label="Verification evidence and conclusion" value={incident?.verification_summary} placeholder="State what was independently checked, the evidence sampled and why recovery is or is not effective."/>
      <label className="sifCheck sifWide"><input type="checkbox" name="closure_approval_confirmed" value="true" defaultChecked={Boolean(incident?.closure_approved_at)}/><span><b>Approve controlled closure</b><small>Only the assigned Closure Approver may confirm this after effective independent verification. The signed-in user and timestamp are recorded.</small></span></label>
      <Area name="closure_approval_comment" label="Closure approval rationale" value={incident?.closure_approval_comment} placeholder="Confirm that recovery, reporting, evidence, actions and lessons learned are adequate for controlled closure."/>
      {incident?.closure_approved_at&&<div className="sifRecorded sifWide"><strong>Closure approval recorded</strong><span>{new Date(incident.closure_approved_at).toLocaleString()}</span></div>}
    </div></section>}

    <section><header><small>6 · INTERCONNECTED ASSURANCE</small><h2>Link controlled records</h2><p>An incident does not automatically become a nonconformity. Link records after the appropriate decision.</p></header><div className="sifGrid">
      <LinkSelect name="linked_finding_id" label="Finding or nonconformity" items={options.findings} value={incident?.linked_finding_id} render={(x)=>`${x.finding_reference} · ${x.title}`}/>
      <LinkSelect name="linked_rca_case_id" label="CAPA-8D case" items={options.cases} value={incident?.linked_rca_case_id} render={(x)=>`${x.case_reference||"CAPA"} · ${x.title}`}/>
      <LinkSelect name="linked_moc_id" label="Management of Change" items={options.changes} value={incident?.linked_moc_id} render={(x)=>`${x.moc_reference} · ${x.title}`}/>
      <LinkSelect name="linked_bcp_incident_id" label="Related BCP response — optional" items={options.bcpIncidents} value={incident?.linked_bcp_incident_id} render={(x)=>`${x.title} · v${x.version||1}`}/>
      <div className="sifDoc sifWide"><span>Controlled documents</span><div className="sifSearch"><input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="Search document number or title"/><select value="" onChange={(e)=>add(e.target.value)}><option value="">Select a matching document</option>{available.map((document)=><option value={document.id} key={document.id}>{document.document_number} · {document.title} · Rev {document.revision}</option>)}</select></div><div className="sifSelected">{selected.length?selected.map((id)=>{const document=options.documents.find((item)=>item.id===id);return document?<div key={id}><input type="hidden" name="controlled_document_ids" value={id}/><span>{document.document_number} · {document.title}</span><button type="button" onClick={()=>setSelected((current)=>current.filter((value)=>value!==id))}>Remove</button></div>:null}):<small>No controlled document linked. Add RPG-SEC-PRO-003 as the governing procedure.</small>}</div></div>
    </div></section>

    <section><header><small>7 · OBJECTIVE EVIDENCE</small><h2>Add evidence</h2><p>Do not upload passwords, recovery codes, complete API keys or private keys.</p></header><div className="sifGrid"><label><span>Evidence type</span><select name="evidence_type" defaultValue="other">{EVIDENCE.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label><label><span>Evidence file</span><input type="file" name="evidence_file" accept=".pdf,.txt,.csv,.json,.jpg,.jpeg,.png,.webp,.docx"/></label><label className="sifWide"><span>Evidence description</span><input name="evidence_description" placeholder="Source, date, relevance and any access restriction"/></label></div></section>

    <footer><p>Closure requires recovery evidence, an effective decision recorded by the assigned Independent Verifier and approval recorded by the assigned Closure Approver.</p><button type="submit">{incident?"Save incident record":"Create incident record"} →</button></footer>
  </form>;
}

const styles=`.sif{display:grid;gap:16px}.sif section{padding:22px;border:1px solid #d0dee8;border-radius:15px;background:#fff}.sif header small{color:#087f91;font-weight:950;letter-spacing:.11em}.sif header h2{margin:5px 0;font-size:23px}.sif header p{margin:0 0 16px;color:#687f93}.sifGrid{display:grid;grid-template-columns:1fr 1fr;gap:14px}.sif label,.sifDoc{display:grid;gap:6px}.sif label>span,.sifDoc>span{font-size:12px;font-weight:900}.sif input,.sif select,.sif textarea{width:100%;padding:11px 12px;border:1px solid #bfcfdb;border-radius:8px;background:#fbfdff;color:#082745;font:inherit}.sif textarea{resize:vertical;line-height:1.45}.sif label small{color:#6d8295;line-height:1.35}.sifWide{grid-column:1/-1}.sifCheck{grid-template-columns:auto 1fr!important;align-items:flex-start;padding:12px;border:1px solid #cfe0e9;border-radius:9px;background:#f2f7fa}.sifCheck input{width:auto;margin-top:3px}.sifCheck span,.sifCheck small{display:block}.sifGate{border-color:#84ccb8!important;background:linear-gradient(180deg,#f7fffc,#fff)!important}.sifRecorded{display:flex;justify-content:space-between;gap:12px;padding:12px;border:1px solid #8fd5b6;border-radius:9px;background:#e7f6ef;color:#096044}.sifSearch{display:grid;grid-template-columns:1fr 1.4fr;gap:8px}.sifSelected{display:grid;gap:7px}.sifSelected>div{display:flex;justify-content:space-between;gap:12px;align-items:center;padding:9px 11px;border:1px solid #d6e3eb;border-radius:8px;background:#f4f8fb}.sifSelected button{border:0;background:none;color:#b0362d;font-weight:900;cursor:pointer}.sif footer{display:flex;justify-content:space-between;gap:20px;align-items:center;padding:17px 20px;border:1px solid #cfdee8;border-radius:13px;background:#fff}.sif footer p{margin:0;max-width:760px;color:#6a8093}.sif footer button{padding:13px 18px;border:0;border-radius:9px;background:#1762ef;color:#fff;font-weight:950;cursor:pointer;white-space:nowrap}@media(max-width:720px){.sif section{padding:16px}.sifGrid{grid-template-columns:1fr}.sifWide{grid-column:auto}.sifSearch{grid-template-columns:1fr}.sif footer{align-items:stretch;flex-direction:column}.sif footer button{width:100%}.sifRecorded{display:grid}}`;
