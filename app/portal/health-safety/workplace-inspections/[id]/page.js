import WorkplaceInspectionAdministration from "../../../../../components/WorkplaceInspectionAdministration";
import { resolveInspectionAccess } from "../../../../../lib/workplace-inspection-access";
import { canStartInspection, canEditInspectionFieldwork, inspectionStageTitle } from "../../../../../lib/workplace-inspection-policy.mjs";
// VERIFIED_WPI_PAGE_DRAFT_20261021: explicit conditions and unique draft keys.
import ControlledDeviceDrafts from "../../../../../components/ControlledDeviceDrafts";
import Link from "next/link";
import { notFound } from "next/navigation";
import WorkplaceInspectionFieldwork from "../../../../../components/WorkplaceInspectionFieldwork";
import WorkplaceInspectionFindingsPanel from "../../../../../components/WorkplaceInspectionFindingsPanel";
import WorkplaceInspectionActionEditor from "../../../../../components/WorkplaceInspectionActionEditor";
import WorkplaceInspectionControlWorkflow from "../../../../../components/WorkplaceInspectionControlWorkflow";
import { requireOrganizationAccess } from "../../../../../lib/organization-access";
import { requirePlanAccess } from "../../../../../lib/plan-access";
import { createAdminClient } from "../../../../../lib/supabase/admin";
import { startInspection, updateInspectionDetails, updateInspectionAction, completeInspectionAction, reviewInspection, verifyInspectionAction, createInspectionAction, createInspectionFinding, saveInspectionFieldwork, submitInspectionForReview } from "./actions";
import "../workplace-inspections.css";
export const dynamic = "force-dynamic";
const ROOT = "/portal/health-safety/workplace-inspections";
function displayDate(value, withTime = false) {
  if (!value) return "Not recorded";
  return new Intl.DateTimeFormat("en-GB", {
    "day": "2-digit",
    "month": "short",
    "year": "numeric",
    ...(() => {
      if (withTime) {
        return {
          "hour": "2-digit",
          "minute": "2-digit"
        };
      }
      return {};
    })()
  }).format(new Date(value));
}
function personLabel(person) {
  return [person?.first_name, person?.last_name].filter(Boolean).join(" ") || person?.email || "Company User unavailable";
}
export default async function WorkplaceInspectionRecordPage({
  params
}) {
  const route = await params;
  const inspectionId = route.id;
  const baseAccess = await requireOrganizationAccess("risk_management", "view", ROOT + "/" + inspectionId);
  await requirePlanAccess(baseAccess.user, "professional", "Health and Safety");
  const admin = createAdminClient();
  const access = await resolveInspectionAccess(admin,baseAccess);
  const organizationId = access.organization.id;
  const [inspectionResult, responsesResult, findingsResult, actionsResult, evidenceResult, peopleResult, historyResult] = await Promise.all([admin.from("hs_workplace_inspections").select("*").eq("id", inspectionId).eq("organization_id", organizationId).maybeSingle(), admin.from("hs_workplace_inspection_responses").select("*").eq("inspection_id", inspectionId).eq("organization_id", organizationId).order("display_order"), admin.from("hs_workplace_inspection_findings").select("*").eq("inspection_id", inspectionId).eq("organization_id", organizationId).order("created_at"), admin.from("hs_workplace_inspection_actions").select("*").eq("inspection_id", inspectionId).eq("organization_id", organizationId).order("target_date"), admin.from("hs_workplace_inspection_evidence").select("id,response_id,finding_id,action_id,evidence_type,title,original_file_name,external_url,created_at").eq("inspection_id", inspectionId).eq("organization_id", organizationId).order("created_at", {
    "ascending": false
  }), admin.from("organization_people").select("id,user_id,first_name,last_name,email,position,account_status").eq("organization_id", organizationId), admin.from("hs_workplace_inspection_history").select("id,event_type,actor_user_id,reason,before_values,after_values,created_at").eq("inspection_id",inspectionId).eq("organization_id",organizationId).order("created_at",{ascending:false}).limit(30)]);
  if (inspectionResult.error) throw new Error(inspectionResult.error.message);
  if (!inspectionResult.data) notFound();
  for (const result of [responsesResult, findingsResult, actionsResult, evidenceResult, peopleResult, historyResult]) {
    if (result.error) throw new Error(result.error.message);
  }
  const inspection = inspectionResult.data;
  const responses = responsesResult.data || [];
  const findings = findingsResult.data || [];
  const actions = actionsResult.data || [];
  const evidence = evidenceResult.data || [];
  const people = (peopleResult.data || []).map(person => ({
    ...person,
    "label": personLabel(person)
  }));
  const peopleById = new Map(people.map(person => [person.id, person]));
  const management = access.isOwner || access.isCompanyAdministrator || ["review", "approve", "admin", "owner"].includes(access.level);
  const assignedInspector = access.person?.id === inspection.lead_inspector_person_id;
  const lockedStatus = ["awaiting_review", "actions_open", "awaiting_verification", "completed", "cancelled"].includes(inspection.status);
  const readOnly = !canEditInspectionFieldwork(access,inspection);
  const stageTitle=inspectionStageTitle(inspection.status);
  const assessed = responses.filter(item => item.response !== "not_assessed").length;
  const failed = responses.filter(item => item.response === "no").length;
  const openActions = actions.filter(item => !["closed", "cancelled"].includes(item.status));
  return <ControlledDeviceDrafts userId={access.user.id} organizationId={organizationId} recordKey={'inspection:' + inspection.id} label="Workplace inspection" baseline={{
    "inspection": inspection,
    "responses": responses,
    "findings": findings,
    "actions": actions,
    "evidence": evidence
  }}><main id="inspection-offline-workspace" className="wpiPage"><div className="wpiShell">
    <header className="wpiTop">
      <div><small>{inspection.inspection_reference} · {inspection.status.replaceAll("_", " ").toUpperCase()}</small><h1>{inspection.title}</h1><p>{inspection.administration_location_label}{(() => {
                if (inspection.area_department) {
                  return " · " + inspection.area_department;
                }
                return "";
              })()}</p></div>
      <div className="wpiButtons"><a className="wpiButton" href="#inspection-review-actions">Review and actions</a><Link className="wpiButton" href={ROOT}>← Register</Link>{(() => {
              if (inspection.programme_id) {
                return <Link className="wpiButton" href={ROOT + "/programmes/" + inspection.programme_id}>Programme</Link>;
              }
              return null;
            })()}<Link className="wpiButton" href={ROOT + "/" + inspection.id + "/evidence"}>Evidence</Link></div>
    </header>

    <section className="wpiHero"><div><h2>{stageTitle}</h2><p>{inspection.planning_basis || "Complete each applicable question and record objective evidence."}</p></div><strong>{inspection.planning_risk_score}/100</strong></section>

    <section className="wpiMetrics">
      <div className="wpiMetric"><span>Planned fieldwork</span><strong>{displayDate(inspection.planned_start_at, true)}</strong><small>{(() => {
                if (inspection.planned_end_at) {
                  return "Ends " + displayDate(inspection.planned_end_at, true);
                }
                return "End time not set";
              })()}</small></div>
      <div className="wpiMetric"><span>Checklist progress</span><strong>{assessed}/{responses.length}</strong><small>{(() => {
                if (responses.length) {
                  return Math.round(assessed / responses.length * 100);
                }
                return 0;
              })()}% assessed</small></div>
      <div className="wpiMetric"><span>No responses</span><strong className={(() => {
              if (failed) {
                return "red";
              }
              return "green";
            })()}>{failed}</strong><small>Finding decision required</small></div>
      <div className="wpiMetric"><span>Findings</span><strong>{findings.length}</strong><small>{findings.filter(item => item.priority === "critical").length} critical</small></div>
      <div className="wpiMetric"><span>Open actions</span><strong>{openActions.length}</strong><small>{actions.filter(item => item.status === "awaiting_verification").length} awaiting verification</small></div>
      <div className="wpiMetric"><span>Evidence records</span><strong>{evidence.length}</strong><small>Files, links and observations</small></div>
    </section>

    <section className="wpiPanel"><h2>Inspection accountability</h2><p className="wpiLead">The assigned inspector conducts fieldwork; the reviewer remains independent.</p><div className="wpiFormGrid three">
      <div className="wpiGuidance"><strong>Lead inspector</strong><p>{personLabel(peopleById.get(inspection.lead_inspector_person_id))}</p></div>
      <div className="wpiGuidance"><strong>Accountable owner</strong><p>{personLabel(peopleById.get(inspection.accountable_person_id))}</p></div>
      <div className="wpiGuidance"><strong>Independent reviewer</strong><p>{personLabel(peopleById.get(inspection.reviewer_person_id))}</p></div>
    </div>{(() => {
            if (readOnly && !lockedStatus) {
              return <div className="wpiMessage error"><strong>View-only inspection</strong><span>Fieldwork can be completed only by the assigned lead inspector after selecting Start inspection. Administrative access does not complete work on another person’s behalf.</span></div>;
            }
            return null;
          })()}</section>

    

    <WorkplaceInspectionAdministration inspection={inspection} people={people} canAdminister={access.canAdministerInspection} canStart={canStartInspection(access,inspection)} startAction={startInspection} updateAction={updateInspectionDetails} stageTitle={stageTitle} leadName={personLabel(peopleById.get(inspection.lead_inspector_person_id))}/>
    <section id="inspection-review-actions" aria-label="Inspection review and action closure" style={{
          "marginTop": 20,
          "scrollMarginTop": 24
        }}>
      <WorkplaceInspectionActionEditor inspection={inspection} actions={actions} people={people} action={updateInspectionAction} canEdit={management || Boolean(access.person?.id && [inspection.lead_inspector_person_id, inspection.accountable_person_id].includes(access.person.id))} />
      <WorkplaceInspectionControlWorkflow inspection={inspection} actions={actions} currentPersonId={access.person?.id || null} reviewAction={reviewInspection} completeAction={completeInspectionAction} verifyAction={verifyInspectionAction} />
    </section>

    <section style={{
          "marginTop": 14
        }}><WorkplaceInspectionFieldwork action={saveInspectionFieldwork} inspection={inspection} responses={responses} readOnly={readOnly} /></section>

    <section style={{
          "marginTop": 14
        }}><WorkplaceInspectionFindingsPanel inspectionId={inspection.id} responses={responses} findings={findings} actions={actions} people={people.filter(person => person.account_status === "active")} createFindingAction={createInspectionFinding} createActionAction={createInspectionAction} submitAction={submitInspectionForReview} readOnly={readOnly} /></section>

    <section className="wpiPanel" style={{
          "marginTop": 14
        }}><div className="wpiSectionHead"><div><small>EVIDENCE</small><h2>Recent supporting evidence</h2><p>Photographs, records, measurements, interviews, documents and secure external links.</p></div><Link className="wpiButton" href={ROOT + "/" + inspection.id + "/evidence"}>Manage evidence →</Link></div>{(() => {
            if (evidence.length) {
              return <div className="wpiList">{evidence.slice(0, 8).map(item => <div className="wpiRow" key={item.id}><div><strong>{item.title}</strong><small>{item.evidence_type.replaceAll("_", " ")} · {item.original_file_name || item.external_url || "Controlled record"}</small></div><div className="wpiMeta"><strong>{displayDate(item.created_at, true)}</strong><small>Added</small></div></div>)}</div>;
            }
            return <div className="wpiEmpty">No supporting evidence has yet been added.</div>;
          })()}</section>
    <section className="wpiPanel" style={{marginTop:14}}><h2>Inspection history</h2><p className="wpiLead">Latest 30 scheduling, appointment, status and fieldwork events. History starts when the scheduling upgrade is applied.</p>{(historyResult.data || []).length ? <div className="wpiList">{historyResult.data.map(event=><details className="wpiGuidance" key={event.id}><summary style={{cursor:'pointer'}}><strong>{event.event_type.replaceAll('_',' ')}</strong> · {displayDate(event.created_at,true)} · {personLabel(people.find(p=>p.user_id===event.actor_user_id))}</summary>{event.reason ? <p>{event.reason}</p> : null}<div className="wpiFormGrid">{['accountable_person_id','lead_inspector_person_id','reviewer_person_id','planned_start_at','planned_end_at','title','scope','status'].filter(key=>event.after_values && event.before_values?.[key] !== event.after_values[key]).map(key=>{ const label=value=>key.endsWith('_person_id') ? personLabel(peopleById.get(value)) : value || 'Not recorded';return <div key={key}><strong>{key.replaceAll('_',' ')}</strong><p>{label(event.before_values?.[key])} → {label(event.after_values[key])}</p></div>;})}</div></details>)}</div> : <div className="wpiEmpty">No changes have been recorded since this upgrade.</div>}</section>
  </div></main></ControlledDeviceDrafts>;
}
