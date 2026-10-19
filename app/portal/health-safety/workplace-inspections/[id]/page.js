import Link from "next/link";
import { notFound } from "next/navigation";

import WorkplaceInspectionFieldwork from "../../../../../components/WorkplaceInspectionFieldwork";
import WorkplaceInspectionFindingsPanel from "../../../../../components/WorkplaceInspectionFindingsPanel";
import WorkplaceInspectionControlWorkflow from "../../../../../components/WorkplaceInspectionControlWorkflow";
import { requireOrganizationAccess } from "../../../../../lib/organization-access";
import { requirePlanAccess } from "../../../../../lib/plan-access";
import { createAdminClient } from "../../../../../lib/supabase/admin";
import {
  completeInspectionAction,
  reviewInspection,
  verifyInspectionAction,
  createInspectionAction,
  createInspectionFinding,
  saveInspectionFieldwork,
  submitInspectionForReview,
} from "./actions";
import "../workplace-inspections.css";

export const dynamic = "force-dynamic";

const ROOT = "/portal/health-safety/workplace-inspections";

function displayDate(value, withTime = false) {
  if (!value) return "Not recorded";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  }).format(new Date(value));
}

function personLabel(person) {
  return [person?.first_name, person?.last_name].filter(Boolean).join(" ") || person?.email || "Company User unavailable";
}

export default async function WorkplaceInspectionRecordPage({ params }) {
  const route = await params;
  const inspectionId = route.id;
  const access = await requireOrganizationAccess("risk_management", "view", ROOT + "/" + inspectionId);
  await requirePlanAccess(access.user, "professional", "Health and Safety");
  const admin = createAdminClient();
  const organizationId = access.organization.id;

  const [inspectionResult, responsesResult, findingsResult, actionsResult, evidenceResult, peopleResult] = await Promise.all([
    admin.from("hs_workplace_inspections").select("*").eq("id", inspectionId).eq("organization_id", organizationId).maybeSingle(),
    admin.from("hs_workplace_inspection_responses").select("*").eq("inspection_id", inspectionId).eq("organization_id", organizationId).order("display_order"),
    admin.from("hs_workplace_inspection_findings").select("*").eq("inspection_id", inspectionId).eq("organization_id", organizationId).order("created_at"),
    admin.from("hs_workplace_inspection_actions").select("*").eq("inspection_id", inspectionId).eq("organization_id", organizationId).order("target_date"),
    admin.from("hs_workplace_inspection_evidence").select("id,response_id,finding_id,action_id,evidence_type,title,original_file_name,external_url,created_at").eq("inspection_id", inspectionId).eq("organization_id", organizationId).order("created_at", { ascending: false }),
    admin.from("organization_people").select("id,first_name,last_name,email,position,account_status").eq("organization_id", organizationId),
  ]);

  if (inspectionResult.error) throw new Error(inspectionResult.error.message);
  if (!inspectionResult.data) notFound();
  for (const result of [responsesResult, findingsResult, actionsResult, evidenceResult, peopleResult]) {
    if (result.error) throw new Error(result.error.message);
  }

  const inspection = inspectionResult.data;
  const responses = responsesResult.data || [];
  const findings = findingsResult.data || [];
  const actions = actionsResult.data || [];
  const evidence = evidenceResult.data || [];
  const people = (peopleResult.data || []).map((person) => ({ ...person, label: personLabel(person) }));
  const peopleById = new Map(people.map((person) => [person.id, person]));
  const management = access.isOwner || access.isCompanyAdministrator || ["review", "approve", "admin", "owner"].includes(access.level);
  const assignedInspector = access.person?.id === inspection.lead_inspector_person_id;
  const lockedStatus = ["awaiting_review", "actions_open", "awaiting_verification", "completed", "cancelled"].includes(inspection.status);
  const readOnly = lockedStatus || !(management || assignedInspector);
  const assessed = responses.filter((item) => item.response !== "not_assessed").length;
  const failed = responses.filter((item) => item.response === "no").length;
  const openActions = actions.filter((item) => !["closed", "cancelled"].includes(item.status));

  return <main className="wpiPage"><div className="wpiShell">
    <header className="wpiTop">
      <div><small>{inspection.inspection_reference} · {inspection.status.replaceAll("_", " ").toUpperCase()}</small><h1>{inspection.title}</h1><p>{inspection.administration_location_label}{inspection.area_department ? " · " + inspection.area_department : ""}</p></div>
      <div className="wpiButtons"><a className="wpiButton" href="#inspection-review-actions">Review and actions</a><Link className="wpiButton" href={ROOT}>← Register</Link>{inspection.programme_id ? <Link className="wpiButton" href={ROOT + "/programmes/" + inspection.programme_id}>Programme</Link> : null}<Link className="wpiButton" href={ROOT + "/" + inspection.id + "/evidence"}>Evidence</Link></div>
    </header>

    <section className="wpiHero"><div><h2>{readOnly ? "Controlled inspection record" : "Fieldwork in progress"}</h2><p>{inspection.planning_basis || "Complete each applicable question and record objective evidence."}</p></div><strong>{inspection.planning_risk_score}/100</strong></section>

    <section className="wpiMetrics">
      <div className="wpiMetric"><span>Planned fieldwork</span><strong>{displayDate(inspection.planned_start_at, true)}</strong><small>{inspection.planned_end_at ? "Ends " + displayDate(inspection.planned_end_at, true) : "End time not set"}</small></div>
      <div className="wpiMetric"><span>Checklist progress</span><strong>{assessed}/{responses.length}</strong><small>{responses.length ? Math.round(assessed / responses.length * 100) : 0}% assessed</small></div>
      <div className="wpiMetric"><span>No responses</span><strong className={failed ? "red" : "green"}>{failed}</strong><small>Finding decision required</small></div>
      <div className="wpiMetric"><span>Findings</span><strong>{findings.length}</strong><small>{findings.filter((item) => item.priority === "critical").length} critical</small></div>
      <div className="wpiMetric"><span>Open actions</span><strong>{openActions.length}</strong><small>{actions.filter((item) => item.status === "awaiting_verification").length} awaiting verification</small></div>
      <div className="wpiMetric"><span>Evidence records</span><strong>{evidence.length}</strong><small>Files, links and observations</small></div>
    </section>

    <section className="wpiPanel"><h2>Inspection accountability</h2><p className="wpiLead">The assigned inspector conducts fieldwork; the reviewer remains independent.</p><div className="wpiFormGrid three">
      <div className="wpiGuidance"><strong>Lead inspector</strong><p>{personLabel(peopleById.get(inspection.lead_inspector_person_id))}</p></div>
      <div className="wpiGuidance"><strong>Accountable owner</strong><p>{personLabel(peopleById.get(inspection.accountable_person_id))}</p></div>
      <div className="wpiGuidance"><strong>Independent reviewer</strong><p>{personLabel(peopleById.get(inspection.reviewer_person_id))}</p></div>
    </div>{readOnly && !lockedStatus ? <div className="wpiMessage error"><strong>View-only inspection</strong><span>Only the assigned inspector or authorised management can edit this fieldwork record.</span></div> : null}</section>

    <section id="inspection-review-actions" aria-label="Inspection review and action closure" style={{ marginTop: 20, scrollMarginTop: 24 }}>
      <WorkplaceInspectionControlWorkflow
        inspection={inspection}
        actions={actions}
        currentPersonId={access.person?.id || null}
        reviewAction={reviewInspection}
        completeAction={completeInspectionAction}
        verifyAction={verifyInspectionAction}
      />
    </section>

    <section style={{ marginTop: 14 }}><WorkplaceInspectionFieldwork action={saveInspectionFieldwork} inspection={inspection} responses={responses} readOnly={readOnly} /></section>

    <section style={{ marginTop: 14 }}><WorkplaceInspectionFindingsPanel
      inspectionId={inspection.id}
      responses={responses}
      findings={findings}
      actions={actions}
      people={people.filter((person) => person.account_status === "active")}
      createFindingAction={createInspectionFinding}
      createActionAction={createInspectionAction}
      submitAction={submitInspectionForReview}
      readOnly={readOnly}
    /></section>

    <section className="wpiPanel" style={{ marginTop: 14 }}><div className="wpiSectionHead"><div><small>EVIDENCE</small><h2>Recent supporting evidence</h2><p>Photographs, records, measurements, interviews, documents and secure external links.</p></div><Link className="wpiButton" href={ROOT + "/" + inspection.id + "/evidence"}>Manage evidence →</Link></div>{evidence.length ? <div className="wpiList">{evidence.slice(0, 8).map((item) => <div className="wpiRow" key={item.id}><div><strong>{item.title}</strong><small>{item.evidence_type.replaceAll("_", " ")} · {item.original_file_name || item.external_url || "Controlled record"}</small></div><div className="wpiMeta"><strong>{displayDate(item.created_at, true)}</strong><small>Added</small></div></div>)}</div> : <div className="wpiEmpty">No supporting evidence has yet been added.</div>}</section>
  </div></main>;
}
