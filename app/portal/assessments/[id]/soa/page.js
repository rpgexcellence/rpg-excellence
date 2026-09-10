import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "../../../../../lib/supabase/server";
import { createAdminClient } from "../../../../../lib/supabase/admin";
import { getAssessmentAccessState } from "../../../../../lib/assessment-access";
import { provisionSoa, saveSoaControl, saveSoaRegister } from "./actions";

const THEMES = {
  organisational: { label: "Organisational", range: "5.1–5.37", colour: "#1459d9" },
  people: { label: "People", range: "6.1–6.8", colour: "#7c3aed" },
  physical: { label: "Physical", range: "7.1–7.14", colour: "#d97706" },
  technological: { label: "Technological", range: "8.1–8.34", colour: "#0891b2" },
};

const INCLUSION_SOURCES = [
  ["risk_treatment", "Risk treatment"],
  ["legal_regulatory", "Legal / regulatory"],
  ["contractual", "Contractual"],
  ["business_requirement", "Business requirement"],
  ["interested_party", "Interested party"],
  ["good_practice", "Good practice"],
];

const field = {
  width: "100%",
  border: "1px solid #cbd8e8",
  borderRadius: "8px",
  padding: "10px 11px",
  background: "#fff",
  color: "#071a33",
  font: "inherit",
  boxSizing: "border-box",
};

const labelStyle = {
  display: "grid",
  gap: "6px",
  color: "#203b5d",
  fontSize: "14px",
  fontWeight: 700,
};

function value(searchParams, key, fallback = "") {
  const item = searchParams?.[key];
  return Array.isArray(item) ? item[0] ?? fallback : item ?? fallback;
}

function controlKey(controlId) {
  return controlId.replaceAll(".", "_");
}

function formatDate(date) {
  if (!date) return "—";
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(new Date(date));
}

function dateInputValue(date) {
  return date ? String(date).slice(0, 10) : "";
}

function statusLabel(status) {
  return String(status ?? "").replaceAll("_", " ");
}

function findingTypeLabel(type) {
  return ({
    major_nc: "Major NC",
    minor_nc: "Minor NC",
    observation: "Observation",
    ofi: "Opportunity for improvement",
    conformity: "Conformity",
  })[type] ?? statusLabel(type);
}

function Metric({ label, value: metricValue, tone = "#071a33" }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #d8e2ee", borderRadius: "12px", padding: "16px" }}>
      <div style={{ color: "#657990", fontSize: "12px", fontWeight: 800, letterSpacing: ".05em", textTransform: "uppercase" }}>{label}</div>
      <div style={{ color: tone, fontSize: "27px", fontWeight: 800, marginTop: "5px" }}>{metricValue}</div>
    </div>
  );
}

function ControlCard({ row, canEdit, findings }) {
  const key = controlKey(row.control_id);
  const theme = THEMES[row.theme];
  const sources = row.inclusion_source ?? [];
  const complete = row.applicability !== "pending";

  return (
    <details
      style={{
        position: "relative",
        background: "#fff",
        border: `1px solid ${complete ? "#c9dfd5" : "#d8e2ee"}`,
        borderLeft: `5px solid ${theme.colour}`,
        borderRadius: "12px",
        overflow: "hidden",
      }}
    >
      <summary style={{ cursor: "pointer", padding: "16px 18px", listStyle: "none" }}>
        <div style={{ display: "grid", gridTemplateColumns: "88px minmax(220px,1fr) auto auto", alignItems: "center", gap: "13px" }}>
          <strong style={{ color: theme.colour }}>A.{row.control_id}</strong>
          <div>
            <strong style={{ color: "#071a33", fontSize: "16px" }}>{row.control_title}</strong>
            <div style={{ color: "#657990", fontSize: "13px", marginTop: "4px" }}>{row.control_intent}</div>
          </div>
          <span style={{ color: row.applicability === "applicable" ? "#087a52" : row.applicability === "not_applicable" ? "#8a4b08" : "#657990", fontSize: "13px", fontWeight: 800, textTransform: "capitalize" }}>
            {statusLabel(row.applicability)}
          </span>
          <span style={{ background: "#eef3fa", borderRadius: "999px", color: "#294766", fontSize: "12px", fontWeight: 700, padding: "6px 9px", textTransform: "capitalize" }}>
            {statusLabel(row.implementation_status)}
          </span>
        </div>
      </summary>

      <div style={{ borderTop: "1px solid #e2e9f1", padding: "20px" }}>
        <div aria-hidden="true" style={{ position: "absolute", right: "36px", top: "92px", width: "390px", opacity: .06, pointerEvents: "none", userSelect: "none", textAlign: "center", transform: "rotate(-8deg)" }}>
          <img src="/rpg-excellence-logo.png" alt="" style={{ width: "100%", height: "auto" }} />
          <div style={{ color: "#1459d9", fontSize: "25px", fontWeight: 900, letterSpacing: ".12em", marginTop: "-12px" }}>ISO/IEC 27001 SoA</div>
        </div>

        <div style={{ position: "relative", zIndex: 1 }}>
          <details style={{ background: "#f7f9fc", border: "1px solid #d8e2ee", borderRadius: "9px", marginBottom: "18px", overflow: "hidden" }}>
            <summary style={{ cursor: "pointer", padding: "12px 14px", color: "#071a33", fontWeight: 800 }}>Assessment support — question, ISO/IEC 27002 guidance and evidence</summary>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", padding: "0 14px 14px" }}>
              <div style={{ background: "#eef5ff", borderRadius: "9px", padding: "13px", color: "#294766", lineHeight: 1.55 }}><strong style={{ color: "#071a33" }}>Assessment question</strong><br />{row.assessment_question}</div>
              <div style={{ background: "#effaf8", borderRadius: "9px", padding: "13px", color: "#294766", lineHeight: 1.55 }}><strong style={{ color: "#071a33" }}>ISO/IEC 27002-aligned guidance</strong><br />{row.implementation_guidance || "Apply controls proportionately to the assessed risk and operating context."}</div>
              <div style={{ background: "#fff", borderRadius: "9px", padding: "13px", color: "#294766", lineHeight: 1.55 }}><strong style={{ color: "#071a33" }}>Objective evidence to seek</strong><br />{row.objective_evidence || "Current records, system evidence, interviews, observation and adverse examples."}</div>
              <div style={{ background: "#fff8e8", borderRadius: "9px", padding: "13px", color: "#294766", lineHeight: 1.55 }}><strong style={{ color: "#071a33" }}>Effectiveness test</strong><br />{row.effectiveness_criteria || "Confirm that the control achieves its intended outcome and responds to change."}</div>
            </div>
          </details>

          <form action={saveSoaControl}>
          <input type="hidden" name="assessment_id" value={row.assessment_id} />
          <input type="hidden" name="control_id" value={row.control_id} />

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
            <label style={labelStyle}>Applicability decision
              <select name={`applicability_${key}`} defaultValue={row.applicability} style={field} disabled={!canEdit}>
                <option value="pending">Pending decision</option>
                <option value="applicable">Applicable</option>
                <option value="not_applicable">Not applicable</option>
              </select>
            </label>
            <label style={labelStyle}>Implementation status
              <select name={`implementation_status_${key}`} defaultValue={row.implementation_status} style={field} disabled={!canEdit}>
                <option value="not_assessed">Not assessed</option>
                <option value="not_implemented">Not implemented</option>
                <option value="planned">Planned</option>
                <option value="partially_implemented">Partially implemented</option>
                <option value="implemented">Implemented</option>
                <option value="effective">Effective</option>
              </select>
            </label>
            <label style={{ ...labelStyle, gridColumn: "1 / -1" }}>Applicability justification
              <textarea name={`applicability_justification_${key}`} defaultValue={row.applicability_justification ?? ""} rows={3} style={field} disabled={!canEdit} placeholder="Explain why the control is necessary, or why exclusion does not create unmanaged risk." />
            </label>
          </div>

          <fieldset style={{ border: 0, margin: "17px 0", padding: 0 }} disabled={!canEdit}>
            <legend style={{ color: "#203b5d", fontSize: "14px", fontWeight: 800, marginBottom: "9px" }}>Reason for inclusion</legend>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "9px" }}>
              {INCLUSION_SOURCES.map(([source, sourceLabel]) => (
                <label key={source} style={{ display: "flex", gap: "7px", alignItems: "center", border: "1px solid #d8e2ee", borderRadius: "8px", padding: "8px 10px", color: "#294766", fontSize: "13px" }}>
                  <input type="checkbox" name={`inclusion_source_${key}`} value={source} defaultChecked={sources.includes(source)} />
                  {sourceLabel}
                </label>
              ))}
            </div>
          </fieldset>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
            <label style={labelStyle}>Implemented control description
              <textarea name={`control_description_${key}`} defaultValue={row.control_description ?? ""} rows={3} style={field} disabled={!canEdit} />
            </label>
            <label style={labelStyle}>Control owner
              <input name={`control_owner_${key}`} defaultValue={row.control_owner ?? ""} style={field} disabled={!canEdit} />
            </label>
            <label style={labelStyle}>Implementation evidence
              <textarea name={`implementation_evidence_${key}`} defaultValue={row.implementation_evidence ?? ""} rows={3} style={field} disabled={!canEdit} />
            </label>
            <label style={labelStyle}>Effectiveness evidence
              <textarea name={`effectiveness_evidence_${key}`} defaultValue={row.effectiveness_evidence ?? ""} rows={3} style={field} disabled={!canEdit} />
            </label>
            <div style={{ gridColumn: "1 / -1", borderLeft: "4px solid #1459d9", padding: "5px 11px", color: "#52677f", fontSize: "13px", lineHeight: 1.5 }}>
              <strong style={{ color: "#071a33" }}>Residual-risk decision guide:</strong> Low — monitor; Moderate — treat or formally accept; High — controlled treatment required; Critical — immediate escalation. High or Critical risk cannot be marked Effective.
            </div>
            <label style={labelStyle}>Residual risk level
              <select name={`residual_risk_level_${key}`} defaultValue={row.residual_risk_level ?? "not_assessed"} style={field} disabled={!canEdit}>
                <option value="not_assessed">Not assessed</option>
                <option value="low">Low — acceptable and monitor</option>
                <option value="moderate">Moderate — treat or formally accept</option>
                <option value="high">High — further treatment required</option>
                <option value="critical">Critical — immediate escalation</option>
              </select>
            </label>
            <label style={labelStyle}>Treatment decision
              <select name={`treatment_decision_${key}`} defaultValue={row.treatment_decision ?? "pending"} style={field} disabled={!canEdit}>
                <option value="pending">Pending decision</option>
                <option value="monitor">Monitor</option>
                <option value="accept">Accept</option>
                <option value="reduce">Reduce</option>
                <option value="avoid">Avoid</option>
                <option value="share">Share / transfer</option>
              </select>
            </label>
            <label style={{ ...labelStyle, gridColumn: "1 / -1" }}>Residual risk rationale
              <textarea name={`residual_risk_rationale_${key}`} defaultValue={row.residual_risk_rationale ?? row.residual_risk ?? ""} rows={3} style={field} disabled={!canEdit} placeholder="Explain the remaining threat, likelihood, impact and why this rating is justified after existing controls." />
            </label>
            <label style={labelStyle}>Risk owner
              <input name={`risk_owner_${key}`} defaultValue={row.risk_owner ?? ""} style={field} disabled={!canEdit} placeholder="Person accountable for the residual risk" />
            </label>
            <label style={labelStyle}>Action required
              <textarea name={`action_required_${key}`} defaultValue={row.action_required ?? ""} rows={2} style={field} disabled={!canEdit} />
            </label>
            <label style={labelStyle}>Risk acceptance authority
              <input name={`risk_acceptance_authority_${key}`} defaultValue={row.risk_acceptance_authority ?? ""} style={field} disabled={!canEdit} placeholder="Required when Accept is selected" />
            </label>
            <label style={labelStyle}>Risk acceptance date
              <input type="date" name={`risk_accepted_at_${key}`} defaultValue={dateInputValue(row.risk_accepted_at)} style={field} disabled={!canEdit} />
            </label>
            <label style={labelStyle}>Risk review date
              <input type="date" name={`risk_review_due_at_${key}`} defaultValue={dateInputValue(row.risk_review_due_at)} style={field} disabled={!canEdit} />
            </label>
            <label style={labelStyle}>Action target date
              <input type="date" name={`target_date_${key}`} defaultValue={dateInputValue(row.target_date)} style={field} disabled={!canEdit} />
            </label>
            <label style={labelStyle}>Finding reference
              <select name={`finding_reference_${key}`} defaultValue={row.finding_reference ?? ""} style={field} disabled={!canEdit}>
                <option value="">No linked finding</option>
                {row.finding_reference && !findings.some((finding) => finding.question_number === row.finding_reference) && <option value={row.finding_reference}>{row.finding_reference}</option>}
                {findings.map((finding) => <option key={finding.id} value={finding.question_number}>{finding.question_number} · {findingTypeLabel(finding.finding_type)} · {statusLabel(finding.status)}</option>)}
              </select>
            </label>
            <label style={labelStyle}>Assessor conclusion
              <select name={`assessor_conclusion_${key}`} defaultValue={row.assessor_conclusion ?? "not_assessed"} style={field} disabled={!canEdit}>
                <option value="not_assessed">Not assessed</option>
                {row.assessor_conclusion && !["not_assessed", "conformity", "observation", "ofi", "minor_nc", "major_nc"].includes(row.assessor_conclusion) && <option value={row.assessor_conclusion}>{row.assessor_conclusion}</option>}
                <option value="conformity">Conformity</option>
                <option value="observation">Observation</option>
                <option value="ofi">Opportunity for improvement</option>
                <option value="minor_nc">Minor nonconformity</option>
                <option value="major_nc">Major nonconformity</option>
              </select>
            </label>
          </div>

          {canEdit && (
            <button style={{ marginTop: "16px", border: 0, borderRadius: "8px", padding: "11px 16px", background: "#1459d9", color: "#fff", fontWeight: 800, cursor: "pointer" }}>
              Save A.{row.control_id}
            </button>
          )}
          </form>
        </div>
      </div>
    </details>
  );
}

export default async function SoaPage({ params, searchParams }) {
  const { id } = await params;
  const filters = await searchParams;
  const supabase = await createClient();
  const admin = createAdminClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/portal/login");

  const { data: assessment, error: assessmentError } = await supabase
    .from("assessments")
    .select("id, owner_id, organization_id, standard, status, workspace_type")
    .eq("id", id)
    .eq("owner_id", user.id)
    .single();

  if (assessmentError || !assessment) redirect("/portal");

  if (!["ISO/IEC 27001:2022", "ISO/IEC 27001:2022/Amd 1:2024"].includes(assessment.standard)) {
    redirect(`/portal/assessments/${id}`);
  }

  const access = await getAssessmentAccessState(user.id, id);
  const { data: register, error: registerError } = await admin
    .from("assessment_soa_registers")
    .select("*")
    .eq("assessment_id", id)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (registerError) throw new Error(registerError.message);

  if (!register) {
    return (
      <main style={{ minHeight: "100vh", background: "#f3f6f9", padding: "42px 20px", fontFamily: "Arial, sans-serif" }}>
        <section style={{ maxWidth: "760px", margin: "80px auto", background: "#fff", border: "1px solid #d8e2ee", borderRadius: "16px", padding: "34px" }}>
          <div style={{ color: "#1459d9", fontWeight: 800, letterSpacing: ".08em", fontSize: "12px" }}>ISO/IEC 27001:2022</div>
          <h1 style={{ color: "#071a33", marginBottom: "10px" }}>Statement of Applicability</h1>
          <p style={{ color: "#617087", lineHeight: 1.6 }}>Create the controlled SoA register for this assessment. It will include all 93 Annex A controls, ISO/IEC 27002-aligned implementation guidance and traceability to risk treatment.</p>
          {access.canEditAssessment ? (
            <form action={provisionSoa}>
              <input type="hidden" name="assessment_id" value={id} />
              <button style={{ border: 0, borderRadius: "8px", padding: "12px 17px", background: "#1459d9", color: "#fff", fontWeight: 800, cursor: "pointer" }}>Create 93-control SoA</button>
            </form>
          ) : (
            <p style={{ color: "#9a3412", fontWeight: 700 }}>Assessment editing access has ended, so a new SoA cannot be created.</p>
          )}
          <Link href={`/portal/assessments/${id}`} style={{ display: "inline-block", marginTop: "18px", color: "#1459d9", fontWeight: 700 }}>← Return to assessment</Link>
        </section>
      </main>
    );
  }

  const [{ data: catalog, error: catalogError }, { data: entries, error: entriesError }, { data: findings, error: findingsError }] = await Promise.all([
    supabase.from("iso27001_control_catalog").select("*").eq("active", true).order("control_order", { ascending: true }),
    admin.from("assessment_soa_entries").select("*").eq("assessment_id", id).eq("owner_id", user.id),
    admin.from("assessment_findings").select("id, question_number, finding_type, status").eq("assessment_id", id).eq("owner_id", user.id).neq("finding_type", "conformity").order("created_at", { ascending: true }),
  ]);

  if (catalogError) throw new Error(catalogError.message);
  if (entriesError) throw new Error(entriesError.message);
  if (findingsError) throw new Error(findingsError.message);

  const entryMap = new Map((entries ?? []).map((entry) => [entry.control_id, entry]));
  const rows = (catalog ?? []).map((control) => ({ ...control, ...entryMap.get(control.control_id), assessment_id: id }));
  const selectedTheme = value(filters, "theme", "all");
  const selectedApplicability = value(filters, "applicability", "all");
  const selectedStatus = value(filters, "status", "all");
  const query = value(filters, "q", "").trim().toLowerCase();
  const visibleRows = rows.filter((row) =>
    (selectedTheme === "all" || row.theme === selectedTheme) &&
    (selectedApplicability === "all" || row.applicability === selectedApplicability) &&
    (selectedStatus === "all" || row.implementation_status === selectedStatus) &&
    (!query || `${row.control_id} ${row.control_title} ${row.control_intent}`.toLowerCase().includes(query))
  );

  const applicable = rows.filter((row) => row.applicability === "applicable").length;
  const excluded = rows.filter((row) => row.applicability === "not_applicable").length;
  const pending = rows.filter((row) => row.applicability === "pending").length;
  const effective = rows.filter((row) => row.implementation_status === "effective").length;
  const completion = rows.length ? Math.round(((rows.length - pending) / rows.length) * 100) : 0;

  return (
    <main style={{ minHeight: "100vh", background: "#f3f6f9", padding: "36px 20px 70px", fontFamily: "Arial, sans-serif" }}>
      <div aria-hidden="true" style={{ position: "fixed", inset: 0, display: "grid", placeItems: "center", pointerEvents: "none", userSelect: "none", opacity: .07, transform: "rotate(-10deg)", zIndex: 0 }}>
        <div style={{ width: "720px", textAlign: "center" }}>
          <img src="/rpg-excellence-logo.png" alt="" style={{ width: "100%", height: "auto" }} />
          <div style={{ color: "#1459d9", fontSize: "40px", fontWeight: 900, letterSpacing: ".13em", marginTop: "-18px" }}>ISO/IEC 27001 SoA</div>
        </div>
      </div>
      <div style={{ maxWidth: "1280px", margin: "0 auto", position: "relative", zIndex: 1 }}>
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "20px", flexWrap: "wrap", marginBottom: "20px" }}>
          <div>
            <div style={{ color: "#1459d9", fontWeight: 800, letterSpacing: ".08em", fontSize: "12px" }}>RPG INTELLIGENCE · CONTROLLED SoA</div>
            <h1 style={{ color: "#071a33", margin: "8px 0" }}>Statement of Applicability</h1>
            <p style={{ color: "#617087", margin: 0 }}>{assessment.standard} · 93 Annex A controls · ISO/IEC 27002:2022 guidance</p>
          </div>
          <div style={{ display: "flex", gap: "9px", flexWrap: "wrap" }}>
            <Link href={assessment.workspace_type === "soa_only" ? "/portal/soa" : `/portal/assessments/${id}`} style={{ border: "1px solid #cbd8e8", borderRadius: "8px", padding: "10px 14px", color: "#071a33", background: "#fff", textDecoration: "none", fontWeight: 700 }}>{assessment.workspace_type === "soa_only" ? "← SoA Register" : "← Assessment"}</Link>
            <Link href={`/portal/assessments/${id}/soa/summary`} style={{ borderRadius: "8px", padding: "10px 14px", color: "#fff", background: "#1459d9", textDecoration: "none", fontWeight: 700 }}>Executive Summary</Link>
            <Link href={`/portal/assessments/${id}/findings`} style={{ borderRadius: "8px", padding: "10px 14px", color: "#fff", background: "#071a33", textDecoration: "none", fontWeight: 700 }}>Findings & actions</Link>
          </div>
        </header>

        {!access.canEditAssessment && (
          <div style={{ background: "#fff4e5", border: "1px solid #f1c982", color: "#7a4600", borderRadius: "10px", padding: "13px 15px", marginBottom: "18px", fontWeight: 700 }}>Read-only record: assessment editing access has ended.</div>
        )}

        <section style={{ display: "grid", gridTemplateColumns: "repeat(5,minmax(120px,1fr))", gap: "11px", marginBottom: "18px" }}>
          <Metric label="Decision completion" value={`${completion}%`} tone="#1459d9" />
          <Metric label="Applicable" value={applicable} tone="#087a52" />
          <Metric label="Not applicable" value={excluded} tone="#a55a09" />
          <Metric label="Pending" value={pending} tone="#b42318" />
          <Metric label="Effective" value={effective} tone="#087a52" />
        </section>

        <section style={{ background: "#071a33", color: "#fff", borderRadius: "15px", padding: "22px", marginBottom: "18px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: "15px", flexWrap: "wrap", marginBottom: "15px" }}>
            <div><strong style={{ fontSize: "20px" }}>SoA governance and approval</strong><div style={{ opacity: .72, marginTop: "5px" }}>Version {register.version} · {statusLabel(register.status)} · approved {formatDate(register.approved_at)}</div></div>
            <div style={{ color: "#63e6d3", fontWeight: 800 }}>{rows.length} controls provisioned</div>
          </div>
          <form action={saveSoaRegister}>
            <input type="hidden" name="assessment_id" value={id} />
            <fieldset disabled={!access.canEditAssessment} style={{ border: 0, padding: 0, margin: 0 }}>
              <div style={{ display: "grid", gridTemplateColumns: "120px 190px 1fr 1fr", gap: "12px" }}>
                <label style={{ ...labelStyle, color: "#dce8f7" }}>Version<input name="version" defaultValue={register.version} style={field} /></label>
                <label style={{ ...labelStyle, color: "#dce8f7" }}>Status<select name="status" defaultValue={register.status} style={field}><option value="draft">Draft</option><option value="under_review">Under review</option><option value="approved">Approved</option><option value="superseded">Superseded</option></select></label>
                <label style={{ ...labelStyle, color: "#dce8f7", gridColumn: "span 2" }}>ISMS scope<textarea name="isms_scope" defaultValue={register.isms_scope ?? ""} rows={2} style={field} /></label>
                <label style={{ ...labelStyle, color: "#dce8f7", gridColumn: "span 2" }}>Risk assessment reference<input name="risk_assessment_reference" defaultValue={register.risk_assessment_reference ?? ""} style={field} /></label>
                <label style={{ ...labelStyle, color: "#dce8f7", gridColumn: "span 2" }}>Risk treatment plan reference<input name="risk_treatment_plan_reference" defaultValue={register.risk_treatment_plan_reference ?? ""} style={field} /></label>
                <label style={{ ...labelStyle, color: "#dce8f7" }}>Prepared by<input name="prepared_by" defaultValue={register.prepared_by ?? ""} style={field} /></label>
                <label style={{ ...labelStyle, color: "#dce8f7" }}>Reviewed by<input name="reviewed_by" defaultValue={register.reviewed_by ?? ""} style={field} /></label>
                <label style={{ ...labelStyle, color: "#dce8f7" }}>Approved by<input name="approved_by" defaultValue={register.approved_by ?? ""} style={field} /></label>
                <label style={{ ...labelStyle, color: "#dce8f7" }}>Review due<input type="date" name="review_due_at" defaultValue={register.review_due_at ?? ""} style={field} /></label>
                <label style={{ ...labelStyle, color: "#dce8f7", gridColumn: "1 / -1" }}>Approval statement<textarea name="approval_statement" defaultValue={register.approval_statement ?? ""} rows={2} style={field} placeholder="Confirm that control selection, exclusions and residual risks have been reviewed and approved." /></label>
              </div>
              {access.canEditAssessment && <button style={{ marginTop: "14px", border: 0, borderRadius: "8px", padding: "11px 16px", background: "#2f63e9", color: "#fff", fontWeight: 800, cursor: "pointer" }}>Save governance record</button>}
            </fieldset>
          </form>
        </section>

        <section style={{ background: "#fff", border: "1px solid #d8e2ee", borderRadius: "13px", padding: "16px", marginBottom: "18px" }}>
          <form method="get" style={{ display: "grid", gridTemplateColumns: "1.4fr repeat(3,1fr) auto", gap: "10px", alignItems: "end" }}>
            <label style={labelStyle}>Search<input name="q" defaultValue={value(filters, "q")} placeholder="Control number or title" style={field} /></label>
            <label style={labelStyle}>Theme<select name="theme" defaultValue={selectedTheme} style={field}><option value="all">All themes</option>{Object.entries(THEMES).map(([key, item]) => <option key={key} value={key}>{item.label}</option>)}</select></label>
            <label style={labelStyle}>Applicability<select name="applicability" defaultValue={selectedApplicability} style={field}><option value="all">All decisions</option><option value="pending">Pending</option><option value="applicable">Applicable</option><option value="not_applicable">Not applicable</option></select></label>
            <label style={labelStyle}>Implementation<select name="status" defaultValue={selectedStatus} style={field}><option value="all">All statuses</option><option value="not_assessed">Not assessed</option><option value="not_implemented">Not implemented</option><option value="planned">Planned</option><option value="partially_implemented">Partially implemented</option><option value="implemented">Implemented</option><option value="effective">Effective</option></select></label>
            <button style={{ border: 0, borderRadius: "8px", padding: "11px 15px", background: "#1459d9", color: "#fff", fontWeight: 800, cursor: "pointer" }}>Apply</button>
          </form>
        </section>

        <details style={{ background: "#fff", border: "1px solid #d8e2ee", borderRadius: "13px", marginBottom: "18px", overflow: "hidden" }}>
          <summary style={{ cursor: "pointer", padding: "15px 17px", color: "#071a33", fontWeight: 800 }}>
            Existing assessment findings ({(findings ?? []).length})
          </summary>
          <div style={{ borderTop: "1px solid #e2e9f1", padding: "12px 17px" }}>
            {(findings ?? []).length ? (
              <div style={{ display: "grid", gap: "8px" }}>
                {(findings ?? []).map((finding) => (
                  <div key={finding.id} style={{ display: "flex", justifyContent: "space-between", gap: "12px", padding: "9px 11px", background: "#f7f9fc", borderRadius: "8px", color: "#294766" }}>
                    <strong>{finding.question_number} · {findingTypeLabel(finding.finding_type)}</strong>
                    <span style={{ textTransform: "capitalize" }}>{statusLabel(finding.status)}</span>
                  </div>
                ))}
              </div>
            ) : <div style={{ color: "#657990" }}>No formal findings have been raised for this assessment.</div>}
            <Link href={`/portal/assessments/${id}/findings`} style={{ display: "inline-block", marginTop: "11px", color: "#1459d9", fontWeight: 800 }}>Open Findings &amp; Corrective Actions →</Link>
          </div>
        </details>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "10px", marginBottom: "18px" }}>
          {Object.entries(THEMES).map(([themeKey, item]) => {
            const themeRows = rows.filter((row) => row.theme === themeKey);
            const decided = themeRows.filter((row) => row.applicability !== "pending").length;
            return <Link key={themeKey} href={`?theme=${themeKey}`} style={{ background: "#fff", border: "1px solid #d8e2ee", borderTop: `4px solid ${item.colour}`, borderRadius: "10px", padding: "13px", color: "#071a33", textDecoration: "none" }}><strong>{item.label}</strong><div style={{ color: "#657990", fontSize: "13px", marginTop: "5px" }}>{item.range} · {decided}/{themeRows.length} decided</div></Link>;
          })}
        </div>

        <div style={{ color: "#617087", marginBottom: "10px", fontWeight: 700 }}>Showing {visibleRows.length} of {rows.length} controls</div>
        <section style={{ display: "grid", gap: "11px" }}>
          {visibleRows.map((row) => <ControlCard key={row.control_id} row={row} canEdit={access.canEditAssessment} findings={findings ?? []} />)}
          {!visibleRows.length && <div style={{ background: "#fff", border: "1px solid #d8e2ee", borderRadius: "12px", padding: "30px", color: "#617087", textAlign: "center" }}>No controls match the selected filters.</div>}
        </section>
      </div>
    </main>
  );
}
