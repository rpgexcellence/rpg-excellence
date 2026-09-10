import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "../../../../../../lib/supabase/server";
import { createAdminClient } from "../../../../../../lib/supabase/admin";
import { getAssessmentAccessState } from "../../../../../../lib/assessment-access";
import { generateSoaExecutiveDraft, saveSoaExecutiveSummary } from "./actions";

const field = { width: "100%", border: "1px solid #cbd8e8", borderRadius: "8px", padding: "11px 12px", background: "#fff", color: "#071a33", font: "inherit", boxSizing: "border-box" };
const label = { display: "grid", gap: "7px", color: "#203b5d", fontSize: "14px", fontWeight: 800 };

function Metric({ title, value, note, tone = "#071a33" }) {
  return <div style={{ background: "#fff", border: "1px solid #d8e2ee", borderRadius: "12px", padding: "17px" }}><div style={{ color: "#657990", fontSize: "12px", fontWeight: 800, letterSpacing: ".05em", textTransform: "uppercase" }}>{title}</div><div style={{ color: tone, fontSize: "28px", fontWeight: 900, marginTop: "7px" }}>{value}</div><div style={{ color: "#657990", fontSize: "13px", marginTop: "5px" }}>{note}</div></div>;
}

export default async function SoaExecutiveSummaryPage({ params, searchParams }) {
  const { id } = await params;
  const query = await searchParams;
  const supabase = await createClient();
  const admin = createAdminClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/portal/login");
  const { data: assessment } = await supabase.from("assessments").select("id, owner_id, standard, status").eq("id", id).eq("owner_id", user.id).single();
  if (!assessment) redirect("/portal");
  const access = await getAssessmentAccessState(user.id, id);
  const [{ data: register, error: registerError }, { data: entries, error: entriesError }, { data: findings }] = await Promise.all([
    admin.from("assessment_soa_registers").select("*").eq("assessment_id", id).eq("owner_id", user.id).single(),
    admin.from("assessment_soa_entries").select("*").eq("assessment_id", id).eq("owner_id", user.id),
    admin.from("assessment_findings").select("finding_type, status").eq("assessment_id", id).eq("owner_id", user.id).neq("finding_type", "conformity"),
  ]);
  if (registerError || !register) redirect(`/portal/assessments/${id}/soa`);
  if (entriesError) throw new Error(entriesError.message);
  const rows = entries ?? [];
  const total = rows.length;
  const applicable = rows.filter((x) => x.applicability === "applicable").length;
  const excluded = rows.filter((x) => x.applicability === "not_applicable").length;
  const pending = rows.filter((x) => x.applicability === "pending").length;
  const effective = rows.filter((x) => x.implementation_status === "effective").length;
  const highRisk = rows.filter((x) => ["high", "critical"].includes(x.residual_risk_level)).length;
  const openFindings = (findings ?? []).filter((x) => x.status !== "closed").length;
  const decisionCompletion = total ? Math.round(((total - pending) / total) * 100) : 0;
  const implementationEffectiveness = applicable ? Math.round((effective / applicable) * 100) : 0;
  const ready = pending === 0 && highRisk === 0 && openFindings === 0;
  const reference = register.report_reference || `SOA-${String(register.id).replaceAll("-", "").slice(0, 8).toUpperCase()}-RPT`;

  return <main style={{ minHeight: "100vh", background: "#f3f6f9", padding: "36px 20px 70px", fontFamily: "Arial, sans-serif" }}>
    <div aria-hidden="true" style={{ position: "fixed", inset: 0, display: "grid", placeItems: "center", opacity: .055, pointerEvents: "none", transform: "rotate(-10deg)" }}><div style={{ width: "720px", textAlign: "center" }}><img src="/rpg-excellence-logo.png" alt="" style={{ width: "100%" }} /><div style={{ color: "#1459d9", fontSize: "38px", fontWeight: 900, letterSpacing: ".13em", marginTop: "-15px" }}>CONTROLLED SoA REPORT</div></div></div>
    <div style={{ maxWidth: "1280px", margin: "0 auto", position: "relative", zIndex: 1 }}>
      <header style={{ display: "flex", justifyContent: "space-between", gap: "20px", flexWrap: "wrap", alignItems: "flex-start", marginBottom: "20px" }}><div><div style={{ color: "#1459d9", fontWeight: 900, letterSpacing: ".08em", fontSize: "12px" }}>RPG INTELLIGENCE · CONTROLLED REPORT</div><h1 style={{ color: "#071a33", margin: "8px 0" }}>SoA Executive Summary</h1><p style={{ color: "#617087", margin: 0 }}>{assessment.standard} · {reference} · status <strong>{register.report_status || "draft"}</strong></p></div><div style={{ display: "flex", gap: "9px", flexWrap: "wrap" }}><Link href={`/portal/assessments/${id}/soa`} style={{ border: "1px solid #cbd8e8", borderRadius: "8px", padding: "10px 14px", background: "#fff", color: "#071a33", textDecoration: "none", fontWeight: 800 }}>← Statement of Applicability</Link><Link href={`/portal/assessments/${id}/findings`} style={{ borderRadius: "8px", padding: "10px 14px", background: "#071a33", color: "#fff", textDecoration: "none", fontWeight: 800 }}>Findings &amp; actions</Link></div></header>

      {(query?.saved || query?.generated) && <div style={{ background: "#edf8f3", border: "1px solid #b9dfcc", color: "#12613f", borderRadius: "10px", padding: "13px 15px", marginBottom: "17px", fontWeight: 800 }}>{query.generated ? "Guided SoA report draft created. Review and take ownership before approval." : "SoA executive summary saved."}</div>}

      <section style={{ background: "#071a33", color: "#fff", borderRadius: "16px", padding: "27px", display: "flex", justifyContent: "space-between", gap: "20px", alignItems: "center", flexWrap: "wrap", marginBottom: "17px" }}><div><div style={{ opacity: .72, fontSize: "12px", fontWeight: 800, letterSpacing: ".06em" }}>SoA ASSURANCE POSITION</div><div style={{ fontSize: "27px", fontWeight: 900, marginTop: "7px" }}>{ready ? "Ready for accountable approval" : "Management attention required"}</div><div style={{ opacity: .78, marginTop: "6px" }}>{total} Annex A controls · ISO/IEC 27002-aligned guidance</div></div><div style={{ fontSize: "58px", fontWeight: 900 }}>{decisionCompletion}%</div></section>

      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(175px,1fr))", gap: "11px", marginBottom: "18px" }}><Metric title="Decision completion" value={`${decisionCompletion}%`} note={`${total - pending} of ${total} decided`} tone="#1459d9" /><Metric title="Applicable" value={applicable} note={`${excluded} excluded`} tone="#087a52" /><Metric title="Effective" value={`${implementationEffectiveness}%`} note={`${effective} controls concluded effective`} tone="#087a52" /><Metric title="Elevated residual risk" value={highRisk} note="High or Critical" tone={highRisk ? "#b42318" : "#087a52"} /><Metric title="Open findings" value={openFindings} note="Formal follow-up required" tone={openFindings ? "#b42318" : "#087a52"} /></section>

      <section style={{ background: "#fff", border: "1px solid #d8e2ee", borderRadius: "15px", overflow: "hidden" }}>
        <div style={{ padding: "20px 22px", borderBottom: "1px solid #e2e9f1", display: "flex", justifyContent: "space-between", gap: "18px", flexWrap: "wrap" }}><div><div style={{ color: "#1459d9", fontSize: "12px", fontWeight: 900, letterSpacing: ".08em" }}>REPORT CONTENT AND REVIEW</div><h2 style={{ color: "#071a33", margin: "8px 0 5px" }}>Controlled SoA report</h2><p style={{ color: "#617087", margin: 0 }}>Review, edit and take ownership of the narrative, limitations, distribution and conclusion.</p></div>{access.canEditAssessment && <form action={generateSoaExecutiveDraft} style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}><input type="hidden" name="assessment_id" value={id} /><label style={{ display: "flex", gap: "7px", alignItems: "center", color: "#294766", fontWeight: 700 }}><input type="checkbox" name="replace_existing" /> Replace existing narrative</label><button style={{ border: 0, borderRadius: "8px", padding: "11px 15px", background: "#1459d9", color: "#fff", fontWeight: 800, cursor: "pointer" }}>Build guided draft</button></form>}</div>
        <form action={saveSoaExecutiveSummary} style={{ padding: "22px" }}><input type="hidden" name="assessment_id" value={id} /><fieldset disabled={!access.canEditAssessment} style={{ border: 0, padding: 0, margin: 0 }}><div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: "15px" }}>
          <label style={label}>Report reference<input name="report_reference" defaultValue={reference} style={field} /></label><label style={label}>Confidentiality<select name="report_confidentiality" defaultValue={register.report_confidentiality || "Internal"} style={field}><option>Internal</option><option>Confidential</option><option>Restricted</option><option>Client controlled</option></select></label><label style={label}>Report status<select name="report_status" defaultValue={register.report_status || "draft"} style={field}><option value="draft">Draft</option><option value="under_review">Under review</option><option value="approved">Approved</option><option value="issued">Issued</option></select></label>
          <label style={{ ...label, gridColumn: "span 2" }}>Executive summary<textarea name="executive_summary" defaultValue={register.executive_summary || ""} rows={6} style={field} /></label><label style={label}>Distribution list<textarea name="distribution_list" defaultValue={register.distribution_list || ""} rows={6} style={field} placeholder="Names, roles or controlled recipients" /></label>
          <label style={{ ...label, gridColumn: "span 2" }}>Methodology and sampling<textarea name="methodology_and_sampling" defaultValue={register.methodology_and_sampling || ""} rows={6} style={field} /></label><label style={label}>Limitations and exclusions<textarea name="limitations_and_exclusions" defaultValue={register.limitations_and_exclusions || ""} rows={6} style={field} /></label>
          <label style={label}>Unresolved matters<textarea name="unresolved_matters" defaultValue={register.unresolved_matters || ""} rows={5} style={field} /></label><label style={{ ...label, gridColumn: "span 2" }}>Overall SoA conclusion<textarea name="overall_conclusion" defaultValue={register.overall_conclusion || ""} rows={5} style={field} /></label>
          <label style={label}>Prepared by<input name="prepared_by" defaultValue={register.prepared_by || ""} style={field} /></label><label style={label}>Reviewed by<input name="reviewed_by" defaultValue={register.reviewed_by || ""} style={field} /></label><label style={label}>Approved by<input name="approved_by" defaultValue={register.approved_by || ""} style={field} /></label>
        </div>{access.canEditAssessment && <button style={{ marginTop: "17px", border: 0, borderRadius: "8px", padding: "12px 17px", background: "#1459d9", color: "#fff", fontWeight: 900, cursor: "pointer" }}>Save controlled report</button>}</fieldset></form>
      </section>
    </div>
  </main>;
}
