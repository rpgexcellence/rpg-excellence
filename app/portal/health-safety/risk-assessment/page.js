import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "../../../../lib/supabase/server";

export const metadata = { title: "Risk Assessment Register | RPG Excellence" };
export const dynamic = "force-dynamic";

const formatDate = (value) => value ? new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value)) : "—";
const label = (value) => String(value || "draft").replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
const activeStatuses = ["draft", "in_review", "changes_required", "approved", "communicated", "review_due"];

export default async function RiskAssessmentRegisterPage({ searchParams }) {
  const query = await searchParams;
  const view = ["all", "active", "elevated", "review-due", "approved", "archived"].includes(query?.view) ? query.view : "all";
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/portal/login?next=/portal/health-safety/risk-assessments");

  const [assessmentsResult, hazardsResult, actionsResult] = await Promise.all([
    supabase.from("hs_risk_assessments").select("id,assessment_reference,title,version,status,assessment_type,site_location,area_department,assessor_name,assessment_date,review_date,updated_at").eq("owner_id", user.id).order("updated_at", { ascending: false }),
    supabase.from("hs_risk_hazards").select("id,assessment_id,current_score,residual_score,residual_band").eq("owner_id", user.id),
    supabase.from("hs_risk_actions").select("id,assessment_id,status,target_date").eq("owner_id", user.id),
  ]);
  for (const result of [assessmentsResult, hazardsResult, actionsResult]) if (result.error) throw new Error(result.error.message);

  const assessments = assessmentsResult.data || [];
  const hazards = hazardsResult.data || [];
  const actions = actionsResult.data || [];
  const today = new Date().toISOString().slice(0, 10);
  const openActionStatuses = new Set(["open", "accepted", "in_progress", "evidence_submitted", "verification", "partly_effective", "not_effective"]);
  const statsByAssessment = new Map();
  for (const assessment of assessments) statsByAssessment.set(assessment.id, { hazards: 0, elevated: 0, openActions: 0, overdue: 0, highest: 0 });
  for (const hazard of hazards) {
    const stats = statsByAssessment.get(hazard.assessment_id);
    if (!stats) continue;
    const score = hazard.residual_score ?? hazard.current_score ?? 0;
    stats.hazards += 1;
    stats.highest = Math.max(stats.highest, score);
    if (score >= 10) stats.elevated += 1;
  }
  for (const action of actions) {
    const stats = statsByAssessment.get(action.assessment_id);
    if (!stats || !openActionStatuses.has(action.status)) continue;
    stats.openActions += 1;
    if (action.target_date < today) stats.overdue += 1;
  }

  const enriched = assessments.map((item) => ({ ...item, stats: statsByAssessment.get(item.id) }));
  const filtered = enriched.filter((item) => {
    if (view === "active") return activeStatuses.includes(item.status);
    if (view === "elevated") return item.stats.elevated > 0;
    if (view === "review-due") return item.review_date && item.review_date <= today && !["superseded", "archived"].includes(item.status);
    if (view === "approved") return ["approved", "communicated"].includes(item.status);
    if (view === "archived") return ["archived", "superseded"].includes(item.status);
    return true;
  });
  const elevatedCount = enriched.filter((item) => item.stats.elevated > 0).length;
  const reviewDueCount = enriched.filter((item) => item.review_date && item.review_date <= today && !["superseded", "archived"].includes(item.status)).length;
  const approvedCount = enriched.filter((item) => ["approved", "communicated"].includes(item.status)).length;

  return <main className="raPage"><style>{`
    *{box-sizing:border-box}.raPage{min-height:100vh;padding:34px 22px 80px;background:#edf4f8;color:#071d3a;font-family:Arial,sans-serif}.raShell{max-width:1280px;margin:auto}.raTop{display:flex;justify-content:space-between;gap:20px;align-items:flex-start;flex-wrap:wrap}.raTop small{color:#087f6c;font-weight:900;letter-spacing:.1em}.raTop h1{font-size:35px;margin:7px 0}.raTop p{margin:0;color:#657b93}.raActions{display:flex;gap:9px;flex-wrap:wrap}.raButton{display:inline-flex;align-items:center;justify-content:center;padding:12px 16px;border-radius:9px;background:#087f6c;color:#fff;text-decoration:none;font-weight:850}.raButton.secondary{background:#fff;color:#12385f;border:1px solid #cbd8e8}.raMetrics{display:grid;grid-template-columns:repeat(4,1fr);gap:13px;margin:24px 0 15px}.raMetric{{padding:18px;border:1px solid #d5e2ea;border-radius:13px;background:#fff}.raMetric span span span,.raMetric strong strong{display:block}.raMetric span{font-size:12px;font-weight:850;color:#637991}.raMetric strong{font-size:31px;margin-top:8px}.raViews{display:flex;gap:7px;flex-wrap:wrap;padding:13px;border:1px solid #d5e2ea;border-radius:13px;background:#fff}.raViews a{padding:9px 12px;border-radius:8px;color:#4d667f;text-decoration:none;font-size:13px;font-weight:800}.raViews a.active{background:#0b5eaa;color:#fff}.raPanel{margin-top:15px;padding:22px;border:1px solid #d5e2ea;border-radius:15px;background:#fff}.raPanelHead{display:flex;justify-content:space-between;gap:15px;align-items:end;margin-bottom:16px}.raPanelHead h2{margin:0}.raPanelHead p{margin:5px 0 0;color:#6c8197}.raCount{color:#087f6c;font-weight:900}.raRows{display:grid;gap:9px}.raRow{display:grid;grid-template-columns:1.45fr .7fr .75fr .65fr auto;gap:14px;align-items:center;padding:16px;border:1px solid #dde7ed;border-radius:11px;color:#153852;text-decoration:none}.raRow:hover{border-color:#8ac9bd;background:#f5fcfa}.raRow strong,.raRow small{display:block}.raRow small{color:#778b9e;margin-top:4px}.raPill{justify-self:start;padding:6px 9px;border-radius:999px;background:#e8f2ff;color:#175cae;font-size:11px;font-weight:850}.raRisk{font-size:19px}.raRisk.high{color:#c83831}.raRisk.medium{color:#d27c00}.raOpen{color:#087f6c;font-weight:900}.raEmpty{padding:30px;text-align:center;border-radius:12px;background:#f2f6f9;color:#64798f}.raEmpty strong{display:block;color:#173b57;margin-bottom:7px}@media(max-width:920px){.raMetrics{grid-template-columns:1fr 1fr}.raRow{grid-template-columns:1fr .6fr auto}.raRow>:nth-child(2),.raRow>:nth-child(4){display:none}}@media(max-width:560px){.raMetrics{grid-template-columns:1fr}.raRow{grid-template-columns:1fr auto}.raRow>:nth-child(3){display:none}}
    .raMetric{padding:18px;border:1px solid #d5e2ea;border-radius:13px;background:#fff}.raMetric span,.raMetric strong{display:block}
  `}</style><div className="raShell">
    <header className="raTop"><div><small>H&amp;S HUB · CONTROLLED REGISTER</small><h1>Risk Assessment Register</h1><p>Find, monitor and review every workplace risk assessment from one controlled view.</p></div><div className="raActions"><Link className="raButton secondary" href="/portal/health-safety">← H&amp;S Hub</Link><Link className="raButton" href="/portal/health-safety/risk-assessments/new">New risk assessment</Link></div></header>
    <section className="raMetrics"><div className="raMetric"><span>ALL ASSESSMENTS</span><strong>{enriched.length}</strong></div><div className="raMetric"><span>WITH ELEVATED RISK</span><strong>{elevatedCount}</strong></div><div className="raMetric"><span>REVIEWS DUE</span><strong>{reviewDueCount}</strong></div><div className="raMetric"><span>APPROVED / COMMUNICATED</span><strong>{approvedCount}</strong></div></section>
    <nav className="raViews" aria-label="Risk assessment views">{[["all","All"],["active","Active"],["elevated","Elevated risk"],["review-due","Review due"],["approved","Approved"],["archived","Archived"]].map(([key,title]) => <Link className={view === key ? "active" : ""} href={key === "all" ? "/portal/health-safety/risk-assessments" : "/portal/health-safety/risk-assessments?view=" + key} key={key}>{title}</Link>)}</nav>
    <section className="raPanel"><div className="raPanelHead"><div><h2>{label(view)} assessments</h2><p>Residual-risk and action information is calculated from each controlled record.</p></div><span className="raCount">{filtered.length} record{filtered.length === 1 ? "" : "s"}</span></div>{filtered.length ? <div className="raRows">{filtered.map((item) => <Link className="raRow" href={"/portal/health-safety/risk-assessments/" + item.id} key={item.id}><div><strong>{item.title}</strong><small>{item.assessment_reference} · Version {item.version} · {label(item.assessment_type)}</small></div><div><strong>{item.site_location || item.area_department || "Not set"}</strong><small>{item.assessor_name || "Assessor pending"}</small></div><span className="raPill">{label(item.status)}</span><div><strong className={item.stats.highest >= 10 ? "raRisk high" : item.stats.highest >= 5 ? "raRisk medium" : "raRisk"}>{item.stats.highest || "—"}</strong><small>{item.stats.elevated} elevated · {item.stats.hazards} hazards</small></div><b className="raOpen">Open →</b></Link>)}</div> : <div className="raEmpty"><strong>No assessments in this view</strong>Create a new assessment or select another register view.</div>}</section>
  </div></main>;
}
