import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "../../../../../../lib/supabase/server";

export const metadata = { title: "Risk Assessment Review & Approval | RPG Excellence" };
export const dynamic = "force-dynamic";

const formatDate = (value) => value ? new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value)) : "—";
const label = (value) => String(value || "draft").replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
const openActionStatuses = ["open", "accepted", "in_progress", "evidence_submitted", "verification", "partly_effective", "not_effective"];

async function getControlledRecord(supabase, userId, assessmentId) {
  const [assessmentResult, hazardsResult, actionsResult] = await Promise.all([
    supabase.from("hs_risk_assessments").select("*").eq("id", assessmentId).eq("owner_id", userId).maybeSingle(),
    supabase.from("hs_risk_hazards").select("*").eq("assessment_id", assessmentId).eq("owner_id", userId).order("display_order"),
    supabase.from("hs_risk_actions").select("*").eq("assessment_id", assessmentId).eq("owner_id", userId),
  ]);
  if (assessmentResult.error || hazardsResult.error || actionsResult.error) throw new Error(assessmentResult.error?.message || hazardsResult.error?.message || actionsResult.error?.message);
  return { assessment: assessmentResult.data, hazards: hazardsResult.data || [], actions: actionsResult.data || [] };
}

function validateForApproval(assessment, hazards, actions) {
  const failures = [];
  if (!assessment.task_description || !assessment.assessor_name || !assessment.assessment_date || !assessment.review_date) failures.push("Assessment context, assessor and review dates must be complete.");
  if (!Array.isArray(assessment.persons_at_risk) || !assessment.persons_at_risk.length) failures.push("At least one group of people at risk must be identified.");
  if (!hazards.length) failures.push("At least one significant hazard must be evaluated.");
  if (hazards.some((hazard) => !hazard.current_score || !hazard.residual_score)) failures.push("Every hazard requires complete initial and residual risk scores.");
  if (hazards.some((hazard) => !hazard.existing_controls)) failures.push("Existing controls must be recorded for every hazard.");
  const elevated = hazards.filter((hazard) => (hazard.residual_score || 0) >= 10);
  if (elevated.some((hazard) => !hazard.risk_decision || !hazard.acceptance_authority)) failures.push("Every elevated residual risk requires a controlled decision and named authority.");
  if (elevated.some((hazard) => !actions.some((action) => action.hazard_id === hazard.id && !["cancelled"].includes(action.status)))) failures.push("Every elevated residual risk requires a linked accountable action.");
  if (hazards.some((hazard) => hazard.risk_decision === "accept" && (!hazard.acceptance_rationale || !hazard.acceptance_authority))) failures.push("Formal acceptance requires a documented rationale and named authority.");
  return [...new Set(failures)];
}

async function submitForReview(formData) {
  "use server";
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/portal/login");
  const id = String(formData.get("assessment_id") || "");
  const record = await getControlledRecord(supabase, user.id, id);
  if (!record.assessment) throw new Error("Risk assessment could not be accessed.");
  const failures = validateForApproval(record.assessment, record.hazards, record.actions);
  if (failures.length) throw new Error(failures.join(" "));
  const { error } = await supabase.from("hs_risk_assessments").update({ status: "in_review", submitted_at: new Date().toISOString(), submitted_by: user.id }).eq("id", id).eq("owner_id", user.id);
  if (error) throw new Error(error.message);
  await supabase.from("hs_risk_events").insert({ assessment_id: id, owner_id: user.id, organization_id: record.assessment.organization_id, actor_id: user.id, event_type: "submitted_for_review", event_summary: "Risk assessment submitted for review" });
  revalidatePath("/portal/health-safety/risk-assessments/" + id + "/review");
}

async function recordReviewDecision(formData) {
  "use server";
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/portal/login");
  const id = String(formData.get("assessment_id") || "");
  const decision = String(formData.get("decision") || "");
  const approverName = String(formData.get("approver_name") || "").trim();
  const comment = String(formData.get("approval_comment") || "").trim();
  const record = await getControlledRecord(supabase, user.id, id);
  if (!record.assessment) throw new Error("Risk assessment could not be accessed.");
  if (record.assessment.status !== "in_review") throw new Error("Submit the assessment for review before recording an approval decision.");
  if (!approverName) throw new Error("Enter the name of the competent approver.");
  if (!["approved", "changes_required"].includes(decision)) throw new Error("Select a valid review decision.");
  if (decision === "changes_required" && !comment) throw new Error("Explain the changes required.");
  if (decision === "approved") {
    const failures = validateForApproval(record.assessment, record.hazards, record.actions);
    if (failures.length) throw new Error(failures.join(" "));
  }
  const update = decision === "approved"
    ? { status: "approved", approver_name: approverName, approval_comment: comment || null, approved_by: user.id, approved_at: new Date().toISOString() }
    : { status: "changes_required", approver_name: approverName, approval_comment: comment, approved_by: null, approved_at: null };
  const { error } = await supabase.from("hs_risk_assessments").update(update).eq("id", id).eq("owner_id", user.id);
  if (error) throw new Error(error.message);
  await supabase.from("hs_risk_events").insert({ assessment_id: id, owner_id: user.id, organization_id: record.assessment.organization_id, actor_id: user.id, event_type: decision, event_summary: decision === "approved" ? "Risk assessment approved" : "Changes required following review", event_data: { approver_name: approverName, comment } });
  revalidatePath("/portal/health-safety/risk-assessments/" + id + "/review");
  revalidatePath("/portal/health-safety/risk-assessments/" + id);
}

async function markCommunicated(formData) {
  "use server";
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/portal/login");
  const id = String(formData.get("assessment_id") || "");
  const { data: assessment } = await supabase.from("hs_risk_assessments").select("organization_id,status").eq("id", id).eq("owner_id", user.id).single();
  if (!assessment || assessment.status !== "approved") throw new Error("Only an approved assessment can be marked as communicated.");
  const { error } = await supabase.from("hs_risk_assessments").update({ status: "communicated", communicated_at: new Date().toISOString() }).eq("id", id).eq("owner_id", user.id);
  if (error) throw new Error(error.message);
  await supabase.from("hs_risk_events").insert({ assessment_id: id, owner_id: user.id, organization_id: assessment.organization_id, actor_id: user.id, event_type: "communicated", event_summary: "Approved risk assessment marked as communicated" });
  revalidatePath("/portal/health-safety/risk-assessments/" + id + "/review");
}

export default async function ReviewApprovalPage({ params }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/portal/login?next=/portal/health-safety/risk-assessments/" + id + "/review");
  const record = await getControlledRecord(supabase, user.id, id);
  if (!record.assessment) notFound();
  const { assessment, hazards, actions } = record;
  const failures = validateForApproval(assessment, hazards, actions);
  const elevated = hazards.filter((hazard) => (hazard.residual_score || 0) >= 10);
  const overdue = actions.filter((action) => openActionStatuses.includes(action.status) && action.target_date < new Date().toISOString().slice(0, 10));
  const canEdit = ["draft", "changes_required"].includes(assessment.status);

  return <main className="rrPage"><style>{`
    *{box-sizing:border-box}.rrPage{min-height:100vh;padding:34px 22px 90px;background:#edf4f8;color:#071d3a;font-family:Arial,sans-serif}.rrShell{max-width:1120px;margin:auto}.rrTop{display:flex;justify-content:space-between;gap:20px;align-items:flex-start;flex-wrap:wrap}.rrTop small{color:#087f6c;font-weight:900;letter-spacing:.1em}.rrTop h1{font-size:34px;margin:7px 0}.rrTop p{margin:0;color:#657b93}.rrBack{padding:11px 15px;border:1px solid #ccd9e4;border-radius:9px;background:#fff;color:#173b59;text-decoration:none;font-weight:850}.rrGate{display:grid;grid-template-columns:1fr repeat(4,.45fr);gap:12px;margin:24px 0}.rrStatus,.rrMetric{padding:18px;border:1px solid #d6e2ea;border-radius:13px;background:#fff}.rrStatus span,.rrStatus strong,.rrMetric span,.rrMetric strong{display:block}.rrStatus span,.rrMetric span{font-size:11px;color:#657b91;font-weight:850}.rrStatus strong{font-size:21px;margin-top:7px}.rrMetric strong{font-size:28px;margin-top:7px}.rrPanel{padding:24px;border:1px solid #d6e2ea;border-radius:16px;background:#fff;margin-top:15px}.rrHead{margin-bottom:17px}.rrHead h2{margin:0}.rrHead p{margin:6px 0 0;color:#6b8096}.rrChecks{display:grid;gap:8px}.rrCheck{display:flex;gap:12px;align-items:flex-start;padding:13px;border-radius:10px;background:#eef8f4;color:#176148}.rrCheck.fail{background:#fff0ee;color:#a22c26}.rrCheck b{font-size:18px}.rrReady{padding:18px;border-left:5px solid #079468;border-radius:10px;background:#eaf8f2;color:#126044;font-weight:850}.rrForm{display:grid;grid-template-columns:1fr 1fr;gap:14px}.rrField{display:grid;gap:7px}.rrField.full{grid-column:1/-1}.rrField label{font-size:12px;font-weight:900;color:#294a66}.rrField input,.rrField textarea{width:100%;padding:12px;border:1px solid #cbd8e5;border-radius:9px;font:inherit}.rrField textarea{min-height:95px}.rrDecisions{grid-column:1/-1;display:flex;gap:10px;flex-wrap:wrap}.rrButton{padding:13px 18px;border:0;border-radius:9px;background:#087f6c;color:#fff;font-weight:900;cursor:pointer}.rrButton.red{background:#bd3a32}.rrButton.blue{background:#1762ef}.rrButton:disabled{opacity:.45;cursor:not-allowed}.rrHistory{display:grid;gap:8px}.rrHistory div{display:flex;justify-content:space-between;gap:15px;padding:12px;border-bottom:1px solid #e4ebf0}.rrHistory span{color:#667d93}@media(max-width:780px){.rrGate{grid-template-columns:1fr 1fr}.rrStatus{grid-column:1/-1}.rrForm{grid-template-columns:1fr}.rrField.full,.rrDecisions{grid-column:auto}}
  `}</style><div className="rrShell">
    <header className="rrTop"><div><small>{assessment.assessment_reference} · CONTROL GATE</small><h1>Review, approval and communication</h1><p>{assessment.title}</p></div><Link className="rrBack" href={"/portal/health-safety/risk-assessments/" + id}>← Assessment workspace</Link></header>
    <section className="rrGate"><div className="rrStatus"><span>CURRENT STATUS</span><strong>{label(assessment.status)}</strong></div><div className="rrMetric"><span>HAZARDS</span><strong>{hazards.length}</strong></div><div className="rrMetric"><span>ELEVATED</span><strong>{elevated.length}</strong></div><div className="rrMetric"><span>OPEN ACTIONS</span><strong>{actions.filter((item) => openActionStatuses.includes(item.status)).length}</strong></div><div className="rrMetric"><span>OVERDUE</span><strong>{overdue.length}</strong></div></section>
    <section className="rrPanel"><div className="rrHead"><h2>Approval readiness</h2><p>The gate checks required context, risk decisions and accountable action.</p></div>{failures.length ? <div className="rrChecks">{failures.map((failure) => <div className="rrCheck fail" key={failure}><b>×</b><span>{failure}</span></div>)}</div> : <div className="rrReady">✓ Required assessment information is complete and ready for controlled review.</div>}</section>
    {canEdit && <section className="rrPanel"><div className="rrHead"><h2>Submit for competent review</h2><p>Submission locks the assessment content while the approval decision is recorded.</p></div><form action={submitForReview}><input type="hidden" name="assessment_id" value={id}/><button className="rrButton blue" disabled={failures.length > 0}>Submit for review →</button></form></section>}
    {assessment.status === "in_review" && <section className="rrPanel"><div className="rrHead"><h2>Record review decision</h2><p>The approver should confirm the assessment is suitable, sufficient and usable in practice.</p></div><form className="rrForm" action={recordReviewDecision}><input type="hidden" name="assessment_id" value={id}/><div className="rrField"><label htmlFor="approver_name">Competent approver name *</label><input id="approver_name" name="approver_name" required/></div><div className="rrField full"><label htmlFor="approval_comment">Approval comment / changes required</label><textarea id="approval_comment" name="approval_comment"/></div><div className="rrDecisions"><button className="rrButton" name="decision" value="approved">Approve controlled assessment</button><button className="rrButton red" name="decision" value="changes_required">Return for changes</button></div></form></section>}
    {assessment.status === "approved" && <section className="rrPanel"><div className="rrHead"><h2>Communicate the approved controls</h2><p>Brief affected people through an appropriate method and retain acknowledgement evidence where required.</p></div><form action={markCommunicated}><input type="hidden" name="assessment_id" value={id}/><button className="rrButton">Confirm communicated →</button></form></section>}
    {["approved", "communicated"].includes(assessment.status) && <section className="rrPanel"><div className="rrHead"><h2>Controlled approval record</h2></div><div className="rrHistory"><div><strong>Approved by</strong><span>{assessment.approver_name || "—"}</span></div><div><strong>Approved</strong><span>{formatDate(assessment.approved_at)}</span></div><div><strong>Review date</strong><span>{formatDate(assessment.review_date)}</span></div><div><strong>Approval comment</strong><span>{assessment.approval_comment || "No additional comment"}</span></div>{assessment.communicated_at && <div><strong>Communicated</strong><span>{formatDate(assessment.communicated_at)}</span></div>}</div></section>}
  </div></main>;
}
