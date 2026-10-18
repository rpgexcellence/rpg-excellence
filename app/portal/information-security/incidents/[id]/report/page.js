import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOrganizationAccess } from "../../../../../../lib/organization-access";
import { incidentLabel, loadSecurityIncidentOptions } from "../../../../../../lib/ismsSecurityIncidents";
import { createAdminClient } from "../../../../../../lib/supabase/admin";

export const dynamic = "force-dynamic";
export const metadata = { title: "Controlled Security Incident Report | RPG Excellence" };

const value = (input, fallback = "Not recorded") => input || fallback;
const dateTime = (input) => input
  ? new Intl.DateTimeFormat("en-GB", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Europe/London",
    }).format(new Date(input))
  : "Not recorded";
const dateOnly = (input) => input
  ? new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeZone: "Europe/London" }).format(new Date(`${input}T12:00:00Z`))
  : "Not recorded";
const yesNoPending = (input) => input === true ? "Yes" : input === false ? "No" : "Assessment pending";

function Field({label,children,wide=false}) {
  return <div className={wide?"sirField wide":"sirField"}><small>{label}</small><div>{children||"Not recorded"}</div></div>;
}

export default async function SecurityIncidentReportPage({params}) {
  const { id } = await params;
  const { organization } = await requireOrganizationAccess(
    "information_security",
    "view",
    `/portal/information-security/incidents/${id}/report`,
  );
  const admin = createAdminClient();
  const [{data:incident,error},options,{data:evidence=[]},{data:documentLinks=[]}]=await Promise.all([
    admin.from("isms_security_incidents").select("*").eq("id",id).eq("organization_id",organization.id).maybeSingle(),
    loadSecurityIncidentOptions(organization),
    admin.from("isms_security_incident_evidence").select("id,evidence_type,description,original_file_name,file_size_bytes,created_at").eq("incident_id",id).eq("organization_id",organization.id).order("created_at"),
    admin.from("isms_security_incident_documents").select("controlled_document_id,link_purpose,created_at").eq("incident_id",id).eq("organization_id",organization.id).order("created_at"),
  ]);
  if(error)throw new Error(error.message);
  if(!incident)notFound();

  const person=(personId)=>options.people.find((item)=>item.id===personId)?.name||"Not assigned";
  const actor=(userId)=>options.people.find((item)=>item.user_id===userId)?.name||"Authenticated user recorded";
  const finding=options.findings.find((item)=>item.id===incident.linked_finding_id);
  const capa=options.cases.find((item)=>item.id===incident.linked_rca_case_id);
  const moc=options.changes.find((item)=>item.id===incident.linked_moc_id);
  const bcp=options.bcpIncidents.find((item)=>item.id===incident.linked_bcp_incident_id);
  const documents=documentLinks.map((link)=>({
    ...link,
    document:options.documents.find((item)=>item.id===link.controlled_document_id),
  })).filter((item)=>item.document);

  return <main className="sirPage"><style>{styles}</style><div className="sirToolbar"><Link href={`/portal/information-security/incidents/${id}`}>← Return to incident</Link><span>Use your browser’s Print command to print or save this controlled report as PDF.</span></div><article className="sirReport">
    <header className="sirHeader"><div><small>RPG EXCELLENCE · CONTROLLED ASSURANCE RECORD</small><h1>Security Incident Report</h1><p>{organization.name}</p></div><div><strong>{incident.incident_reference}</strong><span className={`sirStatus ${incident.status}`}>{incidentLabel(incident.status)}</span></div></header>

    <section><h2>1. Executive classification</h2><div className="sirGrid">
      <Field label="Incident title" wide>{incident.title}</Field>
      <Field label="Incident type">{incidentLabel(incident.incident_type)}</Field>
      <Field label="Severity">{incidentLabel(incident.severity)}</Field>
      <Field label="Status">{incidentLabel(incident.status)}</Field>
      <Field label="Administration site">{value(incident.administration_location_label,"Organisation-wide / not selected")}</Field>
      <Field label="Detected">{dateTime(incident.detected_at)}</Field>
      <Field label="Awareness">{dateTime(incident.awareness_at)}</Field>
      <Field label="Target recovery date">{dateOnly(incident.target_recovery_date)}</Field>
      <Field label="Closed">{dateTime(incident.closed_at)}</Field>
      <Field label="Affected organisation or customer">{value(incident.affected_organization)}</Field>
      <Field label="Affected service">{value(incident.affected_service)}</Field>
      <Field label="Observed event and circumstances" wide>{incident.description}</Field>
      <Field label="Affected data or records" wide>{value(incident.affected_data)}</Field>
      <Field label="Immediate impact" wide>{value(incident.immediate_impact)}</Field>
      <Field label="Continuing risk" wide>{value(incident.continuing_risk)}</Field>
    </div></section>

    <section><h2>2. Controlled accountability</h2><div className="sirGrid">
      <Field label="Incident lead">{person(incident.incident_lead_person_id)}</Field>
      <Field label="Technical lead">{person(incident.technical_lead_person_id)}</Field>
      <Field label="Privacy lead">{person(incident.privacy_lead_person_id)}</Field>
      <Field label="Communications lead">{person(incident.communications_lead_person_id)}</Field>
      <Field label="Independent verifier">{person(incident.verifier_person_id)}</Field>
      <Field label="Closure approver">{person(incident.closure_approved_by_person_id)}</Field>
    </div></section>

    <section><h2>3. Privacy and notification assessment</h2><div className="sirGrid">
      <Field label="Personal data involved">{incident.personal_data_involved?"Yes":"No"}</Field>
      <Field label="ICO notification required">{yesNoPending(incident.ico_notification_required)}</Field>
      <Field label="ICO notified">{dateTime(incident.ico_notified_at)}</Field>
      <Field label="Affected people notification required">{yesNoPending(incident.affected_people_notification_required)}</Field>
      <Field label="Affected people notified">{dateTime(incident.affected_people_notified_at)}</Field>
      <Field label="NCSC reported">{dateTime(incident.ncsc_reported_at)}</Field>
      <Field label="Decision and rationale" wide>{value(incident.notification_assessment)}</Field>
    </div></section>

    <section><h2>4. Response, cause and recovery</h2><div className="sirGrid">
      <Field label="Containment" wide>{value(incident.containment_summary)}</Field>
      <Field label="Investigation" wide>{value(incident.investigation_summary)}</Field>
      <Field label="Root cause and extent" wide>{value(incident.root_cause_summary)}</Field>
      <Field label="Recovery and verification evidence" wide>{value(incident.recovery_summary)}</Field>
      <Field label="Lessons learned" wide>{value(incident.lessons_learned)}</Field>
    </div></section>

    <section className="sirDecisionSection"><h2>5. Independent verification and closure</h2><div className="sirGrid">
      <Field label="Verification result">{incidentLabel(incident.verification_result||"pending")}</Field>
      <Field label="Verified by">{incident.verified_at?actor(incident.verified_by_user_id):"Not recorded"}</Field>
      <Field label="Verification timestamp">{dateTime(incident.verified_at)}</Field>
      <Field label="Verification evidence and conclusion" wide>{value(incident.verification_summary)}</Field>
      <Field label="Closure approved by">{incident.closure_approved_at?actor(incident.closure_approved_by_user_id):"Not recorded"}</Field>
      <Field label="Closure approval timestamp">{dateTime(incident.closure_approved_at)}</Field>
      <Field label="Closure approval rationale" wide>{value(incident.closure_approval_comment)}</Field>
    </div></section>

    <section><h2>6. Interconnected assurance records</h2><div className="sirGrid">
      <Field label="Finding or nonconformity">{finding?`${finding.finding_reference} · ${finding.title}`:"Not linked"}</Field>
      <Field label="CAPA-8D case">{capa?`${capa.case_reference||"CAPA"} · ${capa.title}`:"Not linked"}</Field>
      <Field label="Management of Change">{moc?`${moc.moc_reference} · ${moc.title}`:"Not linked"}</Field>
      <Field label="Related BCP response">{bcp?`${bcp.title} · v${bcp.version||1}`:"Not linked"}</Field>
    </div>
    <h3>Controlled documents</h3>{documents.length?<table><thead><tr><th>Document</th><th>Revision</th><th>Purpose</th></tr></thead><tbody>{documents.map((item)=><tr key={`${item.controlled_document_id}-${item.link_purpose}`}><td>{item.document.document_number} · {item.document.title}</td><td>{item.document.revision}</td><td>{incidentLabel(item.link_purpose)}</td></tr>)}</tbody></table>:<p className="sirEmpty">No controlled documents linked.</p>}
    </section>

    <section><h2>7. Objective evidence register</h2>{evidence.length?<table><thead><tr><th>File</th><th>Type</th><th>Description</th><th>Uploaded</th></tr></thead><tbody>{evidence.map((item)=><tr key={item.id}><td><a href={`/portal/information-security/incidents/${id}/evidence/${item.id}`}>{item.original_file_name}</a><br/><small>{Math.ceil(item.file_size_bytes/1024)} KB</small></td><td>{incidentLabel(item.evidence_type)}</td><td>{value(item.description,"No description")}</td><td>{dateTime(item.created_at)}</td></tr>)}</tbody></table>:<p className="sirEmpty">No objective evidence files recorded.</p>}</section>

    <footer><div><strong>Controlled system record</strong><span>Generated from RPG Excellence on {dateTime(new Date().toISOString())}</span></div><div><strong>{incident.incident_reference}</strong><span>Current status: {incidentLabel(incident.status)}</span></div></footer>
  </article></main>;
}

const styles=`*{box-sizing:border-box}.sirPage{min-height:100vh;padding:24px;background:#eaf1f6;color:#0b213b;font-family:Arial,sans-serif}.sirToolbar{display:flex;justify-content:space-between;gap:16px;align-items:center;max-width:1120px;margin:0 auto 14px}.sirToolbar a{padding:10px 13px;border:1px solid #c7d7e3;border-radius:8px;background:#fff;color:#123f68;text-decoration:none;font-weight:900}.sirToolbar span{color:#5f7589;font-size:12px}.sirReport{max-width:1120px;margin:auto;background:#fff;border:1px solid #cbd9e3;box-shadow:0 12px 34px rgba(18,49,77,.08)}.sirHeader{display:flex;justify-content:space-between;gap:24px;padding:30px;background:#0b3159;color:#fff}.sirHeader small{color:#65e4d2;font-weight:900;letter-spacing:.11em}.sirHeader h1{margin:7px 0 5px;font-size:34px}.sirHeader p{margin:0;color:#c9d8e6}.sirHeader>div:last-child{display:grid;justify-items:end;align-content:start;gap:10px}.sirHeader>div:last-child>strong{font-size:17px}.sirStatus{padding:7px 10px;border:1px solid #5d7894;border-radius:999px;background:#173f67;font-size:12px;font-weight:900}.sirStatus.closed{border-color:#56cfaa;background:#0a614c}.sirReport section{padding:24px 30px;border-bottom:1px solid #d7e2e9}.sirReport h2{margin:0 0 15px;font-size:20px}.sirReport h3{margin:20px 0 9px;font-size:15px}.sirGrid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.sirField{min-width:0;padding:11px 12px;border:1px solid #d7e2e9;border-radius:8px;background:#f8fafc}.sirField.wide{grid-column:1/-1}.sirField small{display:block;margin-bottom:5px;color:#5f778b;font-size:10px;font-weight:900;letter-spacing:.06em;text-transform:uppercase}.sirField div{white-space:pre-wrap;overflow-wrap:anywhere;line-height:1.45}.sirDecisionSection{background:#f6fcfa}.sirReport table{width:100%;border-collapse:collapse;font-size:12px}.sirReport th,.sirReport td{padding:9px;border:1px solid #d5e0e7;text-align:left;vertical-align:top}.sirReport th{background:#edf3f7;color:#31526d}.sirReport td a{color:#125db3;font-weight:800}.sirReport td small{color:#698093}.sirEmpty{padding:12px;border:1px dashed #c7d7e3;border-radius:8px;color:#698093}.sirReport footer{display:flex;justify-content:space-between;gap:20px;padding:20px 30px;background:#f1f5f8}.sirReport footer div{display:grid;gap:4px}.sirReport footer div:last-child{text-align:right}.sirReport footer span{color:#61788b;font-size:11px}@media(max-width:720px){.sirPage{padding:10px}.sirToolbar{display:grid}.sirToolbar a{text-align:center}.sirHeader{display:grid;padding:22px}.sirHeader>div:last-child{justify-items:start}.sirReport section{padding:18px}.sirGrid{grid-template-columns:1fr}.sirField.wide{grid-column:auto}.sirReport table{display:block;overflow-x:auto}.sirReport footer{display:grid}.sirReport footer div:last-child{text-align:left}}@media print{.sirPage{padding:0;background:#fff}.sirToolbar{display:none}.sirReport{max-width:none;border:0;box-shadow:none}.sirReport section{break-inside:avoid}.sirHeader{-webkit-print-color-adjust:exact;print-color-adjust:exact}.sirDecisionSection{-webkit-print-color-adjust:exact;print-color-adjust:exact}.sirReport footer{break-inside:avoid}}`;
