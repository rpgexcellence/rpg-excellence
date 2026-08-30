import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { createClient } from "../../../../../lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const label = (value) => String(value || "—").replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
const date = (value) => value ? new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(new Date(value)) : "—";

export async function GET(_request, { params }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorised", { status: 401 });

  const [auditResult, reportResult, teamResult, answersResult, findingsResult, evidenceResult] = await Promise.all([
    supabase.from("internal_audits").select("*, internal_audit_selected_standards(internal_audit_standard_catalogue(display_name))").eq("id", id).eq("owner_id", user.id).maybeSingle(),
    supabase.from("internal_audit_report_controls").select("*").eq("audit_id", id).eq("owner_id", user.id).maybeSingle(),
    supabase.from("internal_audit_team_members").select("member_name, audit_role").eq("audit_id", id).eq("owner_id", user.id).order("created_at"),
    supabase.from("internal_audit_answers").select("result, conclusion, risk_level, internal_audit_questions(question_code, clause, process_area, question_text)").eq("audit_id", id).eq("owner_id", user.id).neq("result", "not_assessed"),
    supabase.from("internal_audit_findings").select("finding_reference, finding_type, risk_level, title, failure_statement, criteria, objective_evidence, process_area, responsible_owner_name, agreed_date, status").eq("audit_id", id).eq("owner_id", user.id).order("created_at"),
    supabase.from("internal_audit_evidence").select("id").eq("audit_id", id).eq("owner_id", user.id),
  ]);
  for (const result of [auditResult, reportResult, teamResult, answersResult, findingsResult, evidenceResult]) {
    if (result.error) return new Response(result.error.message, { status: 500 });
  }
  if (!auditResult.data || !reportResult.data) return new Response("Controlled audit report not found", { status: 404 });
  const audit = auditResult.data;
  const report = reportResult.data;
  const team = teamResult.data || [];
  const answers = answersResult.data || [];
  const findings = findingsResult.data || [];
  const standards = (audit.internal_audit_selected_standards || []).map((row) => row.internal_audit_standard_catalogue?.display_name).filter(Boolean).join(" · ");

  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const navy = rgb(0.024, 0.102, 0.208), blue = rgb(0.09, 0.35, 0.9), grey = rgb(0.37, 0.44, 0.54), red = rgb(0.7, 0.1, 0.1);
  const width = 595.28, height = 841.89, margin = 46, contentWidth = width - margin * 2;
  let page, y;
  const addPage = () => { page = pdf.addPage([width, height]); y = height - margin; page.drawText("RPG EXCELLENCE", { x: margin, y, size: 11, font: bold, color: blue }); page.drawText(`${report.report_reference} · v${report.report_version}`, { x: width - margin - 150, y, size: 9, font: regular, color: grey }); y -= 38; };
  const ensure = (space = 45) => { if (y - space < 45) addPage(); };
  const wrap = (text, font = regular, size = 9.5, max = contentWidth) => { const words = String(text || "—").replace(/\s+/g, " ").trim().split(" "); const lines = []; let line = ""; for (const word of words) { const candidate = line ? `${line} ${word}` : word; if (font.widthOfTextAtSize(candidate, size) <= max) line = candidate; else { if (line) lines.push(line); line = word; } } if (line) lines.push(line); return lines.length ? lines : ["—"]; };
  const text = (value, options = {}) => { const size = options.size || 9.5, font = options.bold ? bold : regular, color = options.color || navy, max = options.width || contentWidth; const lines = wrap(value, font, size, max); ensure(lines.length * (size + 3) + 6); for (const line of lines) { page.drawText(line, { x: options.x || margin, y, size, font, color }); y -= size + 3; } y -= options.after ?? 5; };
  const heading = (value) => { ensure(36); y -= 4; text(value, { size: 14, bold: true, color: blue, after: 8 }); };
  const field = (name, value) => { text(name.toUpperCase(), { size: 7.5, bold: true, color: grey, after: 2 }); text(value, { after: 8 }); };
  addPage();
  text(report.status === "issued" ? "CONTROLLED AUDIT REPORT" : "DRAFT — NOT CONTROLLED FOR ISSUE", { size: 10, bold: true, color: report.status === "issued" ? blue : red, after: 10 });
  text(audit.title, { size: 23, bold: true, after: 8 });
  field("Audit reference", audit.audit_reference); field("Report status", `${label(report.status)} · ${report.issued_at ? date(report.issued_at) : "not issued"}`);
  field("Audit dates", `${date(audit.planned_start_at)} – ${date(audit.planned_end_at)}`); field("Standards and criteria", standards || "—");
  field("Scope", audit.scope_statement); field("Processes", audit.processes); field("Sites", audit.sites);
  field("Audit team", team.map((member) => `${member.member_name} (${label(member.audit_role)})`).join("; "));
  heading("Executive summary"); text(report.executive_summary);
  heading("Methodology and sampling"); text(report.methodology_and_sampling);
  heading("Limitations, exclusions and unresolved differences"); text(report.limitations_and_exclusions); text(report.unresolved_differences);
  heading("Overall management-system conclusion"); text(report.overall_conclusion);
  heading("Evidence-based criteria conclusions");
  for (const answer of answers) { const q = answer.internal_audit_questions || {}; ensure(65); text(`${q.question_code || q.clause || "Criterion"} · ${label(answer.result)}`, { bold: true, after: 3 }); text(`${q.process_area || "Approved criteria"}: ${answer.conclusion || q.question_text || "No conclusion recorded."}`, { after: 8 }); }
  heading("Controlled findings");
  if (!findings.length) text("No controlled findings were raised.");
  for (const finding of findings) { ensure(105); text(`${finding.finding_reference} · ${label(finding.finding_type)} · ${label(finding.risk_level)}`, { bold: true, color: ["major_nc", "minor_nc"].includes(finding.finding_type) ? red : blue, after: 3 }); text(finding.title, { bold: true, after: 3 }); field("Requirement", finding.criteria); field("Objective evidence", finding.objective_evidence); if (finding.failure_statement) field("Statement of nonconformity", finding.failure_statement); field("Owner and agreed date", `${finding.responsible_owner_name || "Unassigned"} · ${date(finding.agreed_date)} · ${label(finding.status)}`); }
  heading("Control and distribution"); field("Confidentiality", label(report.confidentiality_classification)); field("Distribution", report.distribution_list); field("Lead auditor", report.lead_auditor_name); field("Evidence records retained", String((evidenceResult.data || []).length));
  const bytes = await pdf.save();
  const safeName = `${report.report_reference}-${report.status}.pdf`.replace(/[^a-zA-Z0-9._-]/g, "-");
  return new Response(bytes, { headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${safeName}"`, "Cache-Control": "private, no-store" } });
}
