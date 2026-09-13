import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { createClient } from "../../../../../../lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PAGE = { width: 841.89, height: 595.28, margin: 34 };
const colours = {
  navy: rgb(0.025, 0.11, 0.23), blue: rgb(0.08, 0.34, 0.84), teal: rgb(0.03, 0.5, 0.4),
  ink: rgb(0.07, 0.14, 0.23), grey: rgb(0.38, 0.45, 0.53), pale: rgb(0.95, 0.97, 0.985),
  line: rgb(0.82, 0.87, 0.91), white: rgb(1, 1, 1), red: rgb(0.75, 0.16, 0.14), amber: rgb(0.84, 0.5, 0.04), green: rgb(0.04, 0.52, 0.34),
};
const clean = (value, fallback = "Not recorded") => String(value ?? fallback).replace(/[\u2010-\u2015]/g, "-").replace(/[^\x20-\x7E]/g, " ").replace(/\s+/g, " ").trim() || fallback;
const label = (value) => clean(value).replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
const date = (value) => value ? new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(new Date(value)) : "Not recorded";
const band = (score) => score >= 15 ? "Unacceptable" : score >= 10 ? "Inadequate" : score >= 5 ? "Adequate" : score > 0 ? "Acceptable" : "Not scored";
const bandColour = (score) => score >= 15 ? colours.red : score >= 10 ? rgb(0.9, 0.34, 0.13) : score >= 5 ? colours.amber : colours.green;

export async function GET(_request, { params }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorised", { status: 401 });

  const [assessmentResult, hazardsResult, actionsResult] = await Promise.all([
    supabase.from("hs_risk_assessments").select("*").eq("id", id).eq("owner_id", user.id).maybeSingle(),
    supabase.from("hs_risk_hazards").select("*").eq("assessment_id", id).eq("owner_id", user.id).order("display_order"),
    supabase.from("hs_risk_actions").select("*").eq("assessment_id", id).eq("owner_id", user.id).order("target_date"),
  ]);
  for (const result of [assessmentResult, hazardsResult, actionsResult]) if (result.error) return new Response(result.error.message, { status: 500 });
  const assessment = assessmentResult.data;
  if (!assessment) return new Response("Risk assessment not found", { status: 404 });
  if (!["approved", "communicated"].includes(assessment.status)) return new Response("A controlled PDF is available only after approval.", { status: 409 });
  const hazards = hazardsResult.data || [];
  const actions = actionsResult.data || [];

  const pdf = await PDFDocument.create();
  pdf.setTitle(`${clean(assessment.assessment_reference)} - ${clean(assessment.title)}`);
  pdf.setAuthor("RPG Excellence");
  pdf.setSubject("Controlled workplace risk assessment");
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const contentWidth = PAGE.width - PAGE.margin * 2;
  let page;
  let y;

  const wrap = (value, font = regular, size = 8, maxWidth = contentWidth) => {
    const lines = []; let line = "";
    for (const word of clean(value).split(" ")) {
      const candidate = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, size) <= maxWidth) line = candidate;
      else { if (line) lines.push(line); line = word; }
    }
    if (line) lines.push(line);
    return lines;
  };
  const newPage = () => {
    page = pdf.addPage([PAGE.width, PAGE.height]);
    page.drawRectangle({ x: 0, y: PAGE.height - 7, width: PAGE.width, height: 7, color: colours.blue });
    page.drawText("RPG EXCELLENCE | CONTROLLED RISK ASSESSMENT", { x: PAGE.margin, y: PAGE.height - 27, size: 8, font: bold, color: colours.blue });
    page.drawText(clean(assessment.assessment_reference), { x: PAGE.width - PAGE.margin - 120, y: PAGE.height - 27, size: 8, font: bold, color: colours.grey });
    y = PAGE.height - 47;
  };
  const ensure = (space = 36) => { if (y - space < 48) newPage(); };
  const drawText = (value, options = {}) => {
    const font = options.bold ? bold : regular, size = options.size ?? 8.2, x = options.x ?? PAGE.margin, width = options.width ?? contentWidth, leading = options.leading ?? size + 2.8;
    const lines = wrap(value, font, size, width); ensure(lines.length * leading + 8);
    for (const line of lines) { page.drawText(line, { x, y, size, font, color: options.color ?? colours.ink }); y -= leading; }
    y -= options.after ?? 4;
  };
  const section = (title) => {
    ensure(35); y -= 4;
    page.drawText(clean(title), { x: PAGE.margin, y, size: 14, font: bold, color: colours.navy });
    y -= 9; page.drawLine({ start: { x: PAGE.margin, y }, end: { x: PAGE.width - PAGE.margin, y }, thickness: 1, color: colours.line }); y -= 16;
  };
  const keyValues = (items) => {
    const cols = 4, gap = 8, width = (contentWidth - gap * (cols - 1)) / cols;
    for (let start = 0; start < items.length; start += cols) {
      ensure(48); const row = items.slice(start, start + cols); const top = y;
      row.forEach(([name, value], index) => {
        const x = PAGE.margin + index * (width + gap);
        page.drawRectangle({ x, y: top - 41, width, height: 41, color: colours.pale, borderColor: colours.line, borderWidth: .5 });
        page.drawText(clean(name).toUpperCase(), { x: x + 8, y: top - 12, size: 6.2, font: bold, color: colours.grey });
        const lines = wrap(value, bold, 7.7, width - 16).slice(0, 2);
        lines.forEach((line, lineIndex) => page.drawText(line, { x: x + 8, y: top - 25 - lineIndex * 9, size: 7.7, font: bold, color: colours.ink }));
      });
      y -= 49;
    }
  };

  newPage();
  page.drawRectangle({ x: PAGE.margin, y: 395, width: contentWidth, height: 125, color: colours.navy });
  page.drawText("APPROVED CONTROLLED ASSESSMENT", { x: 54, y: 491, size: 8, font: bold, color: rgb(0.35, 0.88, 0.8) });
  let titleY = 460;
  for (const line of wrap(assessment.title, bold, 23, contentWidth - 40).slice(0, 3)) { page.drawText(line, { x: 54, y: titleY, size: 23, font: bold, color: colours.white }); titleY -= 27; }
  page.drawText(`${clean(assessment.assessment_reference)} | Version ${assessment.version || 1} | ${label(assessment.status)}`, { x: 54, y: 411, size: 9, font: regular, color: colours.white });
  y = 374;
  keyValues([["Assessment date", date(assessment.assessment_date)], ["Approved", date(assessment.approved_at)], ["Planned review", date(assessment.review_date)], ["Review frequency", assessment.review_frequency_months ? `Every ${assessment.review_frequency_months} months` : "Event-based / significant change"], ["Assessor", assessment.assessor_name], ["Competent approver", assessment.approver_name], ["Site / location", assessment.site_location], ["Area / department", assessment.area_department]]);
  section("Assessment scope and people");
  drawText(assessment.task_description, { size: 9, leading: 12 });
  keyValues([["Assessment type", label(assessment.assessment_type)], ["Section / laboratory", assessment.section_lab], ["People at risk", (assessment.persons_at_risk || []).join(", ")], ["Project / job", assessment.project_number], ["Safe system", assessment.safe_system_reference], ["COSHH / SDS", assessment.coshh_msds_reference], ["Permit", assessment.permit_required ? assessment.permit_reference : "Not required"], ["Emergency arrangements", assessment.emergency_arrangements]]);
  drawText(`Worker consultation: ${clean(assessment.consultation_summary)}`, { size: 8 });

  newPage(); section("Hazards, controls and risk decisions");
  if (!hazards.length) drawText("No hazards recorded.");
  hazards.forEach((hazard, index) => {
    const initial = hazard.current_score || 0, residual = hazard.residual_score || 0;
    const rows = [
      ["People / harm", `${clean(hazard.people_exposed)} | ${clean(hazard.harm_description)}`],
      ["Existing controls", hazard.existing_controls], ["Additional controls", hazard.additional_controls],
      ["Risk decision", `${label(hazard.risk_decision)} | Authority: ${clean(hazard.acceptance_authority)} | ${clean(hazard.acceptance_rationale)}`],
    ];
    const rowLines = rows.reduce((total, [, value]) => total + wrap(value, regular, 7.3, contentWidth - 125).length, 0);
    ensure(67 + rowLines * 9);
    page.drawRectangle({ x: PAGE.margin, y: y - 26, width: contentWidth, height: 26, color: colours.pale });
    page.drawText(`${String(index + 1).padStart(2, "0")}  ${clean(hazard.hazard_category)} - ${clean(hazard.hazard_description)}`, { x: PAGE.margin + 9, y: y - 17, size: 9, font: bold, color: colours.navy });
    page.drawText(`Initial ${initial} (${band(initial)})`, { x: PAGE.width - 245, y: y - 17, size: 7.2, font: bold, color: bandColour(initial) });
    page.drawText(`Residual ${residual} (${band(residual)})`, { x: PAGE.width - 140, y: y - 17, size: 7.2, font: bold, color: bandColour(residual) });
    y -= 38;
    for (const [name, value] of rows) {
      page.drawText(name.toUpperCase(), { x: PAGE.margin + 9, y, size: 6.2, font: bold, color: colours.grey });
      const lines = wrap(value, regular, 7.3, contentWidth - 125);
      lines.forEach((line, lineIndex) => page.drawText(line, { x: PAGE.margin + 112, y: y - lineIndex * 9, size: 7.3, font: regular, color: colours.ink }));
      y -= Math.max(13, lines.length * 9 + 3);
    }
    y -= 10;
  });

  section("Risk-reduction action plan");
  if (!actions.length) drawText("No additional risk-reduction actions were recorded.");
  actions.forEach((action) => {
    ensure(63);
    page.drawRectangle({ x: PAGE.margin, y: y - 49, width: contentWidth, height: 49, color: colours.pale, borderColor: colours.line, borderWidth: .5 });
    page.drawText(`${clean(action.action_reference)} | ${label(action.priority)} | ${label(action.status)}`, { x: PAGE.margin + 9, y: y - 13, size: 7, font: bold, color: action.status === "effective" ? colours.green : colours.blue });
    const lines = wrap(action.action_required, bold, 8, contentWidth - 270).slice(0, 2);
    lines.forEach((line, index) => page.drawText(line, { x: PAGE.margin + 9, y: y - 28 - index * 10, size: 8, font: bold, color: colours.ink }));
    page.drawText(`Owner: ${clean(action.responsible_name)}`, { x: PAGE.width - 260, y: y - 27, size: 7.2, font: regular, color: colours.ink });
    page.drawText(`Target: ${date(action.target_date)} | Verified: ${date(action.verified_at)}`, { x: PAGE.width - 260, y: y - 39, size: 7.2, font: regular, color: colours.grey });
    y -= 58;
  });

  section("Approval, communication and document control");
  keyValues([["Approved by", assessment.approver_name], ["Approved date", date(assessment.approved_at)], ["Status", label(assessment.status)], ["Communicated", date(assessment.communicated_at)]]);
  drawText(`Approval comment: ${clean(assessment.approval_comment, "No additional comment")}`, { size: 8.2 });
  drawText("Controlled when viewed within RPG Intelligence. Printed copies are uncontrolled unless formally issued. Confirm current operational conditions and the live assessment status before relying on a printed copy.", { size: 7.5, color: colours.grey });

  const pages = pdf.getPages();
  pages.forEach((currentPage, index) => {
    currentPage.drawLine({ start: { x: PAGE.margin, y: 34 }, end: { x: PAGE.width - PAGE.margin, y: 34 }, thickness: .6, color: colours.line });
    currentPage.drawText(`CONTROLLED | ${clean(assessment.assessment_reference)} v${assessment.version || 1} | Approved ${date(assessment.approved_at)}`, { x: PAGE.margin, y: 20, size: 6.7, font: regular, color: colours.grey });
    currentPage.drawText(`Page ${index + 1} of ${pages.length}`, { x: PAGE.width - PAGE.margin - 50, y: 20, size: 6.7, font: regular, color: colours.grey });
  });
  const bytes = await pdf.save();
  const fileName = `${clean(assessment.assessment_reference)}-v${assessment.version || 1}.pdf`.replace(/[^a-zA-Z0-9._-]/g, "-");
  return new Response(bytes, { headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${fileName}"`, "Cache-Control": "private, no-store" } });
}
