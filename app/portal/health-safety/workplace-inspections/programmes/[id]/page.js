import Link from "next/link";
import ProgrammeActionForm from "./ProgrammeActionForm";
import { notFound } from "next/navigation";

import { requireOrganizationAccess } from "../../../../../../lib/organization-access";
import { requirePlanAccess } from "../../../../../../lib/plan-access";
import { createAdminClient } from "../../../../../../lib/supabase/admin";
import { generateScheduledInspection, refreshInspectionProgramme } from "../../actions";
import "../../workplace-inspections.css";
import "./programme-detail.css";

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

function personName(person) {
  return [person?.first_name, person?.last_name].filter(Boolean).join(" ") || person?.email || "Company User unavailable";
}

export default async function WorkplaceInspectionProgrammePage({ params }) {
  const route = await params;
  const programmeId = route.id;
  const access = await requireOrganizationAccess("risk_management", "view", ROOT + "/programmes/" + programmeId);
  await requirePlanAccess(access.user, "professional", "Health and Safety");

  const admin = createAdminClient();
  const organizationId = access.organization.id;
  const [programmeResult, packResult, signalResult, inspectionResult, peopleResult] = await Promise.all([
    admin.from("hs_inspection_programmes").select("*").eq("id", programmeId).eq("organization_id", organizationId).maybeSingle(),
    admin.from("hs_inspection_programme_packs")
      .select("selection_source,selection_reason,pack:hs_inspection_question_packs(id,pack_code,title,description,activation_guidance,legislation_summary)")
      .eq("programme_id", programmeId).eq("organization_id", organizationId),
    admin.from("hs_inspection_risk_signals").select("*").eq("programme_id", programmeId).eq("organization_id", organizationId).eq("active", true).order("occurred_at", { ascending: false }),
    admin.from("hs_workplace_inspections").select("id,inspection_reference,title,status,planned_start_at,completed_at,planning_risk_score,planning_risk_band")
      .eq("programme_id", programmeId).eq("organization_id", organizationId).order("created_at", { ascending: false }),
    admin.from("organization_people").select("id,first_name,last_name,email,position,account_status").eq("organization_id", organizationId),
  ]);

  if (programmeResult.error) throw new Error(programmeResult.error.message);
  if (!programmeResult.data) notFound();
  for (const result of [packResult, signalResult, inspectionResult, peopleResult]) {
    if (result.error) throw new Error(result.error.message);
  }

  const programme = programmeResult.data;
  const packs = packResult.data || [];
  const signals = signalResult.data || [];
  const inspections = inspectionResult.data || [];
  const people = new Map((peopleResult.data || []).map((person) => [person.id, person]));
  const latest = inspections[0] || null;
  const canManage = access.isOwner || access.isCompanyAdministrator || ["contribute", "review", "approve", "admin", "owner"].includes(access.level);
  const today = new Date().toISOString().slice(0, 10);
  const defaultTitle = programme.title + " · " + displayDate(programme.next_inspection_date);

  return <main className="wpiPage wpiProgrammePage"><div className="wpiShell">
    <header className="wpiTop">
      <div><small>{programme.programme_reference} · {programme.status.toUpperCase()}</small><h1>{programme.title}</h1><p>{programme.administration_location_label}{programme.area_department ? " · " + programme.area_department : ""}</p></div>
      <div className="wpiButtons"><Link className="wpiButton" href={ROOT}>← Register</Link>{canManage ? <Link className="wpiButton" href={ROOT + "/programmes/" + programme.id + "/edit"}>Edit programme</Link> : null}</div>
    </header>

    <section className="wpiHero"><div><h2>{programme.risk_band === "routine" ? "Routine inspection cycle" : programme.risk_band + " planning priority"}</h2><p>{programme.planning_basis || "The programme has not yet been recalculated against connected risk signals."}</p></div><strong>{programme.risk_score}/100</strong></section>

    <section className="wpiMetrics">
      <div className="wpiMetric"><span>Next inspection</span><strong>{displayDate(programme.next_inspection_date)}</strong><small>{programme.next_inspection_date < today ? "Overdue" : "Scheduled"}</small></div>
      <div className="wpiMetric"><span>Frequency</span><strong>{programme.frequency_amount}</strong><small>{programme.frequency_unit}</small></div>
      <div className="wpiMetric"><span>Checklist packs</span><strong>{packs.length}</strong><small>Core and specialist</small></div>
      <div className="wpiMetric"><span>Active signals</span><strong>{signals.length}</strong><small>Connected evidence</small></div>
      <div className="wpiMetric"><span>Inspections</span><strong>{inspections.length}</strong><small>{latest ? latest.status.replaceAll("_", " ") : "None completed"}</small></div>
      <div className="wpiMetric"><span>Last inspection</span><strong>{programme.last_inspection_date ? displayDate(programme.last_inspection_date) : "—"}</strong><small>Controlled baseline</small></div>
    </section>

    <section className="wpiGrid">
      <div className="wpiPanel"><h2>Controlled accountability</h2><p className="wpiLead">All appointments are linked to Administration → Company Users.</p><div className="wpiFormGrid">
        <div className="wpiGuidance"><strong>Accountable owner</strong><p>{personName(people.get(programme.accountable_person_id))}</p></div>
        <div className="wpiGuidance"><strong>Lead inspector</strong><p>{personName(people.get(programme.lead_inspector_person_id))}</p></div>
        <div className="wpiGuidance"><strong>Independent reviewer</strong><p>{personName(people.get(programme.reviewer_person_id))}</p></div>
        <div className="wpiGuidance"><strong>Administration Site Profile</strong><p>{programme.administration_location_label}</p></div>
      </div></div>

      <aside className="wpiPanel"><h2>Refresh dynamic plan</h2><p className="wpiLead">Re-read active signals and recalculate packs, risk priority and the next inspection date.</p>{canManage ? <ProgrammeActionForm action={refreshInspectionProgramme} submitLabel="Refresh risk-based plan" pendingLabel="Refreshing plan…"><input type="hidden" name="programme_id" value={programme.id} /><div className="wpiGuidance"><strong>Connected sources</strong><p>Previous inspections, internal audits, accidents, incidents, risk assessments, POWRA, permits, MOC and assets.</p></div></ProgrammeActionForm> : <div className="wpiEmpty">View-only access. A contributor or administrator must refresh this plan.</div>}</aside>
    </section>

    <section className="wpiPanel" style={{ marginTop: 14 }}><h2>Generated checklist packs</h2><p className="wpiLead">The core pack is mandatory. Specialist packs are selected from the area profile or connected evidence.</p>{packs.length ? <div className="wpiProfileGrid">{packs.map((item) => <article className="wpiProfileCard selected" key={item.pack?.id || item.pack?.pack_code}><span><strong>{item.pack?.title || item.pack?.pack_code}</strong><small>{item.selection_reason || item.pack?.description || "Applied by the dynamic engine."}</small><small>{item.pack?.legislation_summary || "Follow applicable legislation and controlled organisational requirements."}</small></span></article>)}</div> : <div className="wpiEmpty">No packs have been generated. Refresh the programme before scheduling an inspection.</div>}</section>

    <section className="wpiGrid" style={{ marginTop: 14 }}>
      <div className="wpiPanel"><h2>Connected risk signals</h2><p className="wpiLead">Each signal contributes severity × likelihood × weighting to the planning score.</p>{signals.length ? <div className="wpiList">{signals.map((signal) => <div className="wpiRow" key={signal.id}><div><strong>{signal.summary}</strong><small>{signal.source_module.replaceAll("_", " ")} · {signal.source_reference || "No source reference"}</small></div><div className="wpiMeta"><strong>{displayDate(signal.occurred_at)}</strong><small>Occurred</small></div><span className={"wpiTag " + (signal.signal_score >= 60 ? "red" : signal.signal_score >= 40 ? "amber" : "green")}>{signal.signal_score} points</span></div>)}</div> : <div className="wpiEmpty">No active connected risk signals. The normal recurring frequency applies.</div>}</div>

      <aside className="wpiPanel wpiSchedulePanel"><h2>Schedule fieldwork</h2><p className="wpiLead">Create the next inspection and freeze the generated questions for field use.</p>{canManage && packs.length ? <ProgrammeActionForm action={generateScheduledInspection} submitLabel="Generate and schedule inspection" pendingLabel="Generating inspection…"><input type="hidden" name="programme_id" value={programme.id} /><input type="hidden" name="inspection_type" value="workplace" /><label className="wpiField"><span>Inspection title *</span><input name="title" required maxLength="180" defaultValue={defaultTitle} /></label><div className="wpiFormGrid wpiScheduleDateTime"><label className="wpiField"><span>Planned date *</span><input name="planned_date" type="date" required defaultValue={programme.next_inspection_date} /></label><label className="wpiField"><span>Start time *</span><input name="planned_start_time" type="time" required defaultValue="09:00" /></label></div><label className="wpiField"><span>Planned duration</span><select name="duration_minutes" defaultValue="120"><option value="60">1 hour</option><option value="90">1.5 hours</option><option value="120">2 hours</option><option value="180">3 hours</option><option value="240">4 hours</option><option value="480">Full day</option></select></label><label className="wpiField"><span>Inspection scope</span><textarea name="scope" rows="4" maxLength="3000" defaultValue={programme.area_department || ""} placeholder="Define the area, activities, boundaries and exclusions." /></label></ProgrammeActionForm> : <div className="wpiEmpty">{packs.length ? "View-only access." : "Generate checklist packs before scheduling fieldwork."}</div>}</aside>
    </section>

    <section className="wpiPanel" style={{ marginTop: 14 }}><h2>Inspection history</h2><p className="wpiLead">Open a scheduled or completed inspection and its findings, actions and evidence.</p>{inspections.length ? <div className="wpiList">{inspections.map((inspection) => <Link className="wpiRow" href={ROOT + "/" + inspection.id} key={inspection.id}><div><strong>{inspection.title}</strong><small>{inspection.inspection_reference} · {inspection.status.replaceAll("_", " ")}</small></div><div className="wpiMeta"><strong>{displayDate(inspection.planned_start_at, true)}</strong><small>{inspection.completed_at ? "Completed " + displayDate(inspection.completed_at) : "Fieldwork"}</small></div><span className={"wpiTag " + (inspection.planning_risk_band === "critical" ? "red" : inspection.planning_risk_band === "high" ? "amber" : "green")}>{inspection.planning_risk_score}/100</span></Link>)}</div> : <div className="wpiEmpty">No inspection has yet been scheduled from this programme.</div>}</section>
  </div></main>;
}
