import Link from "next/link";
import { notFound } from "next/navigation";
import ControlledDeviceDrafts from "../../../../../components/ControlledDeviceDrafts";
import { DocumentRecordPanel, DocumentRecordTabButton, DocumentRecordTabs, RecordIcon } from "../../../../../components/DocumentRecordTabs";
import SecurityIncidentForm from "../../../../../components/SecurityIncidentForm";
import SecurityIncidentTimeline from "../../../../../components/SecurityIncidentTimeline";
import { requireOrganizationAccess } from "../../../../../lib/organization-access";
import { incidentLabel, loadSecurityIncidentOptions } from "../../../../../lib/ismsSecurityIncidents";
import { createAdminClient } from "../../../../../lib/supabase/admin";
import s from "../../../documents/documents.module.css";
import shared from "../../../health-safety/risk-assessment/[id]/risk-record.module.css";
import score from "../../../../../components/HealthSafetyRiskScore.module.css";
import { saveSecurityIncident } from "../actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Security Incident | RPG Excellence" };

const REGISTER = "/portal/information-security/incidents";
const TABS = [
  ["overview", "Overview"],
  ["details", "Incident Details"],
  ["scope", "Investigation & Recovery"],
  ["approval", "Verification & Closure"],
  ["documents", "Evidence & Linked Records"],
  ["history", "Record History"],
];
const EDIT_TAB = ["clipboard", "Update Incident"];
const DATE = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeZone: "Europe/London" });
const DATE_TIME = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/London" });
const dateTime = value => value ? DATE_TIME.format(new Date(value)) : "Not recorded";
const dateOnly = value => value ? DATE.format(new Date(value)) : "Not recorded";
const decision = value => value == null ? "Assessment pending" : value ? "Yes" : "No";
const severityColours = {
  low: ["#217658", "#fff"],
  medium: ["#edbf54", "#352506"],
  high: ["#ef965b", "#351a0b"],
  critical: ["#a83531", "#fff"],
};

function Panel({ title, children }) {
  return <section className={s.recordPanel}><h2>{title}</h2>{children}</section>;
}

function Facts({ entries, detailed = false }) {
  return <dl className={[s.recordFacts, detailed && shared.detailsFacts].filter(Boolean).join(" ")}>
    {entries.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value || "Not recorded"}</dd></div>)}
  </dl>;
}

function FactGroup({ title, entries }) {
  return <section className={shared.detailsGroup}><h3>{title}</h3><Facts entries={entries} detailed/></section>;
}

export default async function SecurityIncidentPage({ params, searchParams }) {
  const { id } = await params;
  const query = await searchParams;
  const href = REGISTER + "/" + encodeURIComponent(id);
  const { organization, level, user } = await requireOrganizationAccess("information_security", "view", href);
  const admin = createAdminClient();
  const [{ data: incident, error }, options, { data: documentLinks }, { data: evidence }, { data: timelineEvents, error: timelineError }] = await Promise.all([
    admin.from("isms_security_incidents").select("*").eq("id", id).eq("organization_id", organization.id).maybeSingle(),
    loadSecurityIncidentOptions(organization),
    admin.from("isms_security_incident_documents").select("controlled_document_id").eq("incident_id", id).eq("organization_id", organization.id),
    admin.from("isms_security_incident_evidence").select("id,evidence_type,description,original_file_name,file_size_bytes,created_at")
      .eq("incident_id", id).eq("organization_id", organization.id).order("created_at", { ascending: false }),
    admin.from("assurance_task_events").select("id,event_type,actor_person_id,actor_user_id,previous_values,current_values,created_at")
      .eq("organization_id", organization.id).eq("source_table", "isms_security_incidents").eq("source_id", id).order("created_at", { ascending: false }),
  ]);
  if (error) throw new Error(error.message);
  if (timelineError) throw new Error(timelineError.message);
  if (!incident) notFound();

  const canEdit = ["contribute", "review", "approve", "admin", "owner"].includes(level);
  const tabs = canEdit ? [...TABS, EDIT_TAB] : TABS;
  const tab = tabs.some(([key]) => key === query?.tab) ? query.tab : "overview";
  const findPerson = personId => options.people.find(person => person.id === personId)?.name || (personId ? "Assigned company user" : "Unassigned");
  const findActor = userId => options.people.find(person => person.user_id === userId)?.name || "Authenticated user recorded";
  const timeline = (timelineEvents ?? []).map(event => ({
    ...event,
    actor_name: options.people.find(person => person.id === event.actor_person_id || person.user_id === event.actor_user_id)?.name,
  }));
  const linkedDocumentIds = (documentLinks ?? []).map(row => row.controlled_document_id);
  const documents = options.documents.filter(document => linkedDocumentIds.includes(document.id));
  const files = evidence ?? [];
  const finding = options.findings.find(item => item.id === incident.linked_finding_id);
  const capa = options.cases.find(item => item.id === incident.linked_rca_case_id);
  const change = options.changes.find(item => item.id === incident.linked_moc_id);
  const continuity = options.bcpIncidents.find(item => item.id === incident.linked_bcp_incident_id);
  const linkedRecords = [
    ["Finding or nonconformity", finding && <Link href={"/portal/internal-audit-actions/" + finding.id}>{finding.finding_reference} · {finding.title}</Link>],
    ["CAPA-8D case", capa && <Link href={"/portal/rca/" + capa.id}>{capa.case_reference || "CAPA"} · {capa.title}</Link>],
    ["Management of Change", change && <Link href={"/portal/health-safety/moc/" + change.id}>{change.moc_reference} · {change.title}</Link>],
    ["Business continuity response", continuity && continuity.title],
  ];
  const status = incidentLabel(incident.status);
  const statusStyle = { closed: "current", cancelled: "withdrawn", awaiting_verification: "in_review" }[incident.status];
  const severity = incidentLabel(incident.severity) || "Unrated";
  const [background, color] = severityColours[incident.severity] ?? ["#ebeff3", "#3e5569"];
  const site = incident.administration_location_label || "No site selected";
  const recoveryTarget = dateOnly(incident.target_recovery_date);
  const overview = [
    ["Reference", incident.incident_reference],
    ["Type", incidentLabel(incident.incident_type)],
    ["Detected", dateTime(incident.detected_at)],
    ["Site", site],
    ["Incident lead", findPerson(incident.incident_lead_person_id)],
  ];
  const lifecycle = [
    ["Incident reported", incident.created_at],
    ["Independent verification recorded", incident.verified_at],
    ["Closure approved", incident.closure_approved_at],
    ["Incident closed", incident.closed_at],
  ];
  const verification = incidentLabel(incident.verification_result || "pending");
  const closure = incident.closure_approved_at ? "Approved" : "Pending";

  return <main className={[s.page, s.registerPage, s.recordPage].join(" ")}><div className={s.shell}>
    <p className={s.recordBreadcrumb}><Link href="/portal/information-security">Information Security</Link> / <Link href={REGISTER}>Security Incidents</Link> / {incident.incident_reference}</p>
    <header className={s.hubHero + " " + s.recordHero}>
      <div className={s.recordTitle}>
        <span className={s.recordTitleIcon}><RecordIcon name="overview"/></span>
        <div><small>{incident.incident_reference} · CONTROLLED INCIDENT</small>
          <h1>{incident.title}</h1>
          <p>{[incidentLabel(incident.incident_type), organization.name, incident.administration_location_label].filter(Boolean).join(" · ")}</p>
        </div>
      </div>
      <div className={s.recordHeaderActions}>
        <span className={s.recordStatus} data-status={statusStyle}>{status}</span>
        <Link className={s.recordButton} href={href + "/report"}><RecordIcon name="open"/>Controlled report</Link>
        <Link className={s.recordButton} href={href + "?tab=approval"}>Verification &amp; closure</Link>
        {canEdit && <Link className={s.recordButton} href={href + "?tab=clipboard"}>Update incident</Link>}
      </div>
    </header>
    {query?.saved === "1" && <p className={s.recordStatus} data-status="current" role="status">Incident record saved successfully.</p>}
    <DocumentRecordTabs key={tab} tabs={tabs} initial={tab} sectionLabel="Security incident sections">
      <DocumentRecordPanel name="overview">
        <div className={s.recordOverview}>
          <Panel title="Incident profile">
            <div className={shared.profile}>
              <div className={score.score} style={{ background, color }}><span className={score.title}>Recorded severity</span><strong>{severity}</strong></div>
              <div className={score.score + " " + score.unrated}><span className={score.title}>Current status</span><span>{status}</span></div>
            </div>
            <p><strong>Recovery target</strong> · {recoveryTarget}</p>
            <DocumentRecordTabButton name="details">View incident details</DocumentRecordTabButton>
          </Panel>
          <Panel title="Incident details"><Facts entries={overview}/></Panel>
          <Panel title="Response lifecycle">
            <ul className={s.recordMilestones}>{lifecycle.map(([label, at]) => <li key={label} data-state={at ? "done" : undefined}>
              <span className={s.recordMilestone} aria-hidden="true">{at && <RecordIcon name="check"/>}</span>
              <strong>{label}</strong>{at ? <time dateTime={at}>{dateTime(at)}</time> : <span>Not recorded</span>}
            </li>)}</ul>
          </Panel>
        </div>
        <div className={s.recordOverview}>
          <Panel title="Investigation &amp; recovery">
            <p>Investigation {incident.investigation_summary ? "recorded" : "pending"} · Recovery evidence {incident.recovery_summary ? "recorded" : "pending"}</p>
            <DocumentRecordTabButton name="scope">View response and recovery</DocumentRecordTabButton>
          </Panel>
          <Panel title="Verification &amp; closure">
            <p>Independent verification · {verification}</p>
            <p>Closure approval · {closure}</p>
            <DocumentRecordTabButton name="approval">View controlled decisions</DocumentRecordTabButton>
          </Panel>
          <Panel title="Evidence &amp; linked records">
            <p>{files.length} evidence {files.length === 1 ? "file" : "files"} · {documents.length} linked {documents.length === 1 ? "document" : "documents"} in view</p>
            <DocumentRecordTabButton name="documents">View evidence and linked records</DocumentRecordTabButton>
          </Panel>
        </div>
        <Panel title="Incident summary"><p className={s.recordProse}>{incident.description || "No incident description recorded."}</p></Panel>
      </DocumentRecordPanel>
      <DocumentRecordPanel name="details">
        <Panel title={<span className={shared.detailsHeading}><span><RecordIcon name="overview"/></span>Incident Details</span>}>
          <div className={shared.detailsGrid}>
            <FactGroup title="Incident context" entries={[
              ...overview, ["Awareness", dateTime(incident.awareness_at)], ["Affected organisation or customer", incident.affected_organization],
              ["Affected service", incident.affected_service], ["Affected data or records", incident.affected_data],
              ["Observed event and circumstances", incident.description], ["Immediate impact", incident.immediate_impact], ["Continuing risk", incident.continuing_risk],
            ]}/>
            <FactGroup title="Accountable roles" entries={[
              ["Incident lead", findPerson(incident.incident_lead_person_id)], ["Technical lead", findPerson(incident.technical_lead_person_id)],
              ["Privacy lead", findPerson(incident.privacy_lead_person_id)], ["Communications lead", findPerson(incident.communications_lead_person_id)],
              ["Independent verifier", findPerson(incident.verifier_person_id)], ["Closure approver", findPerson(incident.closure_approved_by_person_id)],
            ]}/>
          </div>
        </Panel>
        <Panel title="Privacy &amp; notifications"><Facts detailed entries={[
          ["Personal data involved", decision(incident.personal_data_involved)], ["ICO notification required", decision(incident.ico_notification_required)],
          ["ICO notified", dateTime(incident.ico_notified_at)], ["Affected people notification required", decision(incident.affected_people_notification_required)],
          ["Affected people notified", dateTime(incident.affected_people_notified_at)], ["NCSC reported", dateTime(incident.ncsc_reported_at)],
          ["Notification decision and rationale", incident.notification_assessment],
        ]}/></Panel>
      </DocumentRecordPanel>
      <DocumentRecordPanel name="scope">
        <Panel title={<span className={shared.iconTitle}><RecordIcon name="scope"/>Investigation &amp; Recovery</span>}>
          <div className={shared.detailsGrid}>
            <FactGroup title="Containment & investigation" entries={[
              ["Containment", incident.containment_summary], ["Investigation", incident.investigation_summary], ["Root cause and extent", incident.root_cause_summary],
            ]}/>
            <FactGroup title="Recovery & lessons" entries={[
              ["Recovery target", recoveryTarget], ["Recovery and verification evidence", incident.recovery_summary], ["Lessons learned", incident.lessons_learned],
            ]}/>
          </div>
        </Panel>
      </DocumentRecordPanel>
      <DocumentRecordPanel name="approval">
        <Panel title={<span className={shared.iconTitle}><RecordIcon name="approval"/>Verification &amp; Closure</span>}>
          <div className={shared.detailsGrid}>
            <FactGroup title="Independent verification" entries={[
              ["Result", verification], ["Verified by", incident.verified_at && findActor(incident.verified_by_user_id)],
              ["Recorded", dateTime(incident.verified_at)], ["Evidence and conclusion", incident.verification_summary],
            ]}/>
            <FactGroup title="Closure approval" entries={[
              ["Decision", closure], ["Approved by", incident.closure_approved_at && findActor(incident.closure_approved_by_user_id)],
              ["Approval recorded", dateTime(incident.closure_approved_at)], ["Approval rationale", incident.closure_approval_comment],
              ["Incident closed", dateTime(incident.closed_at)],
            ]}/>
          </div>
          {canEdit && <p><DocumentRecordTabButton name="clipboard">Open incident workflow</DocumentRecordTabButton></p>}
        </Panel>
      </DocumentRecordPanel>
      <DocumentRecordPanel name="documents">
        <Panel title={<span className={shared.iconTitle}><RecordIcon name="documents"/>Evidence &amp; Linked Records</span>}>
          <div className={shared.documentsGrid}>
            <div>
              <h3>Recorded evidence</h3>
              {files.length ? <ul className={s.recordDecisions}>{files.map(file => <li key={file.id}>
                <strong className={shared.iconTitle}><RecordIcon name="book"/>{file.original_file_name}</strong>
                <p>{incidentLabel(file.evidence_type)} · {Math.ceil(file.file_size_bytes / 1024)} KB · Uploaded {dateTime(file.created_at)}</p>
                {file.description && <p className={s.recordProse}>{file.description}</p>}
                <a className={s.recordButton} href={href + "/evidence/" + file.id}><RecordIcon name="download"/>Download evidence</a>
              </li>)}</ul> : <p>No evidence files recorded.</p>}
            </div>
            <div>
              <h3>Linked assurance records</h3>
              <Facts entries={linkedRecords.map(([label, record]) => [label, record || "No linked record available"])}/>
              <h3>Controlled documents</h3>
              {documents.length ? <ul className={s.recordDecisions}>{documents.map(document => <li key={document.id}>
                <Link href={"/portal/documents/" + document.id}>{document.document_number} · {document.title}</Link>
                {document.revision && <small>Revision {document.revision}</small>}
              </li>)}</ul> : <p>No linked documents available.</p>}
            </div>
          </div>
        </Panel>
      </DocumentRecordPanel>
      <DocumentRecordPanel name="history"><SecurityIncidentTimeline events={timeline}/></DocumentRecordPanel>
      {canEdit && <DocumentRecordPanel name="clipboard">
        <ControlledDeviceDrafts userId={user.id} organizationId={organization.id} recordKey={"security-incident:" + id}
          label="Security incident" baseline={{ incident, options, linkedDocumentIds }}>
          <SecurityIncidentForm action={saveSecurityIncident} incident={incident} options={options} linkedDocumentIds={linkedDocumentIds}/>
        </ControlledDeviceDrafts>
      </DocumentRecordPanel>}
    </DocumentRecordTabs>
  </div></main>;
}
