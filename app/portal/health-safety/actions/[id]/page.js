import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "../../../../../lib/supabase/server";

export const metadata = { title: "Risk Action Verification | RPG Excellence" };
export const dynamic = "force-dynamic";

const formatDate = (value) => value ? new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value)) : "—";
const label = (value) => String(value || "open").replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

async function loadAction(supabase, userId, id) {
  const { data: action, error } = await supabase.from("hs_risk_actions").select("*").eq("id", id).eq("owner_id", userId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!action) return null;
  const [assessmentResult, hazardResult] = await Promise.all([
    supabase.from("hs_risk_assessments").select("id,assessment_reference,title,status,site_location").eq("id", action.assessment_id).eq("owner_id", userId).single(),
    action.hazard_id ? supabase.from("hs_risk_hazards").select("*").eq("id", action.hazard_id).eq("owner_id", userId).single() : Promise.resolve({ data: null, error: null }),
  ]);
  if (assessmentResult.error || hazardResult.error) throw new Error(assessmentResult.error?.message || hazardResult.error?.message);
  return { action, assessment: assessmentResult.data, hazard: hazardResult.data };
}

async function acceptAction(formData) {
  "use server";
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/portal/login");
  const id = String(formData.get("action_id") || "");
  const { error } = await supabase.from("hs_risk_actions").update({ status: "in_progress" }).eq("id", id).eq("owner_id", user.id).in("status", ["open", "accepted"]);
  if (error) throw new Error(error.message);
  revalidatePath("/portal/health-safety/actions/" + id);
}

async function submitEvidence(formData) {
  "use server";
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/portal/login");
  const id = String(formData.get("action_id") || "");
  const comment = String(formData.get("completion_comment") || "").trim();
  const evidence = String(formData.get("completion_evidence_path") || "").trim();
  if (comment.length < 10) throw new Error("Explain what was implemented and how completion was confirmed.");
  if (!evidence) throw new Error("Provide an evidence reference, controlled document path or secure link.");
  const { data: action, error: readError } = await supabase.from("hs_risk_actions").select("assessment_id,organization_id").eq("id", id).eq("owner_id", user.id).single();
  if (readError) throw new Error(readError.message);
  const { error } = await supabase.from("hs_risk_actions").update({
    status: "evidence_submitted", completion_comment: comment,
    completion_evidence_path: evidence, completed_at: new Date().toISOString(),
    effectiveness_result: null, effectiveness_comment: null, verified_by: null, verified_at: null,
  }).eq("id", id).eq("owner_id", user.id);
  if (error) throw new Error(error.message);
  await supabase.from("hs_risk_events").insert({ assessment_id: action.assessment_id, owner_id: user.id, organization_id: action.organization_id, actor_id: user.id, event_type: "action_evidence_submitted", event_summary: "Risk-reduction action evidence submitted", event_data: { action_id: id } });
  revalidatePath("/portal/health-safety/actions/" + id);
  revalidatePath("/portal/health-safety/actions");
}

async function verifyEffectiveness(formData) {
  "use server";
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/portal/login");
  const id = String(formData.get("action_id") || "");
  const result = String(formData.get("effectiveness_result") || "");
  const comment = String(formData.get("effectiveness_comment") || "").trim();
  const allowed = ["effective_verified", "partly_effective", "not_effective", "unable_to_verify"];
  if (!allowed.includes(result)) throw new Error("Select a valid effectiveness result.");
  if (comment.length < 10) throw new Error("Record the objective basis for the verification decision.");
  const { data: action, error: readError } = await supabase.from("hs_risk_actions").select("assessment_id,organization_id,status").eq("id", id).eq("owner_id", user.id).single();
  if (readError) throw new Error(readError.message);
  if (!["evidence_submitted", "verification", "partly_effective", "not_effective"].includes(action.status)) throw new Error("Completion evidence must be submitted before effectiveness is verified.");
  const status = result === "effective_verified" ? "effective" : result === "partly_effective" ? "partly_effective" : result === "not_effective" ? "not_effective" : "verification";
  const { error } = await supabase.from("hs_risk_actions").update({
    status, effectiveness_result: result, effectiveness_comment: comment,
    verified_by: user.id, verified_at: new Date().toISOString(),
  }).eq("id", id).eq("owner_id", user.id);
  if (error) throw new Error(error.message);
  await supabase.from("hs_risk_events").insert({ assessment_id: action.assessment_id, owner_id: user.id, organization_id: action.organization_id, actor_id: user.id, event_type: "action_effectiveness_reviewed", event_summary: "Action effectiveness decision recorded: " + label(result), event_data: { action_id: id, result } });
  revalidatePath("/portal/health-safety/actions/" + id);
  revalidatePath("/portal/health-safety/actions");
}

export default async function RiskActionVerificationPage({ params }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/portal/login?next=/portal/health-safety/actions/" + id);
  const record = await loadAction(supabase, user.id, id);
  if (!record) notFound();
  const { action, assessment, hazard } = record;
  const overdue = !["effective", "cancelled"].includes(action.status) && action.target_date < new Date().toISOString().slice(0, 10);
  const canSubmit = ["open", "accepted", "in_progress", "partly_effective", "not_effective"].includes(action.status);
  const canVerify = ["evidence_submitted", "verification", "partly_effective", "not_effective"].includes(action.status);

  return <main className="havPage"><style>{`
    *{box-sizing:border-box}.havPage{min-height:100vh;padding:34px 22px 90px;background:#edf4f8;color:#071d3a;font-family:Arial,sans-serif}.havShell{max-width:1080px;margin:auto}.havTop{display:flex;justify-content:space-between;gap:20px;align-items:flex-start;flex-wrap:wrap}.havTop small{color:#087f6c;font-weight:900;letter-spacing:.1em}.havTop h1{font-size:34px;margin:7px 0}.havTop p{margin:0;color:#657b93}.havBack{padding:11px 15px;border:1px solid #ccd9e4;border-radius:9px;background:#fff;color:#173b59;text-decoration:none;font-weight:850}.havBanner{display:grid;grid-template-columns:1.3fr repeat(3,.5fr);gap:12px;margin:24px 0}.havContext,.havMetric{padding:18px;border:1px solid #d6e2ea;border-radius:13px;background:#fff}.havContext strong,.havContext small,.havMetric span,.havMetric strong{display:block}.havContext small{color:#72869a;margin-top:5px}.havMetric span{font-size:11px;color:#647a91;font-weight:850}.havMetric strong{font-size:22px;margin-top:8px}.havMetric .late{color:#c7352e}.havPanel{padding:24px;border:1px solid #d6e2ea;border-radius:16px;background:#fff;margin-top:15px}.havHead{margin-bottom:17px}.havHead h2{margin:0}.havHead p{margin:6px 0 0;color:#6b8096;line-height:1.5}.havDetails{display:grid;grid-template-columns:1fr 1fr;gap:11px}.havDetails div{padding:13px;border-radius:10px;background:#f2f6f9}.havDetails span,.havDetails strong{display:block}.havDetails span{font-size:10px;color:#71869a;font-weight:850}.havDetails strong{margin-top:5px}.havRisk{display:grid;grid-template-columns:1fr auto;gap:18px;align-items:center;padding:16px;border-left:5px solid #e7a927;border-radius:10px;background:#fff8e6}.havRisk b{font-size:30px}.havForm{display:grid;gap:14px}.havField{display:grid;gap:7px}.havField label{font-size:12px;font-weight:900;color:#294a66}.havField input,.havField select,.havField textarea{width:100%;padding:12px;border:1px solid #cbd8e5;border-radius:9px;font:inherit}.havField textarea{min-height:100px}.havButton{justify-self:start;padding:13px 18px;border:0;border-radius:9px;background:#087f6c;color:#fff;font-weight:900;cursor:pointer}.havButton.blue{background:#1762ef}.havOutcome{padding:18px;border-left:5px solid #079468;border-radius:10px;background:#eaf8f2}.havOutcome.warn{border-color:#d88a00;background:#fff6df}.havOutcome.red{border-color:#c7352e;background:#fff0ee}.havOutcome strong,.havOutcome span{display:block}.havOutcome span{margin-top:7px;line-height:1.5}.havIndependence{padding:14px;border-radius:10px;background:#eef4fb;color:#3e5c79;font-size:12px;line-height:1.5}@media(max-width:760px){.havBanner{grid-template-columns:1fr 1fr}.havContext{grid-column:1/-1}.havDetails{grid-template-columns:1fr}}@media(max-width:480px){.havBanner{grid-template-columns:1fr}.havContext{grid-column:auto}}
  `}</style><div className="havShell">
    <header className="havTop"><div><small>{action.action_reference} · CONTROLLED ACTION</small><h1>Action completion &amp; verification</h1><p>{assessment.assessment_reference} · {assessment.title}</p></div><Link className="havBack" href="/portal/health-safety/actions">← Action Register</Link></header>
    <section className="havBanner"><div className="havContext"><strong>{action.action_required}</strong><small>{hazard?.hazard_category || "General"} · {hazard?.hazard_description || "Assessment-level action"}</small></div><div className="havMetric"><span>STATUS</span><strong>{label(action.status)}</strong></div><div className="havMetric"><span>RESPONSIBLE</span><strong>{action.responsible_name}</strong></div><div className="havMetric"><span>TARGET</span><strong className={overdue ? "late" : ""}>{formatDate(action.target_date)}</strong></div></section>
    <section className="havPanel"><div className="havHead"><h2>Control requirement</h2><p>The action must be implemented as described or formally revised through the assessment owner.</p></div><div className="havDetails"><div><span>PRIORITY</span><strong>{label(action.priority)}</strong></div><div><span>RESPONSIBLE EMAIL</span><strong>{action.responsible_email || "—"}</strong></div><div><span>INTERIM CONTROLS</span><strong>{action.interim_controls || "—"}</strong></div><div><span>ASSESSMENT</span><strong><Link href={"/portal/health-safety/risk-assessments/" + assessment.id}>{assessment.assessment_reference}</Link></strong></div></div>{hazard && <div className="havRisk" style={{marginTop:14}}><div><strong>Residual-risk position</strong><small>{hazard.residual_likelihood} likelihood × {hazard.residual_severity} severity</small></div><b>{hazard.residual_score || "—"}</b></div>}</section>
    {action.status === "open" && <section className="havPanel"><div className="havHead"><h2>Accept responsibility</h2><p>Confirm the action has entered controlled implementation.</p></div><form action={acceptAction}><input type="hidden" name="action_id" value={id}/><button className="havButton blue">Start action →</button></form></section>}
    {canSubmit && <section className="havPanel"><div className="havHead"><h2>Submit completion evidence</h2><p>Explain what changed, identify objective evidence and submit the action for independent effectiveness verification.</p></div><form className="havForm" action={submitEvidence}><input type="hidden" name="action_id" value={id}/><div className="havField"><label htmlFor="completion_comment">Implementation and completion statement *</label><textarea id="completion_comment" name="completion_comment" required minLength={10} defaultValue={action.completion_comment || ""}/></div><div className="havField"><label htmlFor="completion_evidence_path">Evidence reference or secure link *</label><input id="completion_evidence_path" name="completion_evidence_path" required defaultValue={action.completion_evidence_path || ""} placeholder="Controlled document reference, record path or secure URL"/></div><button className="havButton blue">Submit for effectiveness verification →</button></form></section>}
    {canVerify && <section className="havPanel"><div className="havHead"><h2>Verify effectiveness</h2><p>Test whether the control operates in practice and has reduced or governed the exposure as intended.</p></div><div className="havIndependence">Good governance separates implementation from effectiveness verification. The verifier should be competent and sufficiently independent of the person who completed the action.</div><form className="havForm" action={verifyEffectiveness} style={{marginTop:15}}><input type="hidden" name="action_id" value={id}/><div className="havField"><label htmlFor="effectiveness_result">Verification result *</label><select id="effectiveness_result" name="effectiveness_result" required defaultValue=""><option value="" disabled>Select result</option><option value="effective_verified">Effective — verified</option><option value="partly_effective">Partly effective — further action required</option><option value="not_effective">Not effective — reopen action</option><option value="unable_to_verify">Unable to verify — insufficient evidence</option></select></div><div className="havField"><label htmlFor="effectiveness_comment">Objective verification evidence and conclusion *</label><textarea id="effectiveness_comment" name="effectiveness_comment" required minLength={10}/></div><button className="havButton">Record verification decision →</button></form></section>}
    {action.effectiveness_result && <section className="havPanel"><div className={"havOutcome " + (action.effectiveness_result === "effective_verified" ? "" : action.effectiveness_result === "not_effective" ? "red" : "warn")}><strong>{label(action.effectiveness_result)}</strong><span>{action.effectiveness_comment}</span><span>Verified {formatDate(action.verified_at)}</span></div></section>}
  </div></main>;
}
