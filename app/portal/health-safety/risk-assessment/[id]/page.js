// VERIFIED_RA_EDIT_DRAFT_20261021: explicit conditions and unique draft keys.
import ControlledDeviceDrafts from "../../../../../components/ControlledDeviceDrafts";
import { canonical } from '../../../../../lib/ppe-engine.mjs';
import { readHazardPPE } from '../../../../../lib/hazard-ppe';
import { loadAssessmentZones, saveAssessmentScope, refreshAssessmentZonePages } from '../../../../../lib/assessment-zones';
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "../../../../../lib/supabase/server";
import { createAdminClient } from "../../../../../lib/supabase/admin";
import { requireOrganizationAccess } from "../../../../../lib/organization-access";
import HealthSafetyRiskAssessmentEditor from "../../../../../components/HealthSafetyRiskAssessmentEditor";
import { DocumentRecordPanel, DocumentRecordTabButton, DocumentRecordTabs, RecordIcon } from "../../../../../components/DocumentRecordTabs";
import HealthSafetyDashboardHeatMap from "../../../../../components/HealthSafetyDashboardHeatMap";
import { residualBand } from "../../../../../lib/health-safety-dashboard.mjs";
import RecordDistribution from "./RecordDistribution";
import s from "../../../documents/documents.module.css";
import styles from "./risk-record.module.css";

const riskTabs = [
  ["overview", "Overview"], ["details", "Assessment Details"], ["scope", "Hazards & Controls"],
  ["approval", "Review & Approval"], ["documents", "Documents & Applicability"],
  ["distribution", "Distribution"], ["history", "Revision History"],
];

export const metadata = {
  "title": "Risk Assessment Workspace | RPG Excellence"
};
export const dynamic = "force-dynamic";
const formatDate = value => (() => {
  if (value) {
    return new Intl.DateTimeFormat("en-GB", {
      "day": "2-digit",
      "month": "short",
      "year": "numeric"
    }).format(new Date(value));
  }
  return "—";
})();
const label = value => String(value || "draft").replaceAll("_", " ").replace(/\b\w/g, letter => letter.toUpperCase());
const lockedStatuses = ["in_review", "approved", "communicated", "superseded", "archived"];
const revisionableStatuses = ["approved", "communicated"];
async function createRevision(formData) {
  "use server";

  const access = await requireOrganizationAccess("risk_management", "contribute", "/portal/health-safety/risk-assessment");
  const sourceId = String(formData.get("assessment_id") || "");
  const admin = createAdminClient();
  const {
    data: source,
    error: sourceError
  } = await admin.from("hs_risk_assessments").select("*").eq("id", sourceId).eq("organization_id", access.organization.id).single();
  if (sourceError || !source) throw new Error("The controlled assessment could not be accessed.");
  if (!revisionableStatuses.includes(source.status)) throw new Error("Only an approved or communicated assessment can create a new revision.");
  const sourceScope = await loadAssessmentZones(admin, access.organization.id, sourceId);
  const {
    data: revision,
    error: revisionError
  } = await admin.from("hs_risk_assessments").insert({
    "owner_id": source.owner_id,
    "organization_id": source.organization_id,
    "title": source.title,
    "version": Number(source.version || 1) + 1,
    "status": "draft",
    "assessment_type": source.assessment_type,
    "site_location": source.site_location,
    "administration_location_id": source.administration_location_id,
    "area_department": source.area_department,
    "section_lab": source.section_lab,
    "project_number": source.project_number,
    "task_description": source.task_description,
    "assessor_name": source.assessor_name,
    "assessor_person_id": source.assessor_person_id,
    "assessor_user_id": access.user.id,
    "assessor_competence_basis": source.assessor_competence_basis,
    "assessment_date": new Date().toISOString().slice(0, 10),
    "review_date": null,
    "review_frequency_months": null,
    "coshh_msds_reference": source.coshh_msds_reference,
    "coshh_document_path": source.coshh_document_path,
    "coshh_document_name": source.coshh_document_name,
    "coshh_document_mime_type": source.coshh_document_mime_type,
    "coshh_document_size_bytes": source.coshh_document_size_bytes,
    "safe_system_reference": source.safe_system_reference,
    "ssow_document_path": source.ssow_document_path,
    "ssow_document_name": source.ssow_document_name,
    "ssow_document_mime_type": source.ssow_document_mime_type,
    "ssow_document_size_bytes": source.ssow_document_size_bytes,
    "permit_required": source.permit_required,
    "linked_permit_id": source.linked_permit_id,
    "permit_reference": source.permit_reference,
    "permit_document_path": source.permit_document_path,
    "permit_document_name": source.permit_document_name,
    "permit_document_mime_type": source.permit_document_mime_type,
    "permit_document_size_bytes": source.permit_document_size_bytes,
    "associated_documents": source.associated_documents,
    "persons_at_risk": source.persons_at_risk,
    "vulnerable_persons_considered": source.vulnerable_persons_considered,
    "consultation_summary": source.consultation_summary,
    "emergency_arrangements": source.emergency_arrangements
  }).select("id,updated_at").single();
  if (revisionError) throw new Error(revisionError.message);

  // Copy applicability as draft links; approval and sign review are not copied.
  try {
    await saveAssessmentScope(admin, access, {
      "id": revision.id,
      "values": {},
      "zoneIds": sourceScope.selectedZoneIds.filter(id => sourceScope.zones.some(zone => zone.id === id && zone.status !== 'archived')),
      "originalZoneIds": [],
      "expectedUpdatedAt": revision.updated_at
    });
  } catch (error) {
    await admin.from('hs_risk_assessments').delete().eq('id', revision.id).eq('organization_id', access.organization.id);
    throw error;
  }
  const {
    data: sourceHazards,
    error: hazardsError
  } = await admin.from("hs_risk_hazards").select("*").eq("assessment_id", sourceId).eq("organization_id", access.organization.id).order("display_order");
  if (hazardsError) throw new Error(hazardsError.message);
  const hazardIdMap = new Map();
  for (const hazard of sourceHazards || []) {
    const {
      data: copied,
      error
    } = await admin.from("hs_risk_hazards").insert({
      "assessment_id": revision.id,
      "owner_id": source.owner_id,
      "organization_id": source.organization_id,
      "display_order": hazard.display_order,
      "hazard_category": hazard.hazard_category,
      "hazard_type": hazard.hazard_type,
      "hazard_description": hazard.hazard_description,
      "people_exposed": hazard.people_exposed,
      "harm_description": hazard.harm_description,
      "existing_controls": hazard.existing_controls,
      "current_severity": hazard.current_severity,
      "current_likelihood": hazard.current_likelihood,
      "additional_controls": hazard.additional_controls,
      "control_hierarchy": hazard.control_hierarchy,
      "ppe_requirements": hazard.ppe_requirements || [],
      "residual_severity": hazard.residual_severity,
      "residual_likelihood": hazard.residual_likelihood,
      "risk_decision": hazard.risk_decision,
      "acceptance_rationale": hazard.acceptance_rationale,
      "acceptance_authority": hazard.acceptance_authority
    }).select("id").single();
    if (error) throw new Error(error.message);
    hazardIdMap.set(hazard.id, copied.id);
  }
  const {
    data: sourceActions,
    error: actionsError
  } = await admin.from("hs_risk_actions").select("*").eq("assessment_id", sourceId).eq("organization_id", access.organization.id);
  if (actionsError) throw new Error(actionsError.message);
  if (sourceActions?.length) {
    const {
      error
    } = await admin.from("hs_risk_actions").insert(sourceActions.map(action => ({
      "assessment_id": revision.id,
      "hazard_id": hazardIdMap.get(action.hazard_id) || null,
      "owner_id": source.owner_id,
      "organization_id": source.organization_id,
      "action_reference": action.action_reference,
      "action_required": action.action_required,
      "responsible_person_id": action.responsible_person_id,
      "responsible_name": action.responsible_name,
      "responsible_email": action.responsible_email,
      "target_date": action.target_date,
      "priority": action.priority,
      "interim_controls": action.interim_controls,
      "status": "open"
    })));
    if (error) throw new Error(error.message);
  }
  const {
    error: supersedeError
  } = await admin.from("hs_risk_assessments").update({
    "status": "superseded"
  }).eq("id", sourceId).eq("organization_id", access.organization.id);
  if (supersedeError) throw new Error(supersedeError.message);
  await admin.from("hs_risk_events").insert({
    "assessment_id": revision.id,
    "owner_id": source.owner_id,
    "organization_id": source.organization_id,
    "actor_id": access.user.id,
    "event_type": "revision_created",
    "event_summary": "Version " + (Number(source.version || 1) + 1) + " created from controlled assessment",
    "event_data": {
      "source_assessment_id": sourceId,
      "source_version": source.version || 1
    }
  });
  refreshAssessmentZonePages(source.administration_location_id, revision.id);
  redirect("/portal/health-safety/risk-assessment/" + revision.id);
}
async function addHazard(formData) {
  "use server";

  try {
    const access = await requireOrganizationAccess("risk_management", "contribute", "/portal/health-safety/risk-assessment");
    const {
      user,
      organization
    } = access;
    const supabase = createAdminClient();
    const assessmentId = String(formData.get("assessment_id") || "");
    const {
      data: assessment,
      error: assessmentError
    } = await supabase.from("hs_risk_assessments").select("id,owner_id,organization_id,status").eq("id", assessmentId).eq("organization_id", organization.id).single();
    if (assessmentError || !assessment) throw new Error("Risk assessment could not be accessed.");
    if (["in_review", "approved", "communicated", "superseded", "archived"].includes(assessment.status)) throw new Error("This controlled version is locked. Create or reopen a review version before changing hazards.");
    const text = name => String(formData.get(name) || "").trim();
    const number = name => Number(formData.get(name));
    const currentSeverity = number("current_severity");
    const currentLikelihood = number("current_likelihood");
    const residualSeverity = number("residual_severity");
    const residualLikelihood = number("residual_likelihood");
    const currentScore = currentSeverity * currentLikelihood;
    const residualScore = residualSeverity * residualLikelihood;
    const decision = text("risk_decision");
    const rationale = text("acceptance_rationale");
    const authority = text("acceptance_authority");
    const controls = formData.getAll("control_hierarchy").map(String);
    const ppeRequirements = await readHazardPPE(supabase, organization.id, assessmentId, formData, controls);
    const exposedGroups = formData.getAll("people_exposed").map(String);
    const otherExposed = text("people_exposed_other");
    const actionRequired = text("action_required");
    const responsiblePersonId = text("responsible_person_id");
    if (![currentSeverity, currentLikelihood, residualSeverity, residualLikelihood].every(value => value >= 1 && value <= 5)) throw new Error("Complete all four risk-score selections.");
    if (!exposedGroups.length) throw new Error("Select at least one group who may be harmed.");
    if (exposedGroups.includes("Others") && !otherExposed) throw new Error("Describe the other people who may be harmed.");
    if (residualScore > currentScore) throw new Error("Residual risk cannot exceed initial risk. Reassess the scores before saving.");
    if (!controls.length && text("additional_controls")) throw new Error("Select the hierarchy level applied to the additional controls.");
    if (decision === "accept" && (!rationale || !authority)) throw new Error("Formal risk acceptance requires a rationale and named authority.");
    if (residualScore >= 10 && (!decision || !authority || !actionRequired)) throw new Error("Elevated residual risk requires a controlled decision, authority and accountable action.");
    if (actionRequired && (!responsiblePersonId || !text("target_date"))) throw new Error("Every controlled action requires a responsible company user and target date.");
    let responsiblePerson = null;
    if (actionRequired) {
      const {
        data,
        error
      } = await supabase.from("organization_people").select("id,first_name,last_name,email").eq("id", responsiblePersonId).eq("organization_id", organization.id).eq("account_status", "active").maybeSingle();
      if (error || !data) throw new Error("Select an active responsible person from the Company User list.");
      responsiblePerson = data;
    }
    const {
      count,
      error: countError
    } = await supabase.from("hs_risk_hazards").select("id", {
      "count": "exact",
      "head": true
    }).eq("assessment_id", assessmentId);
    if (countError) throw new Error(countError.message);
    const {
      data: hazard,
      error: hazardError
    } = await supabase.from("hs_risk_hazards").insert({
      "assessment_id": assessmentId,
      "owner_id": assessment.owner_id,
      "organization_id": assessment.organization_id,
      "display_order": (count || 0) + 1,
      "hazard_category": text("hazard_category"),
      "hazard_type": text("hazard_type") || null,
      "hazard_description": text("hazard_description"),
      "people_exposed": [...exposedGroups.filter(item => item !== "Others"), ...(() => {
        if (exposedGroups.includes("Others")) {
          return ["Other: " + otherExposed + ""];
        }
        return [];
      })()].join(", "),
      "harm_description": text("harm_description"),
      "existing_controls": text("existing_controls"),
      "current_severity": currentSeverity,
      "current_likelihood": currentLikelihood,
      "additional_controls": text("additional_controls"),
      "control_hierarchy": controls,
      "ppe_requirements": ppeRequirements,
      "residual_severity": residualSeverity,
      "residual_likelihood": residualLikelihood,
      "risk_decision": decision,
      "acceptance_rationale": rationale || null,
      "acceptance_authority": authority || null,
      "accepted_at": (() => {
        if (decision === "accept") {
          return new Date().toISOString();
        }
        return null;
      })()
    }).select("id").single();
    if (hazardError) throw new Error(hazardError.message);
    if (actionRequired) {
      const {
        count: actionCount
      } = await supabase.from("hs_risk_actions").select("id", {
        "count": "exact",
        "head": true
      }).eq("assessment_id", assessmentId);
      const reference = "ACT-" + String((actionCount || 0) + 1).padStart(3, "0");
      const {
        error: actionError
      } = await supabase.from("hs_risk_actions").insert({
        "assessment_id": assessmentId,
        "hazard_id": hazard.id,
        "owner_id": assessment.owner_id,
        "organization_id": assessment.organization_id,
        "action_reference": reference,
        "action_required": actionRequired,
        "responsible_person_id": responsiblePerson.id,
        "responsible_name": [responsiblePerson.first_name, responsiblePerson.last_name].filter(Boolean).join(" ") || responsiblePerson.email,
        "responsible_email": responsiblePerson.email || null,
        "target_date": text("target_date"),
        "priority": text("priority") || (() => {
          if (residualScore >= 15) {
            return "critical";
          }
          return (() => {
            if (residualScore >= 10) {
              return "high";
            }
            return "medium";
          })();
        })(),
        "interim_controls": text("additional_controls") || null
      });
      if (actionError) {
        await supabase.from("hs_risk_hazards").delete().eq("id", hazard.id);
        throw new Error(actionError.message);
      }
    }
    await supabase.from("hs_risk_events").insert({
      "assessment_id": assessmentId,
      "owner_id": assessment.owner_id,
      "organization_id": assessment.organization_id,
      "actor_id": user.id,
      "event_type": "hazard_added",
      "event_summary": "Hazard and risk decision recorded",
      "event_data": {
        "hazard_id": hazard.id,
        "current_score": currentScore,
        "residual_score": residualScore
      }
    });
    revalidatePath("/portal/health-safety/risk-assessment/" + assessmentId);
    return {
      "success": true
    };
  } catch (error) {
    if (error.digest) throw error;
    return {
      "error": error.message
    };
  }
}
async function updateHazardPPE(_state, formData) {
  "use server";

  try {
    const access = await requireOrganizationAccess('risk_management', 'contribute', '/portal/health-safety/risk-assessment');
    const admin = createAdminClient(),
      id = String(formData.get('hazard_id') || ''),
      assessmentId = String(formData.get('assessment_id') || '');
    const {
      data: hazard,
      error
    } = await admin.from('hs_risk_hazards').select('id,assessment_id,control_hierarchy,ppe_requirements').eq('id', id).eq('assessment_id', assessmentId).eq('organization_id', access.organization.id).single();
    if (error || !hazard) throw Error('Hazard not found.');
    let expected;
    try {
      expected = JSON.parse(String(formData.get('expected_ppe') || 'null'));
    } catch {
      throw Error('Reload the hazard before editing PPE.');
    }
    if (canonical(expected) !== canonical(hazard.ppe_requirements || [])) throw Error('This hazard PPE changed. Reload before saving.');
    const controls = (hazard.control_hierarchy || []).filter(item => item !== 'PPE');
    if (formData.get('ppe_required') === 'on') controls.push('PPE');
    const ppe = await readHazardPPE(admin, access.organization.id, assessmentId, formData, controls);
    const result = await admin.from('hs_risk_hazards').update({
      "ppe_requirements": ppe,
      "control_hierarchy": controls
    }).eq('id', id).eq('organization_id', access.organization.id).eq('ppe_requirements', JSON.stringify(hazard.ppe_requirements || [])).select('id');
    if (result.error) throw Error(result.error.message);
    if (!result.data?.length) throw Error('This hazard PPE changed. Reload before saving.');
    await admin.from('hs_risk_events').insert({
      "assessment_id": assessmentId,
      "organization_id": access.organization.id,
      "owner_id": access.organization.owner_id,
      "actor_id": access.user.id,
      "event_type": 'ppe_updated',
      "event_summary": 'Hazard PPE requirements updated for controlled review',
      "event_data": {
        "hazard_id": id,
        "ppe_requirements": ppe
      }
    });
    revalidatePath("/portal/health-safety/risk-assessment/" + assessmentId + "");
    revalidatePath("/portal/health-safety/risk-assessment/" + assessmentId + "/review");
    return {
      "success": 'PPE requirements saved. Recheck controls and residual risk before submitting for approval.'
    };
  } catch (error) {
    if (error.digest) throw error;
    return {
      "error": error.message
    };
  }
}
function Facts({ entries }) {
  return <dl className={s.recordFacts}>{entries.map(([name, value]) =>
    <div key={name}><dt>{name}</dt><dd>{value ?? "—"}</dd></div>)}</dl>;
}

function Lifecycle({ assessment }) {
  const states = [
    ["Assessment prepared", assessment.assessment_date, assessment.assessment_date ? "done" : ""],
    ["Submitted for review", assessment.submitted_at, assessment.submitted_at ? "done" : ""],
    ["Approved", assessment.approved_at, assessment.approved_at ? "released" : ""],
    ["Communicated", assessment.communicated_at, assessment.communicated_at ? "done" : ""],
    ["Next review", assessment.review_date, ""],
  ];
  return <section className={s.recordPanel}><h2>Lifecycle &amp; compliance</h2>
    <ul className={s.recordMilestones}>{states.map(([name, value, state]) => <li key={name} data-state={state}>
      <span className={s.recordMilestone} aria-hidden="true">{state === "done" && <RecordIcon name="check"/>}</span>
      <strong>{name}</strong><span>{value ? formatDate(value) : "Not recorded"}</span>
    </li>)}</ul>
  </section>;
}

function Profile({ initial, residual, comparable }) {
  return <section className={s.recordPanel}><h2>Risk profile</h2>
    <div className={styles.profile}>
      {[["Initial risk", initial], ["Residual risk", residual]].map(([name, value]) => <div key={name}>
        <span>{name}</span><strong>{value || "—"}</strong><span>{value ? label(residualBand(value)) : "Unrated"}</span>
      </div>)}
    </div>
    {comparable && initial && residual ? <p><strong>{Math.round(Math.abs(initial - residual) * 100 / initial)}% {residual > initial ? "increase" : "reduction"}</strong> in highest recorded score</p> :
      <p className={s.muted}>Highest recorded score at each stage.</p>}
    <DocumentRecordTabButton name="scope">View hazards and risk matrix</DocumentRecordTabButton>
  </section>;
}

export default async function RiskAssessmentWorkspacePage({ params, searchParams }) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const root = "/portal/health-safety/risk-assessment";
  const href = root + "/" + id;
  const access = await requireOrganizationAccess("risk_management", "view", href);
  const admin = createAdminClient();
  const org = access.organization.id;
  const canContribute = ["contribute", "review", "approve", "admin", "owner"].includes(access.level);
  const [record, hazardsResult, actionsResult, eventsResult, zoneScope] = await Promise.all([
    admin.from("hs_risk_assessments").select("*").eq("organization_id", org).eq("id", id).maybeSingle(),
    admin.from("hs_risk_hazards").select("*").eq("organization_id", org).eq("assessment_id", id).order("display_order"),
    admin.from("hs_risk_actions").select("*").eq("organization_id", org).eq("assessment_id", id).order("target_date"),
    admin.from("hs_risk_events").select("id,event_type,event_summary,event_data,created_at").eq("organization_id", org).eq("assessment_id", id).order("created_at", { ascending: false }),
    loadAssessmentZones(admin, org, id),
  ]);
  for (const result of [record, hazardsResult, actionsResult, eventsResult]) if (result.error) throw result.error;
  const assessment = record.data;
  if (!assessment) notFound();
  const hazards = hazardsResult.data ?? [];
  const actions = actionsResult.data ?? [];
  const events = eventsResult.data ?? [];
  const zones = zoneScope.zones.filter(zone => zoneScope.selectedZoneIds.includes(zone.id));
  const editable = canContribute && !lockedStatuses.includes(assessment.status);
  const { data: people, error: peopleError } = editable
    ? await admin.from("organization_people").select("id,first_name,last_name,email,position").eq("organization_id", org).eq("account_status", "active").order("last_name")
    : { data: [] };
  if (peopleError) throw peopleError;
  const initial = hazards.reduce((highest, hazard) => Math.max(highest, hazard.current_score ?? 0), 0);
  const residual = hazards.reduce((highest, hazard) => Math.max(highest, hazard.residual_score ?? 0), 0);
  const comparable = hazards.length > 0 && hazards.every(hazard => hazard.current_score > 0 && hazard.residual_score > 0);
  const elevated = hazards.filter(hazard => hazard.residual_score >= 10).length;
  const openActions = actions.filter(action => !["effective", "cancelled"].includes(action.status));
  const verifiedActions = actions.filter(action => action.status === "effective" || action.effectiveness_result === "effective_verified");
  const summary = [["Reference", assessment.assessment_reference], ["Type", label(assessment.assessment_type)], ["Version", assessment.version],
    ["Assessor", assessment.assessor_name], ["Assessed", formatDate(assessment.assessment_date)], ["Next review", formatDate(assessment.review_date)]];
  const attachments = await Promise.all([
    ["Permit to work", assessment.permit_reference, assessment.permit_document_path, assessment.permit_document_name],
    ["Safe system of work", assessment.safe_system_reference, assessment.ssow_document_path, assessment.ssow_document_name],
    ["COSHH / Safety data", assessment.coshh_msds_reference, assessment.coshh_document_path, assessment.coshh_document_name],
  ].map(async ([name, reference, path, filename]) => {
    const { data } = path ? await admin.storage.from("hs-risk-assessment-evidence").createSignedUrl(path, 3600) : {};
    return [name, reference, data?.signedUrl, filename];
  }));
  const parentId = events.find(event => event.event_type === "revision_created")?.event_data?.source_assessment_id;
  const { data: previous, error: previousError } = parentId
    ? await admin.from("hs_risk_assessments").select("id,assessment_reference,version").eq("organization_id", org).eq("id", parentId).maybeSingle()
    : { data: null };
  if (previousError) throw previousError;
  const tab = riskTabs.some(([key]) => key === query?.tab) ? query.tab : "overview";
  const layout = <main className={`${s.page} ${s.registerPage} ${s.recordPage}`}><div className={s.shell}>
    <p className={s.recordBreadcrumb}><Link href="/portal/health-safety">Health &amp; Safety</Link> / <Link href={root}>Risk Assessments</Link> / {assessment.assessment_reference}</p>
    <header className={`${s.hubHero} ${s.recordHero}`}>
      <div className={s.recordTitle}><span className={s.recordTitleIcon}><RecordIcon name="overview"/></span>
        <div><small>{assessment.assessment_reference} · VERSION {assessment.version}</small><h1>{assessment.title}</h1>
          <p>{label(assessment.assessment_type)} · {assessment.site_location || assessment.area_department || "Location not set"}</p></div></div>
      <div className={s.recordHeaderActions}>
        <span className={s.recordStatus} data-status={revisionableStatuses.includes(assessment.status) ? "current" : assessment.status}>{label(assessment.status)}</span>
        {revisionableStatuses.includes(assessment.status) && <a className={s.recordButton} href={href + "/report"}><RecordIcon name="download"/>Controlled PDF</a>}
        <Link className={s.recordButton} href={href + "/review"}>Review &amp; approval</Link>
        {editable && <Link className={s.recordPrimary} href={href + "/edit"}>Edit assessment details</Link>}
        {canContribute && revisionableStatuses.includes(assessment.status) && <form id="create-revision" action={createRevision}>
          <input type="hidden" name="assessment_id" value={id}/><button className={s.recordButton} type="submit">Create new revision</button>
        </form>}
      </div>
    </header>
    <DocumentRecordTabs key={`${tab}:${assessment.updated_at}:${query?.distribution ?? ""}`} initial={tab} tabs={riskTabs} sectionLabel="Risk assessment sections">
      <DocumentRecordPanel name="overview">
        <div className={s.recordOverview}>
          <Profile initial={initial} residual={residual} comparable={comparable}/>
          <section className={s.recordPanel}><h2>Assessment details</h2><Facts entries={summary}/></section>
          <Lifecycle assessment={assessment}/>
        </div>
        <div className={s.recordOverview}>
          <section className={s.recordPanel}><h2>Hazards &amp; controls</h2><p>{hazards.length} hazards · {elevated} elevated residual risks</p>
            <DocumentRecordTabButton name="scope">Open hazard details</DocumentRecordTabButton></section>
          <section className={s.recordPanel}><h2>Actions &amp; effectiveness</h2><p>{openActions.length} open actions · {verifiedActions.length} verified effective</p>
            <DocumentRecordTabButton name="scope">View actions and verification</DocumentRecordTabButton></section>
          <section className={s.recordPanel}><h2>Applicability</h2><p>{assessment.site_location || "Location not set"}</p>
            <p>{zones.length ? zones.length + " linked workplace zones" : "No individual zones linked"}</p>
            <DocumentRecordTabButton name="documents">View workplace scope</DocumentRecordTabButton></section>
        </div>
        <section className={s.recordPanel}><h2>Purpose and scope</h2><p className={s.recordProse}>{assessment.task_description || "No scope recorded."}</p></section>
      </DocumentRecordPanel>
      <DocumentRecordPanel name="details">
        <section className={s.recordPanel}><h2>Assessment details</h2><Facts entries={[...summary,
          ["Area / department", assessment.area_department], ["Section / lab", assessment.section_lab],
          ["People at risk", assessment.persons_at_risk?.join(", ") || null], ["Consultation", assessment.consultation_summary]
        ]}/></section>
      </DocumentRecordPanel>
      <DocumentRecordPanel name="scope">
        <section className={s.recordPanel}><h2>Hazards and risk decisions</h2>
          <HealthSafetyRiskAssessmentEditor assessmentId={id} hazards={hazards} companyPeople={people ?? []}
            addHazardAction={addHazard} updatePPEAction={updateHazardPPE} zones={zones} readOnly={!editable}/>
        </section>
        <section className={s.recordPanel}>
          <HealthSafetyDashboardHeatMap className={styles.heat} registerHref={root} hazards={hazards.map(hazard => ({
            id: hazard.id, assessmentId: id, assessmentLabel: assessment.assessment_reference,
            label: hazard.hazard_description || hazard.hazard_category || "Hazard",
            current: [hazard.current_likelihood, hazard.current_severity],
            residual: [hazard.residual_likelihood, hazard.residual_severity],
          }))}/>
        </section>
        <section className={s.recordPanel}><h2>Actions &amp; verification</h2>
          {actions.length ? <ul className={s.recordDecisions}>{actions.map(action => <li key={action.id}>
            <Link href={`/portal/health-safety/actions/${action.id}`}>{action.action_required || action.action_reference || "Control action"}</Link>
            <span>{label(action.status)} · Due {formatDate(action.target_date)}</span>
            {action.responsible_name && <span>{action.responsible_name}</span>}
          </li>)}</ul> : <p>No risk-reduction actions recorded.</p>}
        </section>
      </DocumentRecordPanel>
      <DocumentRecordPanel name="approval">
        <div className={s.grid}><Lifecycle assessment={assessment}/>
          <section className={s.recordPanel}><h2>Approval record</h2><Facts entries={[["Status", label(assessment.status)],
            ["Approver", assessment.approver_name], ["Decision date", formatDate(assessment.approved_at)], ["Approval comment", assessment.approval_comment],
            ["Next review", formatDate(assessment.review_date)]]}/>
            <div className={s.links}><Link className={s.recordButton} href={href + "/review"}>Open review workflow</Link>
              <DocumentRecordTabButton name="distribution">Open distribution</DocumentRecordTabButton></div>
          </section>
        </div>
      </DocumentRecordPanel>
      <DocumentRecordPanel name="documents"><div className={s.grid}>
        <section className={s.recordPanel}><h2>Linked documents</h2><ul className={s.recordDecisions}>
          {attachments.map(([name, reference, url, filename]) => <li key={name}><strong>{name}</strong><span>{reference || "No reference recorded"}</span>
            {url && <Link href={url} download={filename || true}>Download file</Link>}</li>)}
        </ul></section>
        <section className={s.recordPanel}><h2>Applicability &amp; workplace QR</h2>
          <p>{assessment.site_location || "Location not set"}</p>
          {zones.length ? <ul className={s.recordDecisions}>{zones.map(zone => <li key={zone.id}>
            <strong>{zone.reference} · {zone.name}</strong><span>{zoneScope.buildings.find(building => building.id === zone.building_id)?.name || "External / no building"}</span>
          </li>)}</ul> : <p>No individual zones linked.</p>}
          <p className={s.muted}>Linked workplace zones use the existing employee QR access rules for approved or communicated versions.</p>
          {editable && <Link className={s.recordButton} href={href + "/edit"}>Edit workplace scope</Link>}
        </section>
      </div></DocumentRecordPanel>
      <DocumentRecordPanel name="distribution">
        <RecordDistribution assessment={assessment} access={access} canContribute={canContribute} result={query?.distribution}/>
      </DocumentRecordPanel>
      <DocumentRecordPanel name="history">
        <section className={s.recordPanel}><h2>Revision History</h2>
          {previous && <p><Link href={root + "/" + previous.id}>Open previous version · {previous.assessment_reference} · Version {previous.version}</Link></p>}
          {events.length ? <ul className={s.recordHistory}>{events.map(event => <li key={event.id}>
            {event.event_summary || label(event.event_type)}<time dateTime={event.created_at}>{formatDate(event.created_at)}</time>
          </li>)}</ul> : <p>No revision events recorded.</p>}
        </section>
      </DocumentRecordPanel>
    </DocumentRecordTabs>
  </div></main>;

  return editable ? <ControlledDeviceDrafts userId={access.user.id} organizationId={org} recordKey={"hs-risk:" + id}
    label="Risk assessment" baseline={{ assessment, hazards, actions, zoneScope }}>{layout}</ControlledDeviceDrafts> : layout;
}
