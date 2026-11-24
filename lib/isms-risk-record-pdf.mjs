import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { acceptanceState, BASES, rating, riskBand } from "./isms-risk-assurance.mjs";

const W = 595.28, H = 841.89, MARGIN = 38;
const navy = rgb(.064, .169, .29);
const muted = rgb(.28, .39, .48);
const white = rgb(1, 1, 1);
const readable = value => value ? String(value).replaceAll("_", " ") : null;

function wrap(value, font, size, width) {
  const clean = Array.from(String(value ?? "").trim() || "Not recorded", char => {
    if (/\s/.test(char)) return " ";
    try { font.encodeText(char); return char; } catch { return "?"; }
  }).join("");
  const lines = [];
  let line = "";
  for (const word of clean.split(/ +/)) {
    const next = line ? line + " " + word : word;
    if (font.widthOfTextAtSize(next, size) <= width) {
      line = next;
      continue;
    }
    if (line) lines.push(line);
    line = "";
    for (const char of word) {
      if (font.widthOfTextAtSize(line + char, size) > width) {
        lines.push(line);
        line = "";
      }
      line += char;
    }
  }
  if (line) lines.push(line);
  return lines;
}

export async function renderISMSRiskRecord(record, { organizationName, today }) {
  const { risk, methodology, controls, assets, treatments, decisions } = record;
  const pdf = await PDFDocument.create();
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const width = W - 2 * MARGIN;
  pdf.setAuthor("RPG Excellence");
  pdf.setTitle(risk.risk_reference + " | Information security risk assessment");
  let page, y;

  function addPage() {
    page = pdf.addPage([W, H]);
    page.drawRectangle({ x: 0, y: H - 65, width: W, height: 65, color: navy });
    page.drawText("RPG EXCELLENCE  /  INFORMATION SECURITY", { x: MARGIN, y: H - 31, size: 10, font: bold, color: white });
    page.drawText("RISK ASSESSMENT RECORD", { x: MARGIN, y: H - 49, size: 9, font: regular, color: white });
    y = H - 88;
  }
  function ensure(height) {
    if (y - height < 48) addPage();
  }
  function write(value, { size = 10, font = regular, colour = navy } = {}) {
    for (const line of wrap(value, font, size, width)) {
      ensure(size + 6);
      page.drawText(line, { x: MARGIN, y, size, font, color: colour });
      y -= size + 5;
    }
  }
  function heading(label) {
    ensure(50);
    y -= 11;
    page.drawRectangle({ x: MARGIN, y: y - 5, width, height: 21, color: rgb(.91, .94, .97) });
    write(label, { font: bold, size: 12 });
    y -= 3;
  }
  function detail(label, value) {
    write(label + "  |  " + (value || "Not recorded"));
  }

  addPage();
  write(risk.risk_reference, { font: bold, size: 11 });
  write(risk.title, { font: bold, size: 20 });
  detail("Organisation", organizationName);
  detail("Scope", risk.scope);
  detail("Risk owner", risk.risk_owner);
  detail("Record status", readable(risk.status));
  detail("Last updated", risk.updated_at);
  detail("Next review", risk.review_due_date);
  detail("Export date", today);
  heading("Risk profile");
  for (const [basis, label] of Object.entries(BASES)) {
    const item = rating(risk, basis);
    detail(label, item && item.likelihood + " x " + item.impact + " = " + item.score + " (" + riskBand(item.score)[2] + ")");
  }
  detail("Approved appetite", methodology && methodology.appetite_score + "/25");
  detail("Treatment decision", readable(risk.treatment_decision));
  heading("Assessment details");
  for (const [label, value] of [["Source", risk.source], ["Cause", risk.cause], ["Event", risk.event],
    ["Consequence", risk.consequence], ["Rationale", risk.assessment_rationale], ["Assumptions", risk.assumptions],
    ["CIA properties", risk.cia_properties?.join(", ")], ["Evidence reference", risk.evidence_reference]]) detail(label, value);
  heading("Annex A controls and evidence");
  if (!controls.length) write("No linked controls.");
  for (const item of controls) {
    const ref = item.control_id.startsWith("A.") ? item.control_id : "A." + item.control_id;
    detail(ref + (item.name ? " " + item.name : ""), item.state + (item.needsAction ? " - action outstanding" : ""));
    if (item.evidence) detail("Evidence", item.evidence);
  }
  heading("Treatment and verification");
  if (!treatments.length) write("No treatments recorded.");
  for (const treatment of treatments) {
    detail(treatment.action, readable(treatment.status));
    detail("Owner", treatment.action_owner);
    detail("Target date", treatment.target_date);
    detail("Completion evidence", treatment.completion_evidence);
  }
  heading("Residual-risk acceptance");
  const decision = decisions[0];
  detail("Current decision", acceptanceState(risk, decision, today));
  if (decision) {
    detail("Authority", decision.acceptance_authority);
    detail("Decision date", decision.decided_at);
    detail("Expiry", decision.expires_at);
    detail("Rationale", decision.rationale);
    if (decision.conditions) detail("Conditions", decision.conditions);
  }
  heading("Applicability and linked assets");
  detail("Affected processes", risk.affected_processes?.join(", "));
  if (!assets.length) write("No linked assets.");
  for (const asset of assets) detail(asset.asset_reference, asset.asset_name);

  const pages = pdf.getPages();
  pages.forEach((item, index) => {
    item.drawText("RPG Excellence  |  Record snapshot  |  " + today, { x: MARGIN, y: 28, size: 8, font: regular, color: muted });
    item.drawText((index + 1) + " / " + pages.length, { x: W - MARGIN - 25, y: 28, size: 8, font: regular, color: muted });
  });
  return pdf.save();
}
