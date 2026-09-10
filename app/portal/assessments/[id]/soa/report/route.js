import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { createClient } from "../../../../../../lib/supabase/server";
import { createAdminClient } from "../../../../../../lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PAGE = { width: 595.28, height: 841.89, margin: 42 };
const C = {
  navy: rgb(0.025, 0.102, 0.2), blue: rgb(0.08, 0.35, 0.85), cyan: rgb(0.08, 0.7, 0.76),
  ink: rgb(0.07, 0.13, 0.21), grey: rgb(0.37, 0.44, 0.53), pale: rgb(0.95, 0.97, 0.99),
  line: rgb(0.83, 0.87, 0.92), green: rgb(0.04, 0.5, 0.3), amber: rgb(0.82, 0.48, 0.04),
  red: rgb(0.7, 0.1, 0.14), white: rgb(1, 1, 1),
};

const clean = (value, fallback = "Not recorded") => String(value ?? fallback)
  .replace(/[\u2010-\u2015]/g, "-").replace(/[\u2018\u2019]/g, "'")
  .replace(/[\u201c\u201d]/g, '"').replace(/[^\x20-\x7E]/g, " ")
  .replace(/\s+/g, " ").trim() || fallback;
const label = (value) => clean(value).replaceAll("_", " ").replace(/\b\w/g, (x) => x.toUpperCase());
const date = (value) => value ? new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(new Date(value)) : "Not recorded";

export async function GET(_request, { params }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorised", { status: 401 });

  const { data: assessment, error: assessmentError } = await supabase.from("assessments")
    .select("id, owner_id, standard, status").eq("id", id).eq("owner_id", user.id).maybeSingle();
  if (assessmentError) return new Response(assessmentError.message, { status: 500 });
  if (!assessment) return new Response("Assessment not found", { status: 404 });

  const admin = createAdminClient();
  const [registerResult, entriesResult, catalogResult, findingsResult] = await Promise.all([
    admin.from("assessment_soa_registers").select("*").eq("assessment_id", id).eq("owner_id", user.id).maybeSingle(),
    admin.from("assessment_soa_entries").select("*").eq("assessment_id", id).eq("owner_id", user.id),
    supabase.from("iso27001_control_catalog").select("*").eq("active", true).order("control_order"),
    admin.from("assessment_findings").select("*").eq("assessment_id", id).eq("owner_id", user.id).neq("finding_type", "conformity").order("created_at"),
  ]);
  for (const result of [registerResult, entriesResult, catalogResult, findingsResult]) {
    if (result.error) return new Response(result.error.message, { status: 500 });
  }
  if (!registerResult.data) return new Response("Statement of Applicability not found", { status: 404 });

  const register = registerResult.data;
  const entryMap = new Map((entriesResult.data || []).map((row) => [row.control_id, row]));
  const controls = (catalogResult.data || []).map((control) => ({ ...control, ...entryMap.get(control.control_id) }));
  const findings = findingsResult.data || [];
  const count = (fn) => controls.filter(fn).length;
  const applicable = count((x) => x.applicability === "applicable");
  const excluded = count((x) => x.applicability === "not_applicable");
  const pending = count((x) => x.applicability === "pending");
  const effective = count((x) => x.implementation_status === "effective");
  const elevated = count((x) => ["high", "critical"].includes(x.residual_risk_level));
  const openFindings = findings.filter((x) => x.status !== "closed").length;
  const completion = controls.length ? Math.round(((controls.length - pending) / controls.length) * 100) : 0;
  const reference = register.report_reference || `SOA-${String(register.id).replaceAll("-", "").slice(0, 8).toUpperCase()}-RPT`;
  const status = register.report_status || "draft";
  const isControlled = ["approved", "issued"].includes(status);

  const pdf = await PDFDocument.create();
  pdf.setTitle(`${reference} - Statement of Applicability`);
  pdf.setAuthor("RPG Excellence");
  pdf.setSubject("ISO/IEC 27001 Statement of Applicability controlled report");
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const width = PAGE.width - PAGE.margin * 2;
  let page, y;

  const wrap = (value, font = regular, size = 8.8, maxWidth = width) => {
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
    page.drawRectangle({ x: 0, y: PAGE.height - 8, width: PAGE.width, height: 8, color: C.blue });
    page.drawText("RPG EXCELLENCE", { x: PAGE.margin, y: PAGE.height - 31, size: 9, font: bold, color: C.blue });
    page.drawText("ISO/IEC 27001 STATEMENT OF APPLICABILITY", { x: PAGE.width - PAGE.margin - 205, y: PAGE.height - 31, size: 7.3, font: bold, color: C.grey });
    y = PAGE.height - 58;
  };
  const ensure = (space = 40) => { if (y - space < 55) newPage(); };
  const text = (value, options = {}) => {
    const font = options.bold ? bold : regular, size = options.size ?? 8.8;
    const lines = wrap(value, font, size, options.width ?? width);
    ensure(lines.length * (options.leading ?? size + 3) + (options.after ?? 5));
    for (const line of lines) { page.drawText(line, { x: options.x ?? PAGE.margin, y, size, font, color: options.color ?? C.ink }); y -= options.leading ?? size + 3; }
    y -= options.after ?? 5;
  };
  const section = (number, title) => {
    ensure(45); y -= 5;
    page.drawText(String(number).padStart(2, "0"), { x: PAGE.margin, y, size: 8.5, font: bold, color: C.cyan });
    page.drawText(clean(title), { x: PAGE.margin + 27, y: y - 2, size: 14, font: bold, color: C.navy });
    y -= 12; page.drawLine({ start: { x: PAGE.margin + 27, y }, end: { x: PAGE.width - PAGE.margin, y }, thickness: 1, color: C.line }); y -= 17;
  };
  const keyValue = (name, value) => {
    ensure(32); page.drawText(clean(name).toUpperCase(), { x: PAGE.margin, y, size: 6.8, font: bold, color: C.grey }); y -= 11;
    text(value, { size: 8.8, after: 7 });
  };
  const metric = (x, top, cardWidth, value, title, accent) => {
    page.drawRectangle({ x, y: top - 58, width: cardWidth, height: 58, color: C.pale, borderColor: C.line, borderWidth: .7 });
    page.drawRectangle({ x, y: top - 58, width: 4, height: 58, color: accent });
    page.drawText(String(value), { x: x + 13, y: top - 27, size: 18, font: bold, color: accent });
    page.drawText(title, { x: x + 13, y: top - 44, size: 6.5, font: bold, color: C.grey });
  };

  newPage();
  page.drawRectangle({ x: PAGE.margin, y: 530, width, height: 215, color: C.navy });
  page.drawText(isControlled ? "CONTROLLED SoA REPORT" : "DRAFT - NOT CONTROLLED FOR ISSUE", { x: 64, y: 708, size: 9, font: bold, color: isControlled ? C.cyan : rgb(1, .68, .35) });
  page.drawText("STATEMENT OF", { x: 64, y: 662, size: 26, font: bold, color: C.white });
  page.drawText("APPLICABILITY", { x: 64, y: 628, size: 26, font: bold, color: C.white });
  page.drawText(clean(assessment.standard), { x: 64, y: 582, size: 12, font: regular, color: C.white });
  page.drawText(clean(reference), { x: 64, y: 557, size: 10, font: bold, color: C.cyan });
  y = 495;
  const cardWidth = (width - 24) / 4;
  metric(PAGE.margin, y, cardWidth, `${completion}%`, "DECISIONS COMPLETE", C.blue);
  metric(PAGE.margin + cardWidth + 8, y, cardWidth, applicable, "APPLICABLE", C.green);
  metric(PAGE.margin + (cardWidth + 8) * 2, y, cardWidth, effective, "EFFECTIVE", C.green);
  metric(PAGE.margin + (cardWidth + 8) * 3, y, cardWidth, elevated, "HIGH / CRITICAL RISK", elevated ? C.red : C.green);
  y -= 88;
  keyValue("Report status", `${label(status)} | ${label(register.report_confidentiality || "Internal")}`);
  keyValue("SoA version", register.version || "1.0");
  keyValue("Generated", date(new Date().toISOString()));
  keyValue("Prepared / reviewed / approved", `${register.prepared_by || "Not recorded"} | ${register.reviewed_by || "Not recorded"} | ${register.approved_by || "Not recorded"}`);

  newPage();
  section(1, "Executive summary"); text(register.executive_summary, { size: 9.7, leading: 13.5 });
  section(2, "ISMS scope and governance");
  keyValue("ISMS scope", register.isms_scope); keyValue("Risk assessment reference", register.risk_assessment_reference);
  keyValue("Risk treatment plan reference", register.risk_treatment_plan_reference);
  keyValue("Methodology and sampling", register.methodology_and_sampling);
  keyValue("Limitations and exclusions", register.limitations_and_exclusions);
  section(3, "Assurance position");
  text(`${controls.length} controls reviewed; ${applicable} applicable; ${excluded} not applicable; ${pending} pending; ${effective} concluded effective; ${elevated} High or Critical residual risks; ${openFindings} open findings.`, { size: 10, leading: 14 });
  keyValue("Unresolved matters", register.unresolved_matters);
  keyValue("Overall conclusion", register.overall_conclusion);

  section(4, "Annex A control analysis");
  for (const theme of [["Organisational controls", "5."], ["People controls", "6."], ["Physical controls", "7."], ["Technological controls", "8."]]) {
    const rows = controls.filter((x) => String(x.control_id).startsWith(theme[1]));
    const decided = rows.filter((x) => x.applicability !== "pending").length;
    const done = rows.filter((x) => x.implementation_status === "effective").length;
    ensure(44); page.drawRectangle({ x: PAGE.margin, y: y - 35, width, height: 35, color: C.pale, borderColor: C.line, borderWidth: .6 });
    page.drawText(theme[0], { x: PAGE.margin + 12, y: y - 15, size: 9, font: bold, color: C.navy });
    page.drawText(`${decided}/${rows.length} decided | ${done} effective`, { x: PAGE.width - PAGE.margin - 155, y: y - 15, size: 8.2, font: regular, color: C.grey }); y -= 44;
  }

  section(5, "Full Statement of Applicability");
  for (const row of controls) {
    const details = `${label(row.applicability || "pending")} | ${label(row.implementation_status || "not_assessed")} | Residual risk: ${label(row.residual_risk_level || "not_assessed")}`;
    const rationale = row.applicability === "not_applicable" ? row.applicability_justification : (row.implemented_controls_description || row.applicability_justification);
    const evidence = row.effectiveness_evidence || row.implementation_evidence;
    const titleLines = wrap(`A.${row.control_id} ${row.control_title}`, bold, 8.5, width - 22);
    const detailLines = wrap(details, regular, 7.7, width - 22);
    const rationaleLines = wrap(`Decision basis / implementation: ${clean(rationale)}`, regular, 7.7, width - 22).slice(0, 5);
    const evidenceLines = wrap(`Evidence / conclusion: ${clean(evidence || row.assessor_conclusion)}`, regular, 7.7, width - 22).slice(0, 5);
    const height = 17 + (titleLines.length + detailLines.length + rationaleLines.length + evidenceLines.length) * 10;
    ensure(height + 9);
    const accent = row.applicability === "pending" || ["high", "critical"].includes(row.residual_risk_level) ? C.red : row.implementation_status === "effective" ? C.green : C.blue;
    page.drawRectangle({ x: PAGE.margin, y: y - height, width, height, color: C.pale, borderColor: C.line, borderWidth: .5 });
    page.drawRectangle({ x: PAGE.margin, y: y - height, width: 4, height, color: accent });
    let rowY = y - 13;
    for (const line of titleLines) { page.drawText(line, { x: PAGE.margin + 11, y: rowY, size: 8.5, font: bold, color: C.navy }); rowY -= 10; }
    for (const group of [detailLines, rationaleLines, evidenceLines]) for (const line of group) { page.drawText(line, { x: PAGE.margin + 11, y: rowY, size: 7.7, font: regular, color: C.ink }); rowY -= 10; }
    y -= height + 8;
  }

  section(6, "Findings and actions");
  if (!findings.length) text("No formal findings are linked to this assessment.");
  for (const finding of findings) {
    keyValue("Finding", `${finding.question_number || finding.id} | ${label(finding.finding_type)} | ${label(finding.status)}`);
    keyValue("Statement", finding.finding_statement || finding.statement || finding.title);
    keyValue("Objective evidence", finding.objective_evidence);
  }
  section(7, "Report control");
  keyValue("Distribution", register.distribution_list); keyValue("Confidentiality", register.report_confidentiality || "Internal");
  keyValue("Prepared by", register.prepared_by); keyValue("Reviewed by", register.reviewed_by); keyValue("Approved by", register.approved_by);
  text("This report is generated from the controlled RPG Intelligence assessment and SoA records. Guided narrative and automated metrics remain subject to accountable review. ISO/IEC 27002:2022 is referenced as implementation guidance and does not replace ISO/IEC 27001 requirements or accredited certification judgement.", { size: 8, color: C.grey });

  const pages = pdf.getPages();
  pages.forEach((current, index) => {
    current.drawLine({ start: { x: PAGE.margin, y: 40 }, end: { x: PAGE.width - PAGE.margin, y: 40 }, thickness: .7, color: C.line });
    current.drawText(`${isControlled ? "CONTROLLED" : "DRAFT"} | ${label(register.report_confidentiality || "Internal")} | ${clean(reference)}`, { x: PAGE.margin, y: 25, size: 6.8, font: regular, color: C.grey });
    current.drawText(`Page ${index + 1} of ${pages.length}`, { x: PAGE.width - PAGE.margin - 58, y: 25, size: 6.8, font: regular, color: C.grey });
  });
  const bytes = await pdf.save();
  const fileName = `${reference}-${status}.pdf`.replace(/[^a-zA-Z0-9._-]/g, "-");
  return new Response(bytes, { headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${fileName}"`, "Cache-Control": "private, no-store" } });
}
