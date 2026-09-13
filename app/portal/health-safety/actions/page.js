import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "../../../../lib/supabase/server";

export const metadata = { title: "Risk Actions & Verification | RPG Excellence" };
export const dynamic = "force-dynamic";

const ACTIONS_PATH = "/portal/health-safety/actions";
const ASSESSMENTS_PATH = "/portal/health-safety/risk-assessment";
const openStatuses = ["open", "accepted", "in_progress", "evidence_submitted", "verification", "partly_effective", "not_effective"];
const verificationStatuses = ["evidence_submitted", "verification"];
const label = (value) => String(value || "open").replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
const formatDate = (value) => value ? new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value)) : "—";
const riskBand = (score) => score >= 15 ? "unacceptable" : score >= 10 ? "inadequate" : score >= 5 ? "adequate" : score > 0 ? "acceptable" : "unrated";

function viewHref(view, search) {
  const params = new URLSearchParams();
  if (view !== "all") params.set("view", view);
  if (search) params.set("q", search);
  const query = params.toString();
  return query ? `${ACTIONS_PATH}?${query}` : ACTIONS_PATH;
}

export default async function RiskActionsRegisterPage({ searchParams }) {
  const query = await searchParams;
  const validViews = ["all", "open", "overdue", "verification", "elevated", "effective"];
  const view = validViews.includes(query?.view) ? query.view : "all";
  const search = String(query?.q || "").trim();
  const searchLower = search.toLowerCase();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/portal/login?next=${ACTIONS_PATH}`);

  const [actionsResult, assessmentsResult, hazardsResult] = await Promise.all([
    supabase.from("hs_risk_actions").select("*").eq("owner_id", user.id).order("target_date"),
    supabase.from("hs_risk_assessments").select("id,assessment_reference,title,site_location,area_department,status").eq("owner_id", user.id),
    supabase.from("hs_risk_hazards").select("id,hazard_category,hazard_description,residual_score,residual_band").eq("owner_id", user.id),
  ]);
  for (const result of [actionsResult, assessmentsResult, hazardsResult]) if (result.error) throw new Error(result.error.message);

  const actions = actionsResult.data || [];
  const assessmentMap = new Map((assessmentsResult.data || []).map((item) => [item.id, item]));
  const hazardMap = new Map((hazardsResult.data || []).map((item) => [item.id, item]));
  const today = new Date().toISOString().slice(0, 10);
  const enriched = actions.map((action) => {
    const assessment = assessmentMap.get(action.assessment_id);
    const hazard = hazardMap.get(action.hazard_id);
    const residualScore = hazard?.residual_score || 0;
    return {
      ...action,
      assessment,
      hazard,
      residualScore,
      overdue: Boolean(openStatuses.includes(action.status) && action.target_date && action.target_date < today),
      awaitingVerification: verificationStatuses.includes(action.status),
      verifiedEffective: action.status === "effective" || action.effectiveness_result === "effective_verified",
    };
  });
  const matchesView = (item, selectedView) => {
    if (selectedView === "open") return openStatuses.includes(item.status);
    if (selectedView === "overdue") return item.overdue;
    if (selectedView === "verification") return item.awaitingVerification;
    if (selectedView === "elevated") return item.residualScore >= 10 && openStatuses.includes(item.status);
    if (selectedView === "effective") return item.verifiedEffective;
    return true;
  };
  const viewCounts = Object.fromEntries(validViews.map((key) => [key, enriched.filter((item) => matchesView(item, key)).length]));
  const filtered = enriched.filter((item) => matchesView(item, view) && (!searchLower || [item.action_reference, item.action_required, item.responsible_name, item.responsible_email, item.assessment?.title, item.assessment?.assessment_reference, item.assessment?.site_location, item.hazard?.hazard_category].some((value) => String(value || "").toLowerCase().includes(searchLower))));
  const open = enriched.filter((item) => openStatuses.includes(item.status));
  const overdue = enriched.filter((item) => item.overdue);
  const verification = enriched.filter((item) => item.awaitingVerification);
  const elevated = enriched.filter((item) => item.residualScore >= 10 && openStatuses.includes(item.status));
  const effective = enriched.filter((item) => item.verifiedEffective);
  const closureRate = actions.length ? Math.round(effective.length / actions.length * 100) : 0;
  const views = [["all", "All actions"], ["open", "Open"], ["overdue", "Overdue"], ["verification", "Awaiting verification"], ["elevated", "Elevated risk"], ["effective", "Verified effective"]];

  return <main className="harPage"><style>{`
    .harPage{min-height:100vh;padding:30px clamp(18px,3vw,46px) 80px;background:#edf3fa;color:#071d3a;font-family:Arial,sans-serif}.harShell{max-width:1500px;margin:auto}.harTop{display:flex;justify-content:space-between;gap:24px;align-items:flex-start;flex-wrap:wrap}.harTop small{color:#087f6c;font-size:11px;font-weight:950;letter-spacing:.12em}.harTop h1{margin:7px 0 6px;font-size:34px;letter-spacing:-.035em}.harTop p{max-width:760px;margin:0;color:#607890;line-height:1.5}.harButtons{display:flex;gap:10px;flex-wrap:wrap}.harButton{display:inline-flex;align-items:center;justify-content:center;min-height:42px;padding:11px 16px;border:1px solid #bfd0df;border-radius:10px;background:#fff;color:#173c61;text-decoration:none;font-size:13px;font-weight:900}.harButton.primary{border-color:#087f6c;background:#087f6c;color:#fff}
    .harCommand{display:grid;grid-template-columns:minmax(0,1.45fr) minmax(290px,.55fr);gap:28px;align-items:center;margin-top:22px;padding:26px 30px;border-radius:18px;background:linear-gradient(120deg,#061d3b,#0b3d73);color:#fff;box-shadow:0 16px 38px #061a3515}.harCommand h2{margin:0 0 8px;font-size:24px}.harCommand p{margin:0;color:#d5e3f1;line-height:1.5}.harProgress{padding:17px 19px;border:1px solid #ffffff29;border-radius:13px;background:#ffffff10}.harProgressTop{display:flex;justify-content:space-between;gap:15px;font-size:12px;font-weight:850}.harProgressTop strong{font-size:18px}.harTrack{height:9px;margin-top:11px;overflow:hidden;border-radius:99px;background:#ffffff25}.harTrack i{display:block;height:100%;border-radius:99px;background:#55ded2}
    .harLifecycle{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:15px 0}.harStage{position:relative;padding:15px;border:1px solid #d5e2ea;border-radius:12px;background:#fff}.harStage:after{content:"›";position:absolute;right:-8px;top:24px;z-index:2;color:#6f91ac;font-size:22px;font-weight:950}.harStage:last-child:after{display:none}.harStage b,.harStage span{display:block}.harStage b{color:#1761e8;font-size:11px}.harStage span{margin-top:5px;font-size:12px;font-weight:850}
    .harMetrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:13px;margin:0 0 15px}.harMetric{min-height:116px;padding:18px;border:1px solid #d5e2ea;border-top:4px solid #1761e8;border-radius:14px;background:#fff;box-shadow:0 8px 24px #061a3508}.harMetric.red{border-top-color:#cf3832}.harMetric.amber{border-top-color:#db8b00}.harMetric.green{border-top-color:#078c62}.harMetric span,.harMetric strong,.harMetric small{display:block}.harMetric span{color:#647a91;font-size:10px;font-weight:900;letter-spacing:.04em}.harMetric strong{margin:8px 0 4px;font-size:31px}.harMetric small{color:#8293a5;font-size:11px}.harMetric.red strong{color:#c7352e}.harMetric.amber strong{color:#cf7900}.harMetric.green strong{color:#078b61}
    .harControls{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:14px;align-items:center;padding:14px;border:1px solid #d5e2ea;border-radius:14px;background:#fff}.harViews{display:flex;gap:7px;flex-wrap:wrap}.harViews a{display:flex;gap:7px;align-items:center;padding:9px 12px;border-radius:8px;color:#4d667f;text-decoration:none;font-size:12px;font-weight:850}.harViews a b{display:grid;place-items:center;min-width:22px;height:22px;padding:0 6px;border-radius:99px;background:#edf3f8;color:#607890;font-size:10px}.harViews a.active{background:#0b5eaa;color:#fff}.harViews a.active b{background:#ffffff26;color:#fff}.harSearch{display:flex;gap:8px}.harSearch input{width:250px;min-height:38px;padding:9px 12px;border:1px solid #ccd9e4;border-radius:8px;color:#173b59;font:inherit}.harSearch button{padding:9px 13px;border:0;border-radius:8px;background:#173c61;color:#fff;font-weight:850;cursor:pointer}.harClear{display:grid;place-items:center;padding:0 8px;color:#1761e8;text-decoration:none;font-weight:900}
    .harPanel{margin-top:15px;padding:22px;border:1px solid #d5e2ea;border-radius:16px;background:#fff;box-shadow:0 10px 28px #061a3508}.harHead{display:flex;justify-content:space-between;gap:15px;align-items:flex-end;margin-bottom:16px}.harHead h2{margin:0;font-size:21px}.harHead p{margin:5px 0 0;color:#6c8197;font-size:13px}.harCount{color:#087f6c;font-size:13px;font-weight:900}.harTableHead,.harRow{display:grid;grid-template-columns:minmax(250px,1.4fr) minmax(190px,1fr) minmax(145px,.7fr) minmax(145px,.65fr) minmax(155px,.7fr) auto;gap:14px;align-items:center}.harTableHead{padding:10px 15px;border-radius:8px;background:#edf3f8;color:#688096;font-size:10px;font-weight:900;letter-spacing:.04em}.harRows{display:grid}.harRow{padding:16px 15px;border-bottom:1px solid #e2eaf0;color:#153852;text-decoration:none;transition:background .15s ease}.harRow:last-child{border-bottom:0}.harRow:hover{background:#f4fbf9}.harRow strong,.harRow small{display:block}.harRow small{margin-top:4px;color:#778b9e;font-size:11px;line-height:1.35}.harTitle{font-size:14px}.harStatus{display:inline-flex!important;width:max-content;padding:6px 9px;border-radius:999px;background:#e8f2ff;color:#175cae;font-size:10px!important;font-weight:850}.harStatus.effective{background:#dff5ec;color:#087354}.harStatus.overdue{background:#ffe0de;color:#ae2c27}.harStatus.verification{background:#fff0bd;color:#725000}.harRisk{display:grid;grid-template-columns:43px 1fr;gap:9px;align-items:center}.harScore{display:grid!important;place-items:center;width:43px;height:43px;margin:0!important;border-radius:9px;background:#edf2f5;color:#53687a;font-size:17px!important}.harScore.acceptable{background:#dff5ec;color:#087354}.harScore.adequate{background:#fff0bd;color:#725000}.harScore.inadequate{background:#ffe0d3;color:#a8401d}.harScore.unacceptable{background:#ffe0de;color:#ae2c27}.harLate{color:#c7352e}.harOpen{color:#087f6c;font-size:12px;font-weight:950;white-space:nowrap}.harEmpty{padding:44px 24px;text-align:center;border-radius:12px;background:#f2f6f9;color:#64798f}.harEmpty strong{display:block;margin-bottom:8px;color:#173b57;font-size:17px}.harEmpty a{display:inline-block;margin-top:16px;color:#087f6c;font-weight:900}
    @media(max-width:1250px){.harMetrics{grid-template-columns:1fr 1fr}.harControls{grid-template-columns:1fr}.harTableHead,.harRow{grid-template-columns:minmax(230px,1.2fr) minmax(180px,.9fr) minmax(140px,.7fr) minmax(145px,.7fr) auto}.harTableHead>:nth-child(4),.harRow>:nth-child(4){display:none}}@media(max-width:850px){.harCommand{grid-template-columns:1fr}.harTableHead{display:none}.harRow{grid-template-columns:1fr auto}.harRow>:nth-child(2),.harRow>:nth-child(3),.harRow>:nth-child(5){display:none}.harPanel{padding:15px}.harLifecycle{grid-template-columns:1fr 1fr}.harStage:after{display:none}}@media(max-width:560px){.harPage{padding:22px 12px 75px}.harTop h1{font-size:28px}.harMetrics{grid-template-columns:1fr 1fr}.harMetric{min-height:105px;padding:14px}.harControls{padding:10px}.harSearch{width:100%}.harSearch input{min-width:0;width:100%}.harViews a{padding:8px}.harCommand{padding:22px}.harLifecycle{grid-template-columns:1fr}.harHead{align-items:flex-start}.harCount{white-space:nowrap}}
  `}</style><div className="harShell">
    <header className="harTop"><div><small>H&amp;S HUB · ACTION CONTROL</small><h1>Risk Actions &amp; Verification</h1><p>Control every additional measure from assignment and implementation through objective evidence and verified effectiveness.</p></div><div className="harButtons"><Link className="harButton" href={ASSESSMENTS_PATH}>Risk Assessment Register</Link><Link className="harButton primary" href="/portal/health-safety/management-board">Management Board</Link></div></header>
    <section className="harCommand"><div><h2>An action is not closed simply because work was completed</h2><p>Completion evidence must demonstrate implementation. Verification must then confirm that the control works in practice and manages the originating risk as intended.</p></div><div className="harProgress"><div className="harProgressTop"><span>Verified effectiveness</span><strong>{closureRate}%</strong></div><div className="harTrack"><i style={{width:`${closureRate}%`}}/></div></div></section>
    <section className="harLifecycle">{[["01","Assign","Owner and target"],["02","Implement","Control delivered"],["03","Evidence","Completion submitted"],["04","Verify","Effectiveness confirmed"]].map(([number,title,detail]) => <div className="harStage" key={number}><b>{number} · {title}</b><span>{detail}</span></div>)}</section>
    <section className="harMetrics"><div className="harMetric"><span>OPEN ACTIONS</span><strong>{open.length}</strong><small>Controls not yet verified</small></div><div className="harMetric red"><span>OVERDUE</span><strong>{overdue.length}</strong><small>Target date has passed</small></div><div className="harMetric amber"><span>AWAITING VERIFICATION</span><strong>{verification.length}</strong><small>Evidence ready for review</small></div><div className="harMetric green"><span>VERIFIED EFFECTIVE</span><strong>{effective.length}</strong><small>{elevated.length} open on elevated risks</small></div></section>
    <section className="harControls"><nav className="harViews" aria-label="Action register views">{views.map(([key,title]) => <Link className={view === key ? "active" : ""} href={viewHref(key,search)} key={key}>{title}<b>{viewCounts[key]}</b></Link>)}</nav><form className="harSearch" method="get">{view !== "all" ? <input name="view" type="hidden" value={view}/> : null}<input aria-label="Search actions" defaultValue={search} name="q" placeholder="Search action, owner, site or assessment"/><button type="submit">Search</button>{search ? <Link className="harClear" href={viewHref(view,"")} aria-label="Clear search">×</Link> : null}</form></section>
    <section className="harPanel"><div className="harHead"><div><h2>{label(view)} actions</h2><p>Each action remains traceable to its originating assessment, hazard and residual-risk decision.</p></div><span className="harCount">{filtered.length} action{filtered.length === 1 ? "" : "s"}</span></div>{filtered.length ? <><div className="harTableHead"><span>Required control</span><span>Source assessment</span><span>Owner and target</span><span>Residual risk</span><span>Control position</span><span>Record</span></div><div className="harRows">{filtered.map((item) => { const tone = riskBand(item.residualScore); const statusTone = item.overdue ? "overdue" : item.verifiedEffective ? "effective" : item.awaitingVerification ? "verification" : ""; return <Link className="harRow" href={`${ACTIONS_PATH}/${item.id}`} key={item.id}><div><strong className="harTitle">{item.action_required}</strong><small>{item.action_reference} · {item.hazard?.hazard_category || "General action"} · {label(item.priority)} priority</small></div><div><strong>{item.assessment?.title || "Risk assessment"}</strong><small>{item.assessment?.assessment_reference || "—"} · {item.assessment?.site_location || item.assessment?.area_department || "Location not set"}</small></div><div><strong>{item.responsible_name || "Owner not assigned"}</strong><small className={item.overdue ? "harLate" : ""}>{item.overdue ? "Overdue · " : "Target · "}{formatDate(item.target_date)}</small></div><div className="harRisk"><strong className={`harScore ${tone}`}>{item.residualScore || "—"}</strong><small>{label(tone)}<br/>Originating exposure</small></div><div><span className={`harStatus ${statusTone}`}>{item.overdue ? "Overdue" : label(item.status)}</span><small>{item.verifiedEffective ? `Verified ${formatDate(item.verified_at)}` : item.awaitingVerification ? "Evidence awaiting decision" : "Verification not complete"}</small></div><b className="harOpen">Open →</b></Link>; })}</div></> : <div className="harEmpty"><strong>No actions found in this view</strong>{search ? "Clear the search or select another action view." : "Actions created through risk assessments will appear here automatically."}<br/><Link href={ASSESSMENTS_PATH}>Open the Risk Assessment Register →</Link></div>}</section>
  </div></main>;
}
