import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "../../../../lib/supabase/server";

export const metadata = { title: "Risk Actions & Verification | RPG Excellence" };
export const dynamic = "force-dynamic";

const formatDate = (value) => value ? new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value)) : "—";
const label = (value) => String(value || "open").replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
const openStatuses = ["open", "accepted", "in_progress", "evidence_submitted", "verification", "partly_effective", "not_effective"];

export default async function RiskActionsRegisterPage({ searchParams }) {
  const query = await searchParams;
  const view = ["all", "open", "overdue", "verification", "elevated", "effective"].includes(query?.view) ? query.view : "all";
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/portal/login?next=/portal/health-safety/actions");

  const [actionsResult, assessmentsResult, hazardsResult] = await Promise.all([
    supabase.from("hs_risk_actions").select("*").eq("owner_id", user.id).order("target_date"),
    supabase.from("hs_risk_assessments").select("id,assessment_reference,title,site_location,status").eq("owner_id", user.id),
    supabase.from("hs_risk_hazards").select("id,hazard_category,hazard_description,residual_score,residual_band").eq("owner_id", user.id),
  ]);
  for (const result of [actionsResult, assessmentsResult, hazardsResult]) if (result.error) throw new Error(result.error.message);

  const actions = actionsResult.data || [];
  const assessmentMap = new Map((assessmentsResult.data || []).map((item) => [item.id, item]));
  const hazardMap = new Map((hazardsResult.data || []).map((item) => [item.id, item]));
  const today = new Date().toISOString().slice(0, 10);
  const overdue = actions.filter((item) => openStatuses.includes(item.status) && item.target_date < today);
  const verification = actions.filter((item) => ["evidence_submitted", "verification"].includes(item.status));
  const elevated = actions.filter((item) => (hazardMap.get(item.hazard_id)?.residual_score || 0) >= 10 && openStatuses.includes(item.status));
  const effective = actions.filter((item) => item.status === "effective" || item.effectiveness_result === "effective_verified");
  const filtered = actions.filter((item) => {
    if (view === "open") return openStatuses.includes(item.status);
    if (view === "overdue") return openStatuses.includes(item.status) && item.target_date < today;
    if (view === "verification") return ["evidence_submitted", "verification"].includes(item.status);
    if (view === "elevated") return (hazardMap.get(item.hazard_id)?.residual_score || 0) >= 10 && openStatuses.includes(item.status);
    if (view === "effective") return item.status === "effective" || item.effectiveness_result === "effective_verified";
    return true;
  });

  return <main className="harPage"><style>{`
    *{box-sizing:border-box}.harPage{min-height:100vh;padding:34px 22px 80px;background:#edf4f8;color:#071d3a;font-family:Arial,sans-serif}.harShell{max-width:1280px;margin:auto}.harTop{display:flex;justify-content:space-between;gap:20px;align-items:flex-start;flex-wrap:wrap}.harTop small{color:#087f6c;font-weight:900;letter-spacing:.1em}.harTop h1{font-size:35px;margin:7px 0}.harTop p{margin:0;color:#657b93}.harButtons{display:flex;gap:9px;flex-wrap:wrap}.harButton{padding:11px 15px;border:1px solid #ccd9e4;border-radius:9px;background:#fff;color:#173b59;text-decoration:none;font-weight:850}.harMetrics{display:grid;grid-template-columns:repeat(4,1fr);gap:13px;margin:24px 0 15px}.harMetric{padding:18px;border:1px solid #d5e2ea;border-radius:13px;background:#fff}.harMetric span,.harMetric strong{display:block}.harMetric span{font-size:11px;color:#637991;font-weight:850}.harMetric strong{font-size:31px;margin-top:8px}.harMetric .red{color:#c7352e}.harMetric .amber{color:#cf7900}.harMetric .green{color:#078b61}.harViews{display:flex;gap:7px;flex-wrap:wrap;padding:13px;border:1px solid #d5e2ea;border-radius:13px;background:#fff}.harViews a{padding:9px 12px;border-radius:8px;color:#4d667f;text-decoration:none;font-size:13px;font-weight:800}.harViews a.active{background:#0b5eaa;color:#fff}.harPanel{margin-top:15px;padding:22px;border:1px solid #d5e2ea;border-radius:15px;background:#fff}.harHead{display:flex;justify-content:space-between;gap:15px;align-items:end;margin-bottom:16px}.harHead h2{margin:0}.harHead p{margin:5px 0 0;color:#6c8197}.harCount{color:#087f6c;font-weight:900}.harRows{display:grid;gap:9px}.harRow{display:grid;grid-template-columns:1.4fr .8fr .65fr .65fr auto;gap:14px;align-items:center;padding:16px;border:1px solid #dde7ed;border-radius:11px;color:#153852;text-decoration:none}.harRow:hover{border-color:#8ac9bd;background:#f5fcfa}.harRow strong,.harRow small{display:block}.harRow small{color:#778b9e;margin-top:4px}.harPill{justify-self:start;padding:6px 9px;border-radius:999px;background:#e8f2ff;color:#175cae;font-size:11px;font-weight:850}.harPill.high,.harPill.critical{background:#ffe8e6;color:#b82f29}.harLate{color:#c7352e}.harOpen{color:#087f6c;font-weight:900}.harEmpty{padding:30px;text-align:center;border-radius:12px;background:#f2f6f9;color:#64798f}.harEmpty strong{display:block;color:#173b57;margin-bottom:7px}@media(max-width:950px){.harMetrics{grid-template-columns:1fr 1fr}.harRow{grid-template-columns:1fr .7fr auto}.harRow>:nth-child(2),.harRow>:nth-child(4){display:none}}@media(max-width:560px){.harMetrics{grid-template-columns:1fr}.harRow{grid-template-columns:1fr auto}.harRow>:nth-child(3){display:none}}
    .harTable{margin-top:15px;padding:22px;border:1px solid #d5e2ea;border-radius:15px;background:#fff}.harRow{grid-template-columns:1.4fr .8fr .65fr .65fr auto auto}@media(max-width:950px){.harRow{grid-template-columns:1fr .7fr auto}}@media(max-width:560px){.harRow{grid-template-columns:1fr auto}}
  `}</style><div className="harShell">
    <header className="harTop"><div><small>H&amp;S HUB · ACTION CONTROL</small><h1>Risk Actions &amp; Verification</h1><p>Track additional controls from assignment through evidence and verified effectiveness.</p></div><div className="harButtons"><Link className="harButton" href="/portal/health-safety">← H&amp;S Hub</Link><Link className="harButton" href="/portal/health-safety/risk-assessments">Risk Assessment Register</Link></div></header>
    <section className="harMetrics"><div className="harMetric"><span>OPEN ACTIONS</span><strong>{actions.filter((item) => openStatuses.includes(item.status)).length}</strong></div><div className="harMetric"><span>OVERDUE</span><strong className="red">{overdue.length}</strong></div><div className="harMetric"><span>AWAITING VERIFICATION</span><strong className="amber">{verification.length}</strong></div><div className="harMetric"><span>VERIFIED EFFECTIVE</span><strong className="green">{effective.length}</strong></div></section>
    <nav className="harViews" aria-label="Action register views">{[["all","All"],["open","Open"],["overdue","Overdue"],["verification","Awaiting verification"],["elevated","Elevated risks"],["effective","Verified effective"]].map(([key,title]) => <Link className={view === key ? "active" : ""} href={key === "all" ? "/portal/health-safety/actions" : "/portal/health-safety/actions?view=" + key} key={key}>{title}</Link>)}</nav>
    <section className="harTable"><div className="harHead"><div><h2>{label(view)} actions</h2><p>Every action remains linked to its originating assessment and hazard.</p></div><span className="harCount">{filtered.length} action{filtered.length === 1 ? "" : "s"}</span></div>{filtered.length ? <div className="harRows">{filtered.map((action) => { const assessment = assessmentMap.get(action.assessment_id); const hazard = hazardMap.get(action.hazard_id); const isLate = openStatuses.includes(action.status) && action.target_date < today; return <Link className="harRow" href={"/portal/health-safety/actions/" + action.id} key={action.id}><div><strong>{action.action_required}</strong><small>{action.action_reference} · {hazard?.hazard_category || "General action"}</small></div><div><strong>{assessment?.title || "Risk assessment"}</strong><small>{assessment?.assessment_reference || "—"} · {assessment?.site_location || "Location not set"}</small></div><div><strong>{action.responsible_name}</strong><small>Responsible person</small></div><div className={isLate ? "harLate" : ""}><strong>{formatDate(action.target_date)}</strong><small>{isLate ? "Overdue" : label(action.status)}</small></div><span className={"harPill " + action.priority}>{label(action.priority)}</span><b className="harOpen">Open →</b></Link>; })}</div> : <div className="harEmpty"><strong>No actions in this view</strong>Actions created within risk assessments will appear here automatically.</div>}</section>
  </div></main>;
}
