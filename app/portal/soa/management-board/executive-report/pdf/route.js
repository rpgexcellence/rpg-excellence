import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { createClient } from "../../../../../../lib/supabase/server";
import { createAdminClient } from "../../../../../../lib/supabase/admin";
import { loadSoaBoardReportData } from "../report-data";

export const dynamic = "force-dynamic";

const PAGE = { width: 595.28, height: 841.89, margin: 48 };
const navy = rgb(0.027, 0.102, 0.2);
const blue = rgb(0.078, 0.349, 0.851);
const teal = rgb(0.043, 0.557, 0.506);
const grey = rgb(0.38, 0.47, 0.56);
const pale = rgb(0.94, 0.965, 0.98);
const white = rgb(1, 1, 1);

const safe = (value) => String(value ?? "")
  .replace(/[‘’]/g, "'")
  .replace(/[“”]/g, '"')
  .replace(/[–—]/g, "-")
  .replace(/×/g, "x")
  .replace(/→/g, "->")
  .replace(/•/g, "-")
  .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, "");

function wrap(text, font, size, width) {
  const paragraphs = safe(text).split(/\r?\n/);
  const lines = [];
  for (const paragraph of paragraphs) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    if (!words.length) { lines.push(""); continue; }
    let line = "";
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, size) <= width) line = candidate;
      else { if (line) lines.push(line); line = word; }
    }
    if (line) lines.push(line);
  }
  return lines;
}

export async function GET(request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response("Authentication required.", { status: 401 });

  const admin = createAdminClient();
  const url = new URL(request.url);
  let organizationId = url.searchParams.get("organization");

  if (!organizationId) {
    const { data: organisation } = await admin.from("organizations").select("id").eq("owner_id", user.id).order("created_at").limit(1).maybeSingle();
    organizationId = organisation?.id;
  }
  if (!organizationId) return new Response("Organisation not found.", { status: 404 });

  let data;
  try {
    data = await loadSoaBoardReportData(admin, user.id, organizationId);
  } catch (error) {
    return new Response(error.message || "Unable to create report.", { status: 500 });
  }

  const { organisation, metrics, report, generated, topRisks, ready } = data;
  const reference = report?.report_reference || `SOA-MB-${new Date().toISOString().slice(0, 7).replace("-", "")}-${organizationId.replaceAll("-", "").slice(0, 6).toUpperCase()}`;
  const status = report?.report_status || "draft";
  const confidentiality = report?.report_confidentiality || "Internal";
  const content = {
    executiveSummary: report?.executive_summary || generated.executiveSummary,
    portfolioScope: report?.portfolio_scope || generated.portfolioScope,
    methodology: report?.methodology_and_sampling || generated.methodology,
    principalRisks: report?.principal_risks || generated.principalRisks,
    treatmentPriorities: report?.treatment_priorities || generated.treatmentPriorities,
    limitations: report?.limitations_and_exclusions || generated.limitations,
    conclusion: report?.overall_conclusion || generated.conclusion,
  };

  const pdf = await PDFDocument.create();
  pdf.setTitle(`${reference} - SoA Board Executive Report`);
  pdf.setAuthor("RPG Excellence");
  pdf.setSubject("Controlled Statement of Applicability portfolio management report");
  pdf.setCreationDate(new Date());
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  let page;
  let y;

  const addPage = () => {
    page = pdf.addPage([PAGE.width, PAGE.height]);
    page.drawRectangle({ x: 0, y: PAGE.height - 72, width: PAGE.width, height: 72, color: navy });
    page.drawText("RPG EXCELLENCE", { x: PAGE.margin, y: PAGE.height - 37, size: 16, font: bold, color: white });
    page.drawText("SoA BOARD EXECUTIVE REPORT", { x: PAGE.margin, y: PAGE.height - 55, size: 8, font: bold, color: rgb(.55, .88, .84) });
    page.drawText(safe(reference), { x: 390, y: PAGE.height - 38, size: 8, font: bold, color: white });
    page.drawText(safe(`${status.toUpperCase()} | ${confidentiality}`), { x: 390, y: PAGE.height - 54, size: 7, font: regular, color: rgb(.78, .86, .92) });
    y = PAGE.height - 104;
  };

  const ensure = (height = 40) => { if (y - height < 58) addPage(); };
  const heading = (title) => {
    ensure(35);
    page.drawText(safe(title), { x: PAGE.margin, y, size: 14, font: bold, color: navy });
    page.drawLine({ start: { x: PAGE.margin, y: y - 7 }, end: { x: PAGE.width - PAGE.margin, y: y - 7 }, thickness: 1, color: teal });
    y -= 25;
  };
  const paragraph = (value) => {
    const lines = wrap(value, regular, 9.5, PAGE.width - PAGE.margin * 2);
    for (const line of lines) {
      ensure(15);
      page.drawText(line, { x: PAGE.margin, y, size: 9.5, font: regular, color: navy });
      y -= 14;
    }
    y -= 9;
  };

  addPage();
  page.drawText("STATEMENT OF APPLICABILITY", { x: PAGE.margin, y, size: 10, font: bold, color: teal });
  y -= 28;
  page.drawText("Management Board", { x: PAGE.margin, y, size: 29, font: bold, color: navy });
  y -= 35;
  page.drawText("Executive Report", { x: PAGE.margin, y, size: 22, font: bold, color: blue });
  y -= 31;
  page.drawText(safe(organisation.name), { x: PAGE.margin, y, size: 14, font: bold, color: grey });
  y -= 34;

  page.drawRectangle({ x: PAGE.margin, y: y - 78, width: PAGE.width - PAGE.margin * 2, height: 78, color: ready ? rgb(.9, .97, .94) : rgb(.99, .94, .91) });
  page.drawText(ready ? "PORTFOLIO POSITIONED FOR APPROVAL" : "MANAGEMENT ATTENTION REQUIRED", { x: PAGE.margin + 18, y: y - 28, size: 13, font: bold, color: ready ? rgb(.04, .47, .3) : rgb(.7, .14, .1) });
  page.drawText(`${metrics.decisionCompletion}% decision completion | ${metrics.elevated} elevated risks | ${metrics.openFindings} open findings`, { x: PAGE.margin + 18, y: y - 51, size: 10, font: regular, color: navy });
  y -= 105;

  heading("Portfolio assurance metrics");
  const metricRows = [
    ["Controlled SoAs", `${metrics.approvedRegisters}/${metrics.soaCount} approved`, "Decision completion", `${metrics.decisionCompletion}%`],
    ["Implementation", `${metrics.implementationRate}%`, "High / Critical risks", `${metrics.elevated}`],
    ["Overdue actions", `${metrics.overdue}`, "Open findings", `${metrics.openFindings}`],
    ["Mapped residual risks", `${metrics.mapped}`, "Ownership gaps", `${metrics.unassigned}`],
  ];
  for (const row of metricRows) {
    ensure(30);
    page.drawRectangle({ x: PAGE.margin, y: y - 22, width: PAGE.width - PAGE.margin * 2, height: 27, color: pale });
    page.drawText(row[0], { x: PAGE.margin + 9, y: y - 12, size: 8.5, font: bold, color: grey });
    page.drawText(row[1], { x: 190, y: y - 12, size: 9, font: bold, color: navy });
    page.drawText(row[2], { x: 300, y: y - 12, size: 8.5, font: bold, color: grey });
    page.drawText(row[3], { x: 485, y: y - 12, size: 9, font: bold, color: navy });
    y -= 31;
  }
  y -= 8;

  heading("Executive summary"); paragraph(content.executiveSummary);
  heading("Portfolio scope"); paragraph(content.portfolioScope);
  heading("Methodology and sampling"); paragraph(content.methodology);
  heading("Principal residual risks"); paragraph(content.principalRisks);
  heading("Risk-treatment priorities"); paragraph(content.treatmentPriorities);
  heading("Limitations and exclusions"); paragraph(content.limitations);
  heading("Overall management conclusion"); paragraph(content.conclusion);

  if (topRisks.length) {
    heading("Highest residual-risk controls");
    for (const risk of topRisks) {
      ensure(42);
      page.drawText(safe(`A.${risk.controlId} | ${risk.level} ${risk.score} | ${risk.owner}`), { x: PAGE.margin, y, size: 9, font: bold, color: risk.level === "Critical" ? rgb(.7, .14, .1) : rgb(.83, .32, .12) });
      y -= 13;
      const lines = wrap(`${risk.title} | ${risk.theme} | target ${risk.targetDate}`, regular, 8.5, PAGE.width - PAGE.margin * 2);
      for (const line of lines) { page.drawText(line, { x: PAGE.margin, y, size: 8.5, font: regular, color: grey }); y -= 12; }
      y -= 7;
    }
  }

  heading("Document control");
  paragraph(`Prepared by: ${report?.prepared_by || user.email || "Not recorded"}\nReviewed by: ${report?.reviewed_by || "Not recorded"}\nApproved by: ${report?.approved_by || "Not recorded"}\nGenerated: ${new Intl.DateTimeFormat("en-GB", { dateStyle: "long", timeStyle: "short", timeZone: "Europe/London" }).format(new Date())}`);

  const pages = pdf.getPages();
  pages.forEach((item, index) => {
    item.drawLine({ start: { x: PAGE.margin, y: 43 }, end: { x: PAGE.width - PAGE.margin, y: 43 }, thickness: .5, color: rgb(.78, .83, .88) });
    item.drawText(safe(`${reference} | ${status.toUpperCase()} | ${confidentiality}`), { x: PAGE.margin, y: 27, size: 7, font: regular, color: grey });
    item.drawText(`Page ${index + 1} of ${pages.length}`, { x: PAGE.width - 94, y: 27, size: 7, font: regular, color: grey });
  });

  const bytes = await pdf.save();
  const filename = `${reference}-${status}.pdf`.replace(/[^a-zA-Z0-9._-]/g, "-");
  return new Response(bytes, { headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${filename}"`, "Cache-Control": "private, no-store" } });
}
