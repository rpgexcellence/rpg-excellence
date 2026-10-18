import Link from "next/link";

import { requireOrganizationAccess } from "../../../../lib/organization-access";
import { requirePlanAccess } from "../../../../lib/plan-access";
import { createAdminClient } from "../../../../lib/supabase/admin";

export const metadata = { title: "Workplace Inspections | RPG Excellence" };
export const dynamic = "force-dynamic";

const ROOT = "/portal/health-safety/workplace-inspections";
const OPEN_ACTIONS = ["open", "accepted", "in_progress", "evidence_submitted", "awaiting_verification"];

function formatDate(value, withTime = false) {
  if (!value) return "Not scheduled";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  }).format(new Date(value));
}

function personLabel(person) {
  return [person?.first_name, person?.last_name].filter(Boolean).join(" ") || person?.email || "Unassigned";
}

function dueState(date, today, soon) {
  if (!date) return { label: "Not scheduled", tone: "neutral" };
  const value = String(date).slice(0, 10);
  if (value < today) return { label: "Overdue", tone: "red" };
  if (value <= soon) return { label: "Due soon", tone: "amber" };
  return { label: "Scheduled", tone: "green" };
}

export default async function WorkplaceInspectionsPage() {
  const access = await requireOrganizationAccess("risk_management", "view", ROOT);
  await requirePlanAccess(access.user, "professional", "Health and Safety");

  const admin = createAdminClient();
  const organizationId = access.organization.id;
  const [programmesResult, inspectionsResult, findingsResult, actionsResult, peopleResult] = await Promise.all([
    admin.from("hs_inspection_programmes")
      .select("id,programme_reference,title,administration_location_label,area_department,next_inspection_date,risk_score,risk_band,status,lead_inspector_person_id,accountable_person_id")
      .eq("organization_id", organizationId).neq("status", "archived").order("next_inspection_date"),
    admin.from("hs_workplace_inspections")
      .select("id,inspection_reference,title,administration_location_label,area_department,planned_start_at,status,planning_risk_score,planning_risk_band,lead_inspector_person_id,reviewer_person_id")
      .eq("organization_id", organizationId).order("planned_start_at", { ascending: true }),
    admin.from("hs_workplace_inspection_findings")
      .select("id,inspection_id,priority,status,risk_score").eq("organization_id", organizationId),
    admin.from("hs_workplace_inspection_actions")
      .select("id,inspection_id,action_reference,action_text,priority,responsible_person_id,verifier_person_id,target_date,status,verification_result")
      .eq("organization_id", organizationId).order("target_date"),
    admin.from("organization_people")
      .select("id,first_name,last_name,email,position,account_status")
      .eq("organization_id", organizationId).eq("account_status", "active"),
  ]);

  for (const result of [programmesResult, inspectionsResult, findingsResult, actionsResult, peopleResult]) {
    if (result.error) throw new Error(result.error.message);
  }

  const programmes = programmesResult.data || [];
  const inspections = inspectionsResult.data || [];
  const findings = findingsResult.data || [];
  const actions = actionsResult.data || [];
  const people = new Map((peopleResult.data || []).map((person) => [person.id, person]));
  const today = new Date().toISOString().slice(0, 10);
  const soonDate = new Date();
  soonDate.setUTCDate(soonDate.getUTCDate() + 30);
  const soon = soonDate.toISOString().slice(0, 10);

  const activeProgrammes = programmes.filter((item) => item.status === "active");
  const overdueProgrammes = activeProgrammes.filter((item) => item.next_inspection_date < today);
  const upcomingInspections = inspections.filter((item) => ["planned", "due", "in_progress"].includes(item.status));
  const inProgress = inspections.filter((item) => item.status === "in_progress");
  const openFindings = findings.filter((item) => !["closed", "cancelled"].includes(item.status));
  const criticalFindings = openFindings.filter((item) => item.priority === "critical");
  const openActions = actions.filter((item) => OPEN_ACTIONS.includes(item.status));
  const overdueActions = openActions.filter((item) => item.target_date && item.target_date < today);
  const awaitingVerification = openActions.filter((item) => item.status === "awaiting_verification");

  return <main className="wpiPage"><style>{`
    *{box-sizing:border-box}.wpiPage{min-height:100vh;padding:32px 20px 80px;background:#eaf2f7;color:#071d3a;font-family:Arial,sans-serif}.wpiShell{max-width:1320px;margin:auto}.wpiTop{display:flex;justify-content:space-between;gap:20px;align-items:flex-start;flex-wrap:wrap}.wpiTop small{color:#087f6c;font-weight:900;letter-spacing:.1em}.wpiTop h1{font-size:36px;line-height:1.08;margin:7px 0}.wpiTop p{max-width:770px;margin:0;color:#5f768e}.wpiButtons{display:flex;gap:9px;flex-wrap:wrap}.wpiButton{padding:12px 16px;border:1px solid #c9d8e4;border-radius:10px;background:#fff;color:#123c60;text-decoration:none;font-weight:850}.wpiButton.primary{background:#2f61e8;border-color:#2f61e8;color:#fff}.wpiHero{margin-top:22px;padding:26px;border-radius:18px;background:linear-gradient(118deg,#082d5a,#087d70);color:#fff;display:grid;grid-template-columns:1fr auto;gap:28px;align-items:center}.wpiHero h2{margin:0 0 8px;font-size:24px}.wpiHero p{margin:0;color:#d8eceb;max-width:820px}.wpiHero strong{font-size:46px}.wpiMetrics{display:grid;grid-template-columns:repeat(6,1fr);gap:11px;margin:14px 0}.wpiMetric{padding:17px;border:1px solid #d5e1ea;border-radius:13px;background:#fff}.wpiMetric span,.wpiMetric strong,.wpiMetric small{display:block}.wpiMetric span{min-height:24px;font-size:10px;line-height:1.3;color:#657b91;font-weight:900;text-transform:uppercase}.wpiMetric strong{font-size:29px;margin:7px 0}.wpiMetric small{color:#8192a3}.red{color:#c9342e}.amber{color:#c97900}.green{color:#078763}.wpiGrid{display:grid;grid-template-columns:1.08fr .92fr;gap:14px}.wpiPanel{padding:21px;border:1px solid #d5e1ea;border-radius:15px;background:#fff;overflow:hidden}.wpiPanel h2{margin:0;font-size:21px}.wpiLead{margin:6px 0 17px;color:#6d8297}.wpiList{display:grid;gap:9px}.wpiRow{display:grid;grid-template-columns:minmax(0,1fr) auto auto;gap:14px;align-items:center;padding:14px;border:1px solid #dde7ee;border-radius:11px;color:#123550;text-decoration:none}.wpiRow:hover{border-color:#6ea3d1;background:#f8fbfd}.wpiRow strong,.wpiRow small{display:block}.wpiRow small{margin-top:4px;color:#71869a}.wpiMeta{text-align:right}.wpiTag{display:inline-block;padding:5px 8px;border-radius:999px;background:#e9f0f5;color:#456176;font-size:10px;font-weight:900;text-transform:uppercase}.wpiTag.red{background:#fff0ef;color:#b52620}.wpiTag.amber{background:#fff5dc;color:#996000}.wpiTag.green{background:#e6f7f1;color:#087958}.wpiRisk{font-size:22px;font-weight:900;text-align:center;min-width:48px}.wpiEmpty{padding:20px;border-radius:10px;background:#f1f6f9;color:#667e93}.wpiAction{grid-template-columns:minmax(0,1fr) auto}.wpiFooter{margin-top:14px;color:#71869a;font-size:12px}.wpiStrip{margin-top:14px;padding:15px 18px;border:1px solid #b9d9d3;border-radius:12px;background:#effaf7;display:flex;justify-content:space-between;gap:15px;align-items:center}.wpiStrip p{margin:0;color:#3d665f}.wpiStrip a{white-space:nowrap;color:#087b69;font-weight:900;text-decoration:none}@media(max-width:1050px){.wpiMetrics{grid-template-columns:repeat(3,1fr)}.wpiGrid{grid-template-columns:1fr}}@media(max-width:650px){.wpiPage{padding:20px 12px 60px}.wpiTop h1{font-size:30px}.wpiButtons{width:100%}.wpiButton{flex:1;text-align:center}.wpiHero{grid-template-columns:1fr}.wpiHero strong{font-size:34px}.wpiMetrics{grid-template-columns:1fr 1fr}.wpiRow{grid-template-columns:minmax(0,1fr) auto}.wpiRow .wpiMeta{display:none}.wpiStrip{align-items:flex-start;flex-direction:column}}
  `}</style><div className="wpiShell">
    <header className="wpiTop"><div><small>H&amp;S HUB · OPERATIONAL ASSURANCE</small><h1>Workplace Inspections</h1><p>Plan risk-based inspections, deploy location-specific checklists and turn observations into owned, verified actions.</p></div><div className="wpiButtons"><Link className="wpiButton" href="/portal/health-safety/management-board">Management Board</Link><Link className="wpiButton primary" href={`${ROOT}/programmes/new`}>+ New programme</Link></div></header>
    <section className="wpiHero"><div><h2>Dynamic inspection planning</h2><p>The engine combines site characteristics with earlier inspections, audits, incidents, risk assessments, permits, POWRA, MOC and asset signals. Higher exposure brings the next inspection forward and expands the applicable checklist.</p></div><strong>{overdueProgrammes.length + criticalFindings.length + overdueActions.length}</strong></section>
    <section className="wpiMetrics">
      <div className="wpiMetric"><span>Active programmes</span><strong>{activeProgrammes.length}</strong><small>{programmes.length} controlled records</small></div>
      <div className="wpiMetric"><span>Inspections due</span><strong className={overdueProgrammes.length ? "red" : "green"}>{overdueProgrammes.length}</strong><small>Past planned date</small></div>
      <div className="wpiMetric"><span>In progress</span><strong>{inProgress.length}</strong><small>{upcomingInspections.length} planned or active</small></div>
      <div className="wpiMetric"><span>Open findings</span><strong className={criticalFindings.length ? "red" : ""}>{openFindings.length}</strong><small>{criticalFindings.length} critical</small></div>
      <div className="wpiMetric"><span>Overdue actions</span><strong className={overdueActions.length ? "amber" : "green"}>{overdueActions.length}</strong><small>{openActions.length} open actions</small></div>
      <div className="wpiMetric"><span>Awaiting verification</span><strong>{awaitingVerification.length}</strong><small>Independent review required</small></div>
    </section>
    <section className="wpiGrid">
      <div className="wpiPanel"><h2>Inspection programmes</h2><p className="wpiLead">Recurring location-based plans, ordered by their next inspection date.</p>{programmes.length ? <div className="wpiList">{programmes.slice(0,10).map((programme) => { const due = dueState(programme.next_inspection_date,today,soon); return <Link className="wpiRow" href={`${ROOT}/programmes/${programme.id}`} key={programme.id}><div><strong>{programme.title}</strong><small>{programme.programme_reference} · {programme.administration_location_label}{programme.area_department ? ` · ${programme.area_department}` : ""}</small><small>Lead: {personLabel(people.get(programme.lead_inspector_person_id))}</small></div><div className="wpiMeta"><strong>{formatDate(programme.next_inspection_date)}</strong><small>Next inspection</small></div><div><span className={`wpiTag ${due.tone}`}>{due.label}</span><div className={`wpiRisk ${programme.risk_band === "critical" ? "red" : programme.risk_band === "high" ? "amber" : ""}`}>{programme.risk_score}</div></div></Link>;})}</div> : <div className="wpiEmpty">No inspection programme exists. Create the first programme and select its Site Profile location, Company Users and area characteristics.</div>}</div>
      <aside className="wpiPanel"><h2>Scheduled fieldwork</h2><p className="wpiLead">Planned and live inspections requiring delivery.</p>{upcomingInspections.length ? <div className="wpiList">{upcomingInspections.slice(0,9).map((inspection) => <Link className="wpiRow" href={`${ROOT}/${inspection.id}`} key={inspection.id}><div><strong>{inspection.title}</strong><small>{inspection.inspection_reference} · {inspection.administration_location_label}</small><small>Inspector: {personLabel(people.get(inspection.lead_inspector_person_id))}</small></div><div className="wpiMeta"><strong>{formatDate(inspection.planned_start_at,true)}</strong><small>{inspection.status.replaceAll("_"," ")}</small></div><span className={`wpiTag ${inspection.planning_risk_band === "critical" ? "red" : inspection.planning_risk_band === "high" ? "amber" : "green"}`}>{inspection.planning_risk_band}</span></Link>)}</div> : <div className="wpiEmpty">No fieldwork is currently planned. Open a programme to schedule its next inspection.</div>}</aside>
    </section>
    <section className="wpiPanel" style={{marginTop:14}}><h2>Outstanding actions</h2><p className="wpiLead">Actions remain visible to their owner and management until independently verified.</p>{openActions.length ? <div className="wpiList">{openActions.slice(0,10).map((action) => { const overdue = action.target_date && action.target_date < today; return <Link className="wpiRow wpiAction" href={`${ROOT}/${action.inspection_id}`} key={action.id}><div><strong>{action.action_text}</strong><small>{action.action_reference} · Owner: {personLabel(people.get(action.responsible_person_id))}</small><small>Verifier: {personLabel(people.get(action.verifier_person_id))}</small></div><div><span className={`wpiTag ${overdue ? "red" : action.status === "awaiting_verification" ? "amber" : "green"}`}>{overdue ? "Overdue" : action.status.replaceAll("_"," ")}</span><small style={{marginTop:7,textAlign:"right"}}>Due {formatDate(action.target_date)}</small></div></Link>;})}</div> : <div className="wpiEmpty">No Workplace Inspection actions are currently outstanding.</div>}</section>
    <div className="wpiStrip"><p><strong>Offline fieldwork:</strong> planned inspections can be cached on the device, completed without connectivity and synchronised when the connection returns.</p><Link href={`${ROOT}/offline`}>Open offline workspace →</Link></div>
    <footer className="wpiFooter">Live organisational view generated {formatDate(new Date().toISOString(),true)}. Confirm actual site conditions before work proceeds.</footer>
  </div></main>;
}
