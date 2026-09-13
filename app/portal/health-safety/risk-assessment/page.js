import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "../../../../lib/supabase/server";

export const metadata = { title: "Risk Assessment Register | RPG Excellence" };
export const dynamic = "force-dynamic";

const REGISTER_PATH = "/portal/health-safety/risk-assessment";
const activeStatuses = ["draft", "in_review", "changes_required", "approved", "communicated", "review_due"];
const openActionStatuses = new Set(["open", "accepted", "in_progress", "evidence_submitted", "verification", "partly_effective", "not_effective"]);
const formatDate = (value) => value ? new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value)) : "—";
const label = (value) => String(value || "draft").replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
const riskBand = (score) => score >= 15 ? "unacceptable" : score >= 10 ? "inadequate" : score >= 5 ? "adequate" : score > 0 ? "acceptable" : "unrated";

function viewHref(view, search) {
  const params = new URLSearchParams();
  if (view !== "all") params.set("view", view);
  if (search) params.set("q", search);
  const query = params.toString();
  return query ? `${REGISTER_PATH}?${query}` : REGISTER_PATH;
}

export default async function RiskAssessmentRegisterPage({ searchParams }) {
  const query = await searchParams;
  const validViews = ["all", "active", "elevated", "review-due", "approved", "archived"];
  const view = validViews.includes(query?.view) ? query.view : "all";
  const search = String(query?.q || "").trim();
  const searchLower = search.toLowerCase();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/portal/login?next=${REGISTER_PATH}`);

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
    if (action.target_date && action.target_date < today) stats.overdue += 1;
  }

  const enriched = assessments.map((item) => ({ ...item, stats: statsByAssessment.get(item.id), reviewDue: Boolean(item.review_date && item.review_date <= today && !["superseded", "archived"].includes(item.status)) }));
  const matchesView = (item, selectedView) => {
    if (selectedView === "active") return activeStatuses.includes(item.status);
    if (selectedView === "elevated") return item.stats.elevated > 0;
    if (selectedView === "review-due") return item.reviewDue;
    if (selectedView === "approved") return ["approved", "communicated"].includes(item.status);
    if (selectedView === "archived") return ["archived", "superseded"].includes(item.status);
    return true;
  };
  const viewCounts = Object.fromEntries(validViews.map((key) => [key, enriched.filter((item) => matchesView(item, key)).length]));
  const filtered = enriched.filter((item) => matchesView(item, view) && (!searchLower || [item.title, item.assessment_reference, item.site_location, item.area_department, item.assessor_name, item.assessment_type].some((value) => String(value || "").toLowerCase().includes(searchLower))));
  const controlledCount = enriched.filter((item) => ["approved", "communicated"].includes(item.status)).length;
  const elevatedCount = enriched.filter((item) => item.stats.elevated > 0).length;
  const overdueActionCount = enriched.reduce((total, item) => total + item.stats.overdue, 0);
  const reviewDueCount = enriched.filter((item) => item.reviewDue).length;
  const controlRate = enriched.length ? Math.round((controlledCount / enriched.length) * 100) : 0;
  const views = [["all", "All assessments"], ["active", "Active"], ["elevated", "Elevated risk"], ["review-due", "Reviews due"], ["approved", "Approved"], ["archived", "Archived"]];

  return <main className="raPage"><style>{`
    .raPage{min-height:100vh;padding:30px clamp(18px,3vw,46px) 80px;background:#edf3fa;color:#071d3a;font-family:Arial,sans-serif}.raShell{max-width:1500px;margin:auto}.raTop{display:flex;justify-content:space-between;gap:24px;align-items:flex-start;flex-wrap:wrap}.raTop small{color:#087f6c;font-size:11px;font-weight:950;letter-spacing:.12em}.raTop h1{margin:7px 0 6px;font-size:34px;letter-spacing:-.035em}.raTop p{max-width:760px;margin:0;color:#607890;line-height:1.5}.raActions{display:flex;gap:10px;flex-wrap:wrap}.raButton{display:inline-flex;align-items:center;justify-content:center;min-height:42px;padding:11px 16px;border-radius:10px;background:#087f6c;color:#fff;text-decoration:none;font-size:13px;font-weight:900}.raButton.secondary{border:1px solid #bfd0df;background:#fff;color:#173c61}
    .raCommand{display:grid;grid-template-columns:minmax(0,1.4fr) minmax(280px,.6fr);gap:28px;align-items:center;margin-top:22px;padding:26px 30px;border-radius:18px;background:linear-gradient(120deg,#061d3b,#0b3d73);color:#fff;box-shadow:0 16px 38px #061a3515}.raCommand h2{margin:0 0 8px;font-size:24px}.raCommand p{margin:0;color:#d5e3f1;line-height:1.5}.raControl{padding:17px 19px;border:1px solid #ffffff29;border-radius:13px;background:#ffffff10}.raControlTop{display:flex;justify-content:space-between;gap:15px;font-size:12px;font-weight:850}.raControlTop strong{font-size:18px}.raTrack{height:9px;margin-top:11px;overflow:hidden;border-radius:99px;background:#ffffff25}.raTrack i{display:block;height:100%;border-radius:99px;background:#55ded2}
    .raMetrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:13px;margin:15px 0}.raMetric{position:relative;min-height:120px;padding:18px;border:1px solid #d5e2ea;border-top:4px solid #1761e8;border-radius:14px;background:#fff;box-shadow:0 8px 24px #061a3508}.raMetric.red{border-top-color:#cf3832}.raMetric.amber{border-top-color:#db8b00}.raMetric.green{border-top-color:#078c62}.raMetric span,.raMetric strong,.raMetric small{display:block}.raMetric span{color:#647a91;font-size:10px;font-weight:900;letter-spacing:.04em}.raMetric strong{margin:8px 0 4px;font-size:31px}.raMetric small{color:#8293a5;font-size:11px}.raMetric.red strong{color:#c7352e}.raMetric.amber strong{color:#cf7900}.raMetric.green strong{color:#078b61}
    .raControls{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:14px;align-items:center;padding:14px;border:1px solid #d5e2ea;border-radius:14px;background:#fff}.raViews{display:flex;gap:7px;flex-wrap:wrap}.raViews a{display:flex;gap:7px;align-items:center;padding:9px 12px;border-radius:8px;color:#4d667f;text-decoration:none;font-size:12px;font-weight:850}.raViews a b{display:grid;place-items:center;min-width:22px;height:22px;padding:0 6px;border-radius:99px;background:#edf3f8;color:#607890;font-size:10px}.raViews a.active{background:#0b5eaa;color:#fff}.raViews a.active b{background:#ffffff26;color:#fff}.raSearch{display:flex;gap:8px}.raSearch input{width:250px;min-height:38px;padding:9px 12px;border:1px solid #ccd9e4;border-radius:8px;color:#173b59;font:inherit}.raSearch button{padding:9px 13px;border:0;border-radius:8px;background:#173c61;color:#fff;font-weight:850;cursor:pointer}.raClear{display:grid;place-items:center;padding:0 8px;color:#1761e8;text-decoration:none;font-weight:900}
    .raPanel{margin-top:15px;padding:22px;border:1px solid #d5e2ea;border-radius:16px;background:#fff;box-shadow:0 10px 28px #061a3508}.raPanelHead{display:flex;justify-content:space-between;gap:15px;align-items:flex-end;margin-bottom:16px}.raPanelHead h2{margin:0;font-size:21px}.raPanelHead p{margin:5px 0 0;color:#6c8197;font-size:13px}.raCount{color:#087f6c;font-size:13px;font-weight:900}.raTableHead,.raRow{display:grid;grid-template-columns:minmax(260px,1.5fr) minmax(150px,.8fr) minmax(120px,.6fr) minmax(150px,.8fr) minmax(155px,.75fr) auto;gap:14px;align-items:center}.raTableHead{padding:10px 15px;border-radius:8px;background:#edf3f8;color:#688096;font-size:10px;font-weight:900;letter-spacing:.04em}.raRows{display:grid}.raRow{padding:16px 15px;border-bottom:1px solid #e2eaf0;color:#153852;text-decoration:none;transition:background .15s ease}.raRow:last-child{border-bottom:0}.raRow:hover{background:#f4fbf9}.raRow strong,.raRow small{display:block}.raRow small{margin-top:4px;color:#778b9e;font-size:11px;line-height:1.35}.raTitle{font-size:14px}.raPill{display:inline-flex!important;width:max-content;padding:6px 9px;border-radius:999px;background:#e8f2ff;color:#175cae;font-size:10px!important;font-weight:850}.raReviewFlag{color:#c67300!important;font-weight:850}.raOverdue{color:#c7352e!important;font-weight:850}.raRiskBox{display:grid;grid-template-columns:46px 1fr;gap:9px;align-items:center}.raScore{display:grid!important;place-items:center;width:46px;height:46px;margin:0!important;border-radius:10px;background:#edf2f5;color:#53687a;font-size:18px!important}.raScore.acceptable{background:#dff5ec;color:#087354}.raScore.adequate{background:#fff0bd;color:#725000}.raScore.inadequate{background:#ffe0d3;color:#a8401d}.raScore.unacceptable{background:#ffe0de;color:#ae2c27}.raOpen{color:#087f6c;font-size:12px;font-weight:950;white-space:nowrap}.raEmpty{padding:44px 24px;text-align:center;border-radius:12px;background:#f2f6f9;color:#64798f}.raEmpty strong{display:block;margin-bottom:8px;color:#173b57;font-size:17px}.raEmpty a{display:inline-block;margin-top:16px;color:#087f6c;font-weight:900}
    @media(max-width:1200px){.raMetrics{grid-template-columns:1fr 1fr}.raControls{grid-template-columns:1fr}.raSearch input{width:min(100%,360px)}.raTableHead,.raRow{grid-template-columns:minmax(240px,1.3fr) minmax(140px,.7fr) minmax(135px,.7fr) minmax(150px,.7fr) auto}.raTableHead>:nth-child(3),.raRow>:nth-child(3){display:none}}@media(max-width:850px){.raCommand{grid-template-columns:1fr}.raTableHead{display:none}.raRow{grid-template-columns:1fr auto}.raRow>:nth-child(2),.raRow>:nth-child(4),.raRow>:nth-child(5){display:none}.raPanel{padding:15px}}@media(max-width:560px){.raPage{padding:22px 12px 75px}.raTop h1{font-size:28px}.raMetrics{grid-template-columns:1fr 1fr}.raMetric{min-height:105px;padding:14px}.raControls{padding:10px}.raSearch{width:100%}.raSearch input{min-width:0;width:100%}.raViews a{padding:8px}.raCommand{padding:22px}.raPanelHead{align-items:flex-start}.raCount{white-space:nowrap}}
  `}</style><div className="raShell">
    <header className="raTop"><div><small>H&amp;S HUB · CONTROLLED REGISTER</small><h1>Risk Assessment Register</h1><p>See every assessment, its residual-risk position, outstanding controls and review status from one governed register.</p></div><div className="raActions"><Link className="raButton secondary" href="/portal/health-safety/management-board">Management Board</Link><Link className="raButton" href={`${REGISTER_PATH}/new`}>New risk assessment</Link></div></header>
    <section className="raCommand"><div><h2>Visibility from hazard identification to verified control</h2><p>Prioritise elevated residual risks, overdue actions and assessments requiring review—not simply the number of records completed.</p></div><div className="raControl"><div className="raControlTop"><span>Controlled assessment position</span><strong>{controlRate}%</strong></div><div className="raTrack"><i style={{width:`${controlRate}%`}}/></div></div></section>
    <section className="raMetrics"><div className="raMetric"><span>TOTAL ASSESSMENTS</span><strong>{enriched.length}</strong><small>{viewCounts.active} currently active</small></div><div className="raMetric red"><span>ELEVATED RESIDUAL RISK</span><strong>{elevatedCount}</strong><small>Assessments requiring attention</small></div><div className="raMetric amber"><span>OVERDUE ACTIONS</span><strong>{overdueActionCount}</strong><small>Target date has passed</small></div><div className="raMetric green"><span>REVIEWS DUE</span><strong>{reviewDueCount}</strong><small>{controlledCount} approved or communicated</small></div></section>
    <section className="raControls"><nav className="raViews" aria-label="Risk assessment register views">{views.map(([key,title]) => <Link className={view === key ? "active" : ""} href={viewHref(key,search)} key={key}>{title}<b>{viewCounts[key]}</b></Link>)}</nav><form className="raSearch" method="get">{view !== "all" ? <input name="view" type="hidden" value={view}/> : null}<input aria-label="Search assessments" defaultValue={search} name="q" placeholder="Search reference, title, site or assessor"/><button type="submit">Search</button>{search ? <Link className="raClear" href={viewHref(view,"")} aria-label="Clear search">×</Link> : null}</form></section>
    <section className="raPanel"><div className="raPanelHead"><div><h2>{label(view)} assessments</h2><p>Residual risk and action status are calculated from each live controlled record.</p></div><span className="raCount">{filtered.length} record{filtered.length === 1 ? "" : "s"}</span></div>{filtered.length ? <><div className="raTableHead"><span>Assessment</span><span>Location and owner</span><span>Status</span><span>Residual risk</span><span>Actions and review</span><span>Record</span></div><div className="raRows">{filtered.map((item) => { const tone = riskBand(item.stats.highest); return <Link className="raRow" href={`${REGISTER_PATH}/${item.id}`} key={item.id}><div><strong className="raTitle">{item.title}</strong><small>{item.assessment_reference} · Version {item.version} · {label(item.assessment_type)}</small></div><div><strong>{item.site_location || item.area_department || "Location not set"}</strong><small>{item.assessor_name || "Assessor not recorded"}</small></div><div><span className="raPill">{label(item.status)}</span><small>Assessed {formatDate(item.assessment_date)}</small></div><div className="raRiskBox"><strong className={`raScore ${tone}`}>{item.stats.highest || "—"}</strong><small>{label(tone)}<br/>{item.stats.elevated} elevated · {item.stats.hazards} hazards</small></div><div><strong className={item.stats.overdue ? "raOverdue" : ""}>{item.stats.openActions} open · {item.stats.overdue} overdue</strong><small className={item.reviewDue ? "raReviewFlag" : ""}>{item.reviewDue ? "Review required now" : `Review ${formatDate(item.review_date)}`}</small></div><b className="raOpen">Open →</b></Link>; })}</div></> : <div className="raEmpty"><strong>No assessments found in this view</strong>{search ? "Clear the search or select another controlled view." : "Create an assessment or select another controlled view."}<br/><Link href={`${REGISTER_PATH}/new`}>Create a new risk assessment →</Link></div>}</section>
  </div></main>;
}
