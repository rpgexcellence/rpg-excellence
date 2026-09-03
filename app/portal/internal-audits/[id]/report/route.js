import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { createClient } from "../../../../../lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PAGE = { width: 595.28, height: 841.89, margin: 42 };
const colours = {
  navy: rgb(0.035, 0.12, 0.24), blue: rgb(0.08, 0.32, 0.82), cyan: rgb(0.1, 0.72, 0.78),
  ink: rgb(0.08, 0.14, 0.23), grey: rgb(0.38, 0.44, 0.52), pale: rgb(0.95, 0.97, 0.99),
  line: rgb(0.83, 0.87, 0.92), green: rgb(0.05, 0.52, 0.32), amber: rgb(0.83, 0.49, 0.05), red: rgb(0.72, 0.12, 0.15), white: rgb(1, 1, 1),
};
const clean = (value, fallback = "Not recorded") => String(value ?? fallback).replace(/[\u2010-\u2015]/g, "-").replace(/\s+/g, " ").trim() || fallback;
const label = (value) => clean(value).replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
const date = (value) => value ? new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(new Date(value)) : "Not recorded";

export async function GET(_request, { params }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorised", { status: 401 });
  const [auditResult, reportResult, teamResult, answersResult, findingsResult, evidenceResult] = await Promise.all([
    supabase.from("internal_audits").select("*, internal_audit_selected_standards(internal_audit_standard_catalogue(display_name))").eq("id", id).eq("owner_id", user.id).maybeSingle(),
    supabase.from("internal_audit_report_controls").select("*").eq("audit_id", id).eq("owner_id", user.id).maybeSingle(),
    supabase.from("internal_audit_team_members").select("member_name, audit_role").eq("audit_id", id).eq("owner_id", user.id).order("created_at"),
    supabase.from("internal_audit_answers").select("result, conclusion, auditor_notes, risk_level, confidence_level, internal_audit_questions(question_code, clause, process_area, question_text)").eq("audit_id", id).eq("owner_id", user.id).neq("result", "not_assessed"),
    supabase.from("internal_audit_findings").select("finding_reference, finding_type, risk_level, title, failure_statement, criteria, objective_evidence, process_area, responsible_owner_name, agreed_date, status").eq("audit_id", id).eq("owner_id", user.id).order("created_at"),
    supabase.from("internal_audit_evidence").select("id").eq("audit_id", id).eq("owner_id", user.id),
  ]);
  for (const result of [auditResult, reportResult, teamResult, answersResult, findingsResult, evidenceResult]) if (result.error) return new Response(result.error.message, { status: 500 });
  if (!auditResult.data || !reportResult.data) return new Response("Controlled audit report not found", { status: 404 });

  const audit = auditResult.data, report = reportResult.data, team = teamResult.data || [], answers = answersResult.data || [], findings = findingsResult.data || [];
  const standards = (audit.internal_audit_selected_standards || []).map((row) => row.internal_audit_standard_catalogue?.display_name).filter(Boolean).join("; ");
  const count = (items, key, value) => items.filter((item) => item[key] === value).length;
  const pdf = await PDFDocument.create();
  pdf.setTitle(`${report.report_reference} - ${audit.title}`); pdf.setAuthor("RPG Excellence"); pdf.setSubject("Controlled internal audit report");
  const regular = await pdf.embedFont(StandardFonts.Helvetica), bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const contentWidth = PAGE.width - PAGE.margin * 2;
  let page, y;
  const wrap = (value, font = regular, size = 9.2, maxWidth = contentWidth) => {
    const lines = []; let line = "";
    for (const word of clean(value).split(" ")) {
      const candidate = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, size) <= maxWidth) line = candidate;
      else { if (line) lines.push(line); line = word; }
    }
    if (line) lines.push(line); return lines;
  };
  const newPage = () => {
    page = pdf.addPage([PAGE.width, PAGE.height]);
    page.drawRectangle({ x: 0, y: PAGE.height - 8, width: PAGE.width, height: 8, color: colours.blue });
    page.drawText("RPG EXCELLENCE", { x: PAGE.margin, y: PAGE.height - 32, size: 9, font: bold, color: colours.blue });
    page.drawText(clean(report.report_reference), { x: PAGE.width - PAGE.margin - 135, y: PAGE.height - 32, size: 8, font: regular, color: colours.grey });
    y = PAGE.height - 58;
  };
  const ensure = (space = 40) => { if (y - space < 55) newPage(); };
  const drawText = (value, options = {}) => {
    const font = options.bold ? bold : regular, size = options.size ?? 9.2, x = options.x ?? PAGE.margin, width = options.width ?? contentWidth, leading = options.leading ?? size + 3.2;
    const lines = wrap(value, font, size, width); ensure(lines.length * leading + (options.after ?? 5));
    for (const line of lines) { page.drawText(line, { x, y, size, font, color: options.color ?? colours.ink }); y -= leading; }
    y -= options.after ?? 5;
  };
  const section = (number, title) => {
    ensure(48); y -= 6;
    page.drawText(String(number).padStart(2, "0"), { x: PAGE.margin, y, size: 9, font: bold, color: colours.cyan });
    page.drawText(clean(title), { x: PAGE.margin + 28, y: y - 2, size: 15, font: bold, color: colours.navy });
    y -= 12; page.drawLine({ start: { x: PAGE.margin + 28, y }, end: { x: PAGE.width - PAGE.margin, y }, thickness: 1, color: colours.line }); y -= 18;
  };
  const keyValue = (name, value) => { ensure(34); page.drawText(clean(name).toUpperCase(), { x: PAGE.margin, y, size: 7, font: bold, color: colours.grey }); y -= 12; drawText(value, { size: 9.2, after: 8 }); };
  const metric = (x, top, width, value, title, accent) => {
    page.drawRectangle({ x, y: top - 58, width, height: 58, color: colours.pale, borderColor: colours.line, borderWidth: 0.7 });
    page.drawRectangle({ x, y: top - 58, width: 4, height: 58, color: accent });
    page.drawText(String(value), { x: x + 14, y: top - 27, size: 19, font: bold, color: accent });
    page.drawText(title, { x: x + 14, y: top - 44, size: 7.4, font: bold, color: colours.grey });
  };

  newPage();
  page.drawRectangle({ x: PAGE.margin, y: 538, width: contentWidth, height: 206, color: colours.navy });
  page.drawText(report.status === "issued" ? "CONTROLLED INTERNAL AUDIT REPORT" : "DRAFT - NOT CONTROLLED FOR ISSUE", { x: 64, y: 708, size: 9, font: bold, color: report.status === "issued" ? colours.cyan : rgb(1, 0.68, 0.35) });
  let coverY = 666;
  for (const line of wrap(audit.title, bold, 25, contentWidth - 44).slice(0, 4)) { page.drawText(line, { x: 64, y: coverY, size: 25, font: bold, color: colours.white }); coverY -= 31; }
  page.drawText(clean(audit.audit_reference), { x: 64, y: 560, size: 12, font: regular, color: colours.white });
  y = 505;
  const cardWidth = (contentWidth - 24) / 4;
  metric(PAGE.margin, y, cardWidth, answers.length, "CRITERIA ASSESSED", colours.blue);
  metric(PAGE.margin + cardWidth + 8, y, cardWidth, count(findings, "finding_type", "major_nc"), "MAJOR NC", colours.red);
  metric(PAGE.margin + (cardWidth + 8) * 2, y, cardWidth, count(findings, "finding_type", "minor_nc"), "MINOR NC", colours.amber);
  metric(PAGE.margin + (cardWidth + 8) * 3, y, cardWidth, findings.length, "TOTAL FINDINGS", colours.cyan);
  y -= 92;
  keyValue("Report reference and version", `${report.report_reference} | Version ${report.report_version || 1}`);
  keyValue("Audit dates", `${date(audit.planned_start_at)} to ${date(audit.planned_end_at)}`); keyValue("Lead auditor", report.lead_auditor_name);
  keyValue("Status", `${label(report.status)}${report.issued_at ? ` | Issued ${date(report.issued_at)}` : ""}`);

  newPage();
  section(1, "Executive summary"); drawText(report.executive_summary, { size: 10, leading: 14 });
  section(2, "Audit profile and approved scope");
  keyValue("Audit reference", audit.audit_reference); keyValue("Standards and criteria", standards); keyValue("Scope", audit.scope_statement);
  keyValue("Processes", audit.processes); keyValue("Sites", audit.sites); keyValue("Audit team", team.map((member) => `${member.member_name} (${label(member.audit_role)})`).join("; "));
  section(3, "Methodology, sampling and limitations"); drawText(report.methodology_and_sampling, { size: 9.5, leading: 13 });
  keyValue("Limitations and exclusions", report.limitations_and_exclusions); keyValue("Unresolved differences", report.unresolved_differences);
  section(4, "Overall management-system conclusion"); drawText(report.overall_conclusion, { size: 10, leading: 14 });

  section(5, "Criteria results and traceability");
  if (!answers.length) drawText("No assessed criteria were recorded.");
  for (const answer of answers) {
    const question = answer.internal_audit_questions || {};
    const accent = answer.result === "nonconforming" ? colours.red : answer.result === "partially_conforming" ? colours.amber : colours.blue;
    const narrative = `${question.process_area || "Approved criterion"}: ${answer.conclusion || question.question_text || "No conclusion recorded."}${answer.auditor_notes ? ` Auditor note: ${answer.auditor_notes}` : ""}`;
    const lines = wrap(narrative, regular, 8.8, contentWidth - 24); ensure(38 + lines.length * 12);
    page.drawRectangle({ x: PAGE.margin, y: y - (25 + lines.length * 12), width: contentWidth, height: 25 + lines.length * 12, color: colours.pale, borderColor: colours.line, borderWidth: 0.6 });
    page.drawRectangle({ x: PAGE.margin, y: y - (25 + lines.length * 12), width: 4, height: 25 + lines.length * 12, color: accent });
    page.drawText(`${clean(question.question_code || question.clause || "Criterion")} | ${label(answer.result)}`, { x: PAGE.margin + 13, y: y - 15, size: 9, font: bold, color: colours.navy });
    let rowY = y - 30; for (const line of lines) { page.drawText(line, { x: PAGE.margin + 13, y: rowY, size: 8.8, font: regular, color: colours.ink }); rowY -= 12; }
    y -= 35 + lines.length * 12;
  }

  section(6, "Controlled findings");
  if (!findings.length) drawText("No controlled findings were raised.");
  for (const finding of findings) {
    const details = [["Finding", `${finding.finding_reference} | ${label(finding.finding_type)} | ${label(finding.risk_level)}`], ["Headline", finding.title], ["Requirement", finding.criteria], ["Objective evidence", finding.objective_evidence], ...(finding.failure_statement ? [["Statement of nonconformity", finding.failure_statement]] : []), ["Owner / due date / status", `${finding.responsible_owner_name || "Unassigned"} | ${date(finding.agreed_date)} | ${label(finding.status)}`]];
    ensure(120); page.drawRectangle({ x: PAGE.margin, y: y - 3, width: contentWidth, height: 3, color: ["major_nc", "minor_nc"].includes(finding.finding_type) ? colours.red : colours.blue }); y -= 18;
    for (const [name, value] of details) { page.drawText(name.toUpperCase(), { x: PAGE.margin, y, size: 6.8, font: bold, color: colours.grey }); y -= 11; drawText(value, { x: PAGE.margin + 12, width: contentWidth - 12, size: 8.7, leading: 11, after: 6 }); }
    y -= 9;
  }

  section(7, "Report control and distribution");
  keyValue("Confidentiality", label(report.confidentiality_classification)); keyValue("Distribution", report.distribution_list);
  keyValue("Evidence records retained", String((evidenceResult.data || []).length)); keyValue("Lead auditor", report.lead_auditor_name);
  drawText("This report is generated from the controlled audit record. AI-assisted narrative, where used, remains subject to lead-auditor review and approval. Findings, classifications, criteria results and objective-evidence records are reproduced from controlled source data.", { size: 8.5, color: colours.grey, after: 8 });

  const pages = pdf.getPages();
  pages.forEach((currentPage, index) => {
    currentPage.drawLine({ start: { x: PAGE.margin, y: 40 }, end: { x: PAGE.width - PAGE.margin, y: 40 }, thickness: 0.7, color: colours.line });
    currentPage.drawText(`${report.status === "issued" ? "CONTROLLED" : "DRAFT"} | ${label(report.confidentiality_classification)} | ${report.report_reference} v${report.report_version || 1}`, { x: PAGE.margin, y: 25, size: 7.2, font: regular, color: colours.grey });
    currentPage.drawText(`Page ${index + 1} of ${pages.length}`, { x: PAGE.width - PAGE.margin - 58, y: 25, size: 7.2, font: regular, color: colours.grey });
  });
  const bytes = await pdf.save();
  const safeName = `${report.report_reference}-${report.status}.pdf`.replace(/[^a-zA-Z0-9._-]/g, "-");
  return new Response(bytes, { headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${safeName}"`, "Cache-Control": "private, no-store" } });
}
