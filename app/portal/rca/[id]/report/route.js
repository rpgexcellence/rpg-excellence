import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { createClient } from "../../../../../lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DISCIPLINE_NAMES = [
  "Prepare and Protect",
  "Establish the Team",
  "Define the Problem",
  "Contain the Problem",
  "Determine and Validate Root Causes",
  "Select Permanent Corrective Actions",
  "Implement and Validate Corrective Actions",
  "Prevent Recurrence",
  "Recognise and Close",
];

const cleanLabel = (value) =>
  String(value ?? "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const money = (value, currency = "GBP") =>
  new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
  }).format(Number(value || 0));

export async function GET(_request, { params }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return new Response("Unauthorised", { status: 401 });

  const [caseResult, disciplinesResult, causesResult, actionsResult, costsResult] =
    await Promise.all([
      supabase.from("rca_cases").select("*").eq("id", id).eq("owner_id", user.id).maybeSingle(),
      supabase.from("rca_8d_disciplines").select("*").eq("case_id", id).eq("owner_id", user.id).order("discipline"),
      supabase.from("rca_causes").select("*").eq("case_id", id).eq("owner_id", user.id).order("created_at"),
      supabase.from("rca_actions").select("*").eq("case_id", id).eq("owner_id", user.id).order("created_at"),
      supabase.from("rca_cost_entries").select("*").eq("case_id", id).eq("owner_id", user.id).order("discipline"),
    ]);

  if (caseResult.error) return new Response(caseResult.error.message, { status: 500 });
  if (!caseResult.data) return new Response("RCA case not found", { status: 404 });
  for (const result of [disciplinesResult, causesResult, actionsResult, costsResult]) {
    if (result.error) return new Response(result.error.message, { status: 500 });
  }

  const rcaCase = caseResult.data;
  const disciplines = disciplinesResult.data ?? [];
  const causes = causesResult.data ?? [];
  const actions = actionsResult.data ?? [];
  const costs = costsResult.data ?? [];
  const validatedCauses = causes.filter((cause) => cause.status === "validated");
  const selectedActions = actions.filter(
    (action) =>
      action.action_type !== "containment" &&
      action.selection_status !== "rejected" &&
      action.status !== "cancelled"
  );
  const openActions = actions.filter((action) => !["verified", "cancelled"].includes(action.status));
  const approvedCount = disciplines.filter((discipline) => discipline.status === "approved").length;
  const costTotals = costs.reduce((totals, entry) => {
    const currency = entry.currency || "GBP";
    totals[currency] = (totals[currency] || 0) + Number(entry.amount || 0);
    return totals;
  }, {});

  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  let logoImage = null;
  try {
    const logoBytes = await readFile(join(process.cwd(), "public", "rpg-excellence-logo.png"));
    logoImage = await pdf.embedPng(logoBytes);
  } catch {
    logoImage = null;
  }
  const navy = rgb(0.024, 0.102, 0.208);
  const blue = rgb(0.082, 0.369, 0.937);
  const grey = rgb(0.37, 0.44, 0.54);
  let page;
  let y;
  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const margin = 48;
  const contentWidth = pageWidth - margin * 2;

  const addPage = () => {
    page = pdf.addPage([pageWidth, pageHeight]);
    y = pageHeight - margin;
    if (logoImage) {
      const dimensions = logoImage.scaleToFit(125, 34);
      page.drawImage(logoImage, {
        x: margin,
        y: y - dimensions.height + 9,
        width: dimensions.width,
        height: dimensions.height,
      });
    } else {
      page.drawText("RPG EXCELLENCE", { x: margin, y, size: 10, font: bold, color: blue });
    }
    page.drawText("8D RCA Executive Report", { x: pageWidth - margin - 126, y, size: 9, font: regular, color: grey });
    y -= 26;
  };

  const ensureSpace = (height = 40) => {
    if (y - height < 52) addPage();
  };

  const wrap = (text, font, size, width) => {
    const words = String(text ?? "").replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
    const lines = [];
    let line = "";
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, size) <= width) line = candidate;
      else {
        if (line) lines.push(line);
        line = word;
      }
    }
    if (line) lines.push(line);
    return lines.length ? lines : ["Not recorded."];
  };

  const heading = (text, size = 16) => {
    ensureSpace(size + 18);
    page.drawText(text, { x: margin, y, size, font: bold, color: navy });
    y -= size + 10;
  };

  const paragraph = (text, options = {}) => {
    const size = options.size ?? 10;
    const font = options.bold ? bold : regular;
    const indent = options.indent ?? 0;
    const lines = wrap(text || "Not recorded.", font, size, contentWidth - indent);
    for (const line of lines) {
      ensureSpace(size + 6);
      page.drawText(line, { x: margin + indent, y, size, font, color: options.color ?? navy });
      y -= size + 5;
    }
    y -= options.after ?? 6;
  };

  const bullet = (text) => {
    ensureSpace(20);
    page.drawCircle({ x: margin + 4, y: y + 4, size: 2, color: blue });
    const lines = wrap(text, regular, 10, contentWidth - 18);
    for (const line of lines) {
      page.drawText(line, { x: margin + 16, y, size: 10, font: regular, color: navy });
      y -= 15;
    }
    y -= 2;
  };

  addPage();
  paragraph("ROOT CAUSE ANALYSIS AND CORRECTIVE ACTION", { size: 10, bold: true, color: blue, after: 4 });
  heading(rcaCase.title, 24);
  paragraph(`${rcaCase.case_reference} | ${cleanLabel(rcaCase.source_type)} | ${cleanLabel(rcaCase.severity)}`, { color: grey });

  page.drawRectangle({ x: margin, y: y - 94, width: contentWidth, height: 94, color: navy });
  page.drawText(`CURRENT GATE  D${rcaCase.current_discipline}`, { x: margin + 18, y: y - 28, size: 16, font: bold, color: rgb(1, 1, 1) });
  page.drawText(`${approvedCount}/9 disciplines approved`, { x: margin + 18, y: y - 53, size: 11, font: regular, color: rgb(0.75, 0.82, 0.9) });
  page.drawText(`${validatedCauses.length} validated causes`, { x: margin + 210, y: y - 53, size: 11, font: regular, color: rgb(0.75, 0.82, 0.9) });
  page.drawText(`${openActions.length} open actions`, { x: margin + 380, y: y - 53, size: 11, font: regular, color: rgb(0.75, 0.82, 0.9) });
  y -= 120;

  heading("Executive context");
  paragraph(rcaCase.problem_statement || "Problem statement not yet recorded.");
  bullet(`Customer / stakeholder: ${rcaCase.customer_or_stakeholder || "Not recorded"}`);
  bullet(`Product / service / process: ${rcaCase.product_service_process || "Not recorded"}`);
  bullet(`Location: ${rcaCase.location || "Not recorded"}`);
  bullet(`Sponsor: ${rcaCase.sponsor_name || "Not recorded"}; 8D leader: ${rcaCase.leader_name || "Not recorded"}`);

  const governanceExceptions = [];
  if (!rcaCase.sponsor_name) governanceExceptions.push("Accountable sponsor is not recorded.");
  if (!rcaCase.leader_name) governanceExceptions.push("8D investigation leader is not recorded.");
  if (!rcaCase.customer_or_stakeholder) governanceExceptions.push("Affected customer or stakeholder is not recorded.");
  if (!rcaCase.product_service_process) governanceExceptions.push("Affected product, service or process is not recorded.");
  if (openActions.length > 0) governanceExceptions.push(`${openActions.length} action${openActions.length === 1 ? " remains" : "s remain"} open or unverified.`);
  if (disciplines.every((item) => item.status === "approved") && openActions.length > 0) {
    governanceExceptions.push("The 8D gates are approved although actions remain open; formal closure should be reconfirmed.");
  }

  if (governanceExceptions.length > 0) {
    heading("Management exceptions");
    governanceExceptions.forEach(bullet);
  }

  heading("Validated root causes");
  for (const type of ["occurrence", "escape", "systemic"]) {
    const typeCauses = validatedCauses.filter((cause) => cause.cause_type === type);
    paragraph(`${cleanLabel(type)} cause`, { bold: true, after: 2 });
    if (typeCauses.length) typeCauses.forEach((cause) => bullet(cause.statement));
    else paragraph("Not yet validated.", { color: grey });
  }

  heading("Corrective actions");
  if (selectedActions.length) {
    selectedActions.forEach((action) => {
      paragraph(action.title, { bold: true, after: 1 });
      paragraph(`Owner: ${action.action_owner || "Unassigned"} | Due: ${action.due_date || "Not set"} | Status: ${cleanLabel(action.status)}`, { color: grey, after: 2 });
      paragraph(`Effectiveness: ${action.effectiveness_criteria || "Not defined"}`, { after: 8 });
    });
  } else paragraph("No permanent corrective actions have been selected.", { color: grey });

  heading("Cost of Poor Quality");
  paragraph(
    Object.keys(costTotals).length
      ? `Total recorded financial impact: ${Object.entries(costTotals).map(([currency, total]) => money(total, currency)).join(" | ")}`
      : "No Cost of Poor Quality data has been recorded. Cost capture is optional.",
    { bold: true }
  );
  costs.forEach((entry) => bullet(`D${entry.discipline} | ${cleanLabel(entry.cost_category)} | ${entry.description} | ${money(entry.amount, entry.currency)} | ${cleanLabel(entry.cost_status)}`));

  heading("8D gate status");
  disciplines.forEach((item) => {
    bullet(`D${item.discipline} | ${DISCIPLINE_NAMES[item.discipline]} | ${cleanLabel(item.status)}`);
  });

  const pages = pdf.getPages();
  pages.forEach((currentPage, index) => {
    currentPage.drawText(`Generated ${new Date().toLocaleDateString("en-GB")} | Page ${index + 1} of ${pages.length}`, {
      x: margin,
      y: 26,
      size: 8,
      font: regular,
      color: grey,
    });
  });

  const bytes = await pdf.save();
  const safeReference = String(rcaCase.case_reference || "RCA").replace(/[^a-zA-Z0-9_-]/g, "-");
  return new Response(bytes, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${safeReference}-Executive-Report.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
