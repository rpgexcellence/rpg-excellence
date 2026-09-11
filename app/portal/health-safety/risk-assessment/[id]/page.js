import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "../../../../../lib/supabase/server";
import HealthSafetyRiskAssessmentEditor from "../../../../../components/HealthSafetyRiskAssessmentEditor";

export const metadata = { title: "Risk Assessment Workspace | RPG Excellence" };
export const dynamic = "force-dynamic";

const formatDate = (value) => value ? new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value)) : "—";
const label = (value) => String(value || "draft").replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

async function addHazard(formData) {
  "use server";
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/portal/login");
  const assessmentId = String(formData.get("assessment_id") || "");
  const { data: assessment, error: assessmentError } = await supabase.from("hs_risk_assessments").select("id,organization_id,status").eq("id", assessmentId).eq("owner_id", user.id).single();
  if (assessmentError || !assessment) throw new Error("Risk assessment could not be accessed.");
  if (["approved", "communicated", "superseded", "archived"].includes(assessment.status)) throw new Error("This controlled version is locked. Create or reopen a review version before changing hazards.");

  const text = (name) => String(formData.get(name) || "").trim();
  const number = (name) => Number(formData.get(name));
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
  const actionRequired = text("action_required");
  if (![currentSeverity, currentLikelihood, residualSeverity, residualLikelihood].every((value) => value >= 1 && value <= 5)) throw new Error("Complete all four risk-score selections.");
  if (residualScore > currentScore) throw new Error("Residual risk cannot exceed initial risk. Reassess the scores before saving.");
  if (!controls.length && text("additional_controls")) throw new Error("Select the hierarchy level applied to the additional controls.");
  if (decision === "accept" && (!rationale || !authority)) throw new Error("Formal risk acceptance requires a rationale and named authority.");
  if (residualScore >= 10 && (!decision || !authority || !actionRequired)) throw new Error("Elevated residual risk requires a controlled decision, authority and accountable action.");
  if (actionRequired && (!text("responsible_name") || !text("target_date"))) throw new Error("Every controlled action requires a responsible person and target date.");

  const { count, error: countError } = await supabase.from("hs_risk_hazards").select("id", { count: "exact", head: true }).eq("assessment_id", assessmentId);
  if (countError) throw new Error(countError.message);
  const { data: hazard, error: hazardError } = await supabase.from("hs_risk_hazards").insert({
    assessment_id: assessmentId, owner_id: user.id, organization_id: assessment.organization_id,
    display_order: (count || 0) + 1, hazard_category: text("hazard_category"),
    hazard_type: text("hazard_type") || null, hazard_description: text("hazard_description"),
    people_exposed: text("people_exposed"), harm_description: text("harm_description"),
    existing_controls: text("existing_controls"), current_severity: currentSeverity,
    current_likelihood: currentLikelihood, additional_controls: text("additional_controls"),
    control_hierarchy: controls, residual_severity: residualSeverity,
    residual_likelihood: residualLikelihood, risk_decision: decision,
    acceptance_rationale: rationale || null, acceptance_authority: authority || null,
    accepted_at: decision === "accept" ? new Date().toISOString() : null,
  }).select("id").single();
  if (hazardError) throw new Error(hazardError.message);

  if (actionRequired) {
    const { count: actionCount } = await supabase.from("hs_risk_actions").select("id", { count: "exact", head: true }).eq("assessment_id", assessmentId);
    const reference = "ACT-" + String((actionCount || 0) + 1).padStart(3, "0");
    const { error: actionError } = await supabase.from("hs_risk_actions").insert({
      assessment_id: assessmentId, hazard_id: hazard.id, owner_id: user.id,
      organization_id: assessment.organization_id, action_reference: reference,
      action_required: actionRequired, responsible_name: text("responsible_name"),
      responsible_email: text("responsible_email") || null, target_date: text("target_date"),
      priority: text("priority") || (residualScore >= 15 ? "critical" : residualScore >= 10 ? "high" : "medium"),
      interim_controls: text("additional_controls") || null,
    });
    if (actionError) {
      await supabase.from("hs_risk_hazards").delete().eq("id", hazard.id);
      throw new Error(actionError.message);
    }
  }
  await supabase.from("hs_risk_events").insert({
    assessment_id: assessmentId, owner_id: user.id, organization_id: assessment.organization_id,
    actor_id: user.id, event_type: "hazard_added",
    event_summary: "Hazard and risk decision recorded",
    event_data: { hazard_id: hazard.id, current_score: currentScore, residual_score: residualScore },
  });
  revalidatePath("/portal/health-safety/risk-assessments/" + assessmentId);
}

export default async function RiskAssessmentWorkspacePage({ params }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/portal/login?next=/portal/health-safety/risk-assessments/" + id);
  const [assessmentResult, hazardsResult, actionsResult] = await Promise.all([
    supabase.from("hs_risk_assessments").select("*").eq("id", id).eq("owner_id", user.id).maybeSingle(),
    supabase.from("hs_risk_hazards").select("*").eq("assessment_id", id).eq("owner_id", user.id).order("display_order"),
    supabase.from("hs_risk_actions").select("*").eq("assessment_id", id).eq("owner_id", user.id).order("target_date"),
  ]);
  if (assessmentResult.error || hazardsResult.error || actionsResult.error) throw new Error(assessmentResult.error?.message || hazardsResult.error?.message || actionsResult.error?.message);
  if (!assessmentResult.data) notFound();
  const assessment = assessmentResult.data;
  const hazards = hazardsResult.data || [];
  const actions = actionsResult.data || [];
  const elevated = hazards.filter((item) => (item.residual_score ?? item.current_score ?? 0) >= 10).length;
  const highest = hazards.reduce((maximum, item) => Math.max(maximum, item.residual_score ?? item.current_score ?? 0), 0);
  const openActions = actions.filter((item) => !["effective", "cancelled"].includes(item.status));

  return <main className="rawPage"><style>{`
    *{box-sizing:border-box}.rawPage{min-height:100vh;padding:32px 22px 90px;background:#edf4f8;color:#071d3a;font-family:Arial,sans-serif}.rawShell{max-width:1280px;margin:auto}.rawTop{display:flex;justify-content:space-between;gap:20px;align-items:flex-start;flex-wrap:wrap}.rawTop small{color:#087f6c;font-weight:900;letter-spacing:.1em}.rawTop h1{font-size:34px;margin:7px 0}.rawTop p{margin:0;color:#657b93}.rawButtons{display:flex;gap:9px;flex-wrap:wrap}.rawButton{padding:11px 15px;border-radius:9px;background:#087f6c;color:#fff;text-decoration:none;font-weight:850}.rawButton.secondary{background:#fff;color:#173b59;border:1px solid #cbd8e4}.rawSummary{display:grid;grid-template-columns:1.4fr repeat(4,.55fr);gap:12px;margin:23px 0}.rawContext,.rawMetric{padding:18px;border:1px solid #d7e3eb;border-radius:13px;background:#fff}.rawContext strong,.rawContext small,.rawMetric strong,.rawMetric span{display:block}.rawContext small{color:#72869a;margin-top:5px}.rawMetric span{font-size:11px;color:#657b91;font-weight:850}.rawMetric strong{font-size:27px;margin-top:7px}.rawMetric .red{color:#c6352e}.rawPanel{padding:23px;border:1px solid #d7e3eb;border-radius:16px;background:#fff;margin-top:15px}.rawHead{display:flex;justify-content:space-between;gap:15px;align-items:end;margin-bottom:17px}.rawHead h2{margin:0}.rawHead p{margin:5px 0 0;color:#6c8197}.rawPill{padding:7px 10px;border-radius:999px;background:#e7f4ff;color:#145ba9;font-size:11px;font-weight:900}.rawDetails{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}.rawDetails div{padding:12px;border-radius:10px;background:#f3f7fa}.rawDetails span,.rawDetails strong{display:block}.rawDetails span{font-size:10px;color:#74889b;font-weight:850}.rawDetails strong{margin-top:5px;font-size:13px}.rawActions{display:grid;gap:8px}.rawAction{display:grid;grid-template-columns:1.4fr .7fr .6fr .55fr;gap:13px;padding:14px;border:1px solid #e0e8ee;border-radius:10px}.rawAction strong,.rawAction small{display:block}.rawAction small{color:#788b9e;margin-top:4px}.rawEmpty{padding:20px;border-radius:10px;background:#f2f6f9;color:#657b91}@media(max-width:900px){.rawSummary{grid-template-columns:1fr 1fr}.rawContext{grid-column:1/-1}.rawDetails{grid-template-columns:1fr 1fr}.rawAction{grid-template-columns:1fr auto}.rawAction>:nth-child(2),.rawAction>:nth-child(3){display:none}}@media(max-width:520px){.rawSummary,.rawDetails{grid-template-columns:1fr}.rawContext{grid-column:auto}}
  `}</style><div className="rawShell">
    <header className="rawTop"><div><small>{assessment.assessment_reference} · VERSION {assessment.version}</small><h1>{assessment.title}</h1><p>{label(assessment.assessment_type)} · {assessment.site_location || assessment.area_department || "Location not set"}</p></div><div className="rawButtons"><Link className="rawButton secondary" href="/portal/health-safety/risk-assessments">← Register</Link><Link className="rawButton secondary" href="/portal/health-safety">H&amp;S Hub</Link><Link className="rawButton" href={"/portal/health-safety/risk-assessments/" + id + "/review"}>Review &amp; approval</Link></div></header>
    <section className="rawSummary"><div className="rawContext"><strong>{assessment.task_description}</strong><small>Assessed by {assessment.assessor_name || "Not assigned"} on {formatDate(assessment.assessment_date)} · review {formatDate(assessment.review_date)}</small></div><div className="rawMetric"><span>HAZARDS</span><strong>{hazards.length}</strong></div><div className="rawMetric"><span>HIGHEST RESIDUAL</span><strong className={highest >= 10 ? "red" : ""}>{highest || "—"}</strong></div><div className="rawMetric"><span>ELEVATED</span><strong className={elevated ? "red" : ""}>{elevated}</strong></div><div className="rawMetric"><span>OPEN ACTIONS</span><strong>{openActions.length}</strong></div></section>
    <section className="rawPanel"><div className="rawHead"><div><h2>Assessment context</h2><p>Scope, people and supporting arrangements.</p></div><span className="rawPill">{label(assessment.status)}</span></div><div className="rawDetails"><div><span>AREA / DEPARTMENT</span><strong>{assessment.area_department || "—"}</strong></div><div><span>SECTION / LAB</span><strong>{assessment.section_lab || "—"}</strong></div><div><span>PEOPLE AT RISK</span><strong>{assessment.persons_at_risk?.join(", ") || "—"}</strong></div><div><span>COMPETENCE BASIS</span><strong>{assessment.assessor_competence_basis || "—"}</strong></div><div><span>SAFE SYSTEM</span><strong>{assessment.safe_system_reference || "—"}</strong></div><div><span>COSHH / MSDS</span><strong>{assessment.coshh_msds_reference || "—"}</strong></div><div><span>PERMIT</span><strong>{assessment.permit_required ? assessment.permit_reference : "Not required"}</strong></div><div><span>CONSULTATION</span><strong>{assessment.consultation_summary || "—"}</strong></div></div></section>
    <section className="rawPanel"><div className="rawHead"><div><h2>Hazards and risk decisions</h2><p>Evaluate initial risk, apply controls and confirm the residual position.</p></div></div><HealthSafetyRiskAssessmentEditor assessmentId={id} hazards={hazards} addHazardAction={addHazard}/></section>
    <section className="rawPanel"><div className="rawHead"><div><h2>Risk-reduction actions</h2><p>Accountable actions linked directly to identified hazards.</p></div><Link href="/portal/health-safety/actions">Action register →</Link></div>{actions.length ? <div className="rawActions">{actions.map((action) => <div className="rawAction" key={action.id}><div><strong>{action.action_required}</strong><small>{action.action_reference}</small></div><div><strong>{action.responsible_name}</strong><small>Responsible person</small></div><div><strong>{formatDate(action.target_date)}</strong><small>{label(action.priority)} priority</small></div><span className="rawPill">{label(action.status)}</span></div>)}</div> : <div className="rawEmpty">No additional risk-reduction actions have been recorded.</div>}</section>
  </div></main>;
}
