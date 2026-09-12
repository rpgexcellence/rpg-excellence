import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

import { createClient } from "../../../../../../../lib/supabase/server";

export const dynamic = "force-dynamic";

const colours = {
  navy: rgb(0.03, 0.15, 0.29),
  blue: rgb(0.08, 0.34, 0.88),
  green: rgb(0.02, 0.52, 0.39),
  amber: rgb(0.88, 0.57, 0.08),
  pale: rgb(0.94, 0.97, 0.99),
  line: rgb(0.80, 0.86, 0.90),
  grey: rgb(0.34, 0.43, 0.51),
  white: rgb(1, 1, 1),
};

function formatDate(value) {
  if (!value) return "Not specified";
  return new Intl.DateTimeFormat("en-GB", { day:"2-digit", month:"long", year:"numeric", timeZone:"UTC" }).format(new Date(value));
}

function clean(value) {
  return String(value ?? "")
    .replaceAll("–", "-")
    .replaceAll("—", "-")
    .replaceAll("×", "x")
    .replaceAll("’", "'")
    .replaceAll("“", '"')
    .replaceAll("”", '"')
    .trim();
}

function wrap(font, text, size, width) {
  const words = clean(text).split(/\s+/).filter(Boolean);
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
  return lines.length ? lines : [""];
}

function drawWrapped(page, font, text, options) {
  const { x, y, width, size = 10, lineHeight = 14, color = colours.navy, maxLines } = options;
  const lines = wrap(font, text, size, width).slice(0, maxLines || 1000);
  lines.forEach((line,index) => page.drawText(line, { x, y:y - index * lineHeight, size, font, color }));
  return y - lines.length * lineHeight;
}

function addHeader(page, fonts, title, subtitle) {
  const { width, height } = page.getSize();
  page.drawRectangle({ x:0, y:height - 70, width, height:70, color:colours.navy });
  page.drawText("RPG EXCELLENCE", { x:42, y:height - 31, size:14, font:fonts.bold, color:colours.white });
  page.drawText("RCA PRACTITIONER WORKBOOK", { x:42, y:height - 51, size:8, font:fonts.bold, color:rgb(0.38,0.88,0.80) });
  page.drawText(clean(title), { x:42, y:height - 105, size:20, font:fonts.bold, color:colours.navy });
  if (subtitle) page.drawText(clean(subtitle), { x:42, y:height - 124, size:9, font:fonts.regular, color:colours.grey });
}

function addFooter(page, fonts, pageNumber, certificateNumber) {
  const { width } = page.getSize();
  page.drawLine({ start:{x:42,y:35}, end:{x:width - 42,y:35}, thickness:0.7, color:colours.line });
  page.drawText(`Controlled learner evidence | ${clean(certificateNumber)}`, { x:42, y:20, size:7, font:fonts.regular, color:colours.grey });
  const label = `Page ${pageNumber}`;
  page.drawText(label, { x:width - 42 - fonts.regular.widthOfTextAtSize(label,7), y:20, size:7, font:fonts.regular, color:colours.grey });
}

function addSection(page, fonts, y, heading, body, tone = "blue") {
  const colour = tone === "green" ? colours.green : tone === "amber" ? colours.amber : colours.blue;
  const lines = wrap(fonts.regular, body || "No response recorded.", 9, 493);
  const height = Math.max(54, 32 + lines.length * 12);
  page.drawRectangle({ x:42, y:y - height, width:511, height, color:colours.pale, borderColor:colours.line, borderWidth:0.7 });
  page.drawRectangle({ x:42, y:y - height, width:5, height, color:colour });
  page.drawText(clean(heading), { x:57, y:y - 20, size:10, font:fonts.bold, color:colours.navy });
  lines.forEach((line,index) => page.drawText(line, { x:57, y:y - 38 - index * 12, size:9, font:fonts.regular, color:colours.grey }));
  return y - height - 10;
}

function normaliseResponse(response) {
  if (!response || typeof response !== "object") return {};
  return response;
}

function fieldLabel(value) {
  return clean(value).replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export async function GET(request, { params }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data:{ user } } = await supabase.auth.getUser();
  if (!user) return Response.redirect(new URL(`/portal/login?next=/portal/rca/training/${id}/workbook/pdf`, request.url), 303);

  const { data:enrolment, error:enrolmentError } = await supabase
    .from("hs_training_enrolments")
    .select("id,learner_id,course_id,status,completed_at")
    .eq("id", id).eq("learner_id", user.id).maybeSingle();
  if (enrolmentError) return new Response("Unable to load the training record.", { status:500 });
  if (!enrolment || enrolment.status !== "passed") return new Response("The practitioner workbook becomes available after the course is passed.", { status:403 });

  const [courseResult, certificateResult, modulesResult, progressResult] = await Promise.all([
    supabase.from("hs_training_courses").select("id,course_code,academy_code,title,version").eq("id", enrolment.course_id).maybeSingle(),
    supabase.from("hs_training_certificates").select("certificate_number,learner_name,course_title,course_version,score_percent,issued_at,valid_until").eq("enrolment_id", id).eq("learner_id", user.id).maybeSingle(),
    supabase.from("hs_training_modules").select("id,module_number,title,learning_objective").eq("course_id", enrolment.course_id).eq("active", true).order("module_number"),
    supabase.from("hs_training_module_progress").select("module_id,status,response_data,completed_at").eq("enrolment_id", id).eq("learner_id", user.id).eq("status", "completed"),
  ]);
  for (const result of [courseResult, certificateResult, modulesResult, progressResult]) {
    if (result.error) return new Response("Unable to compile the practitioner workbook.", { status:500 });
  }
  const course = courseResult.data;
  const certificate = certificateResult.data;
  if (!course || course.course_code !== "RCA-8D-001" || course.academy_code !== "rca_8d" || !certificate) {
    return new Response("A valid RCA-8D Practitioner record was not found.", { status:404 });
  }

  const progressMap = new Map((progressResult.data || []).map((item) => [item.module_id,item]));
  const pdf = await PDFDocument.create();
  pdf.setTitle(`RCA Practitioner Workbook - ${certificate.learner_name}`);
  pdf.setAuthor("RPG Excellence");
  pdf.setSubject("Controlled RCA-8D Practitioner learner evidence workbook");
  pdf.setKeywords(["RCA", "8D", "corrective action", "learner workbook", "controlled evidence"]);
  pdf.setCreationDate(new Date());
  const fonts = {
    regular:await pdf.embedFont(StandardFonts.Helvetica),
    bold:await pdf.embedFont(StandardFonts.HelveticaBold),
    serif:await pdf.embedFont(StandardFonts.TimesRoman),
  };

  const cover = pdf.addPage([595.28,841.89]);
  const { width, height } = cover.getSize();
  cover.drawRectangle({ x:0,y:0,width,height,color:colours.pale });
  cover.drawRectangle({ x:0,y:height - 180,width,height:180,color:colours.navy });
  cover.drawText("RPG EXCELLENCE", { x:48,y:height - 58,size:17,font:fonts.bold,color:colours.white });
  cover.drawText("CONTROLLED LEARNER EVIDENCE", { x:48,y:height - 84,size:9,font:fonts.bold,color:rgb(0.38,0.88,0.80) });
  cover.drawText("RCA Practitioner", { x:48,y:height - 135,size:31,font:fonts.serif,color:colours.white });
  cover.drawText("Workbook", { x:48,y:height - 169,size:31,font:fonts.serif,color:colours.white });
  cover.drawText(clean(certificate.learner_name), { x:48,y:height - 253,size:24,font:fonts.bold,color:colours.green });
  let coverY = height - 295;
  coverY = drawWrapped(cover, fonts.regular, certificate.course_title, { x:48,y:coverY,width:490,size:13,lineHeight:18,color:colours.navy }) - 18;
  const coverRows = [
    ["Certificate",certificate.certificate_number],
    ["Course version",certificate.course_version],
    ["Assessment score",`${certificate.score_percent}%`],
    ["Completed",formatDate(enrolment.completed_at || certificate.issued_at)],
    ["Valid until",formatDate(certificate.valid_until)],
  ];
  coverRows.forEach(([label,value]) => {
    cover.drawText(label.toUpperCase(), { x:48,y:coverY,size:8,font:fonts.bold,color:colours.grey });
    cover.drawText(clean(value), { x:190,y:coverY,size:10,font:fonts.bold,color:colours.navy });
    cover.drawLine({ start:{x:48,y:coverY - 8},end:{x:545,y:coverY - 8},thickness:0.5,color:colours.line });
    coverY -= 38;
  });
  cover.drawRectangle({ x:48,y:112,width:497,height:110,color:rgb(1,0.97,0.87),borderColor:colours.amber,borderWidth:1 });
  cover.drawText("WORKBOOK STATUS", { x:66,y:194,size:9,font:fonts.bold,color:colours.amber });
  drawWrapped(cover, fonts.regular, "This document compiles the decisions and rationale retained during the interactive RCA course. It supports evidence of learning but does not by itself authorise the learner to lead an investigation. Organisational competence should also consider experience, observed practice and assigned authority.", { x:66,y:174,width:460,size:9,lineHeight:14,color:colours.grey });
  addFooter(cover, fonts, 1, certificate.certificate_number);

  (modulesResult.data || []).forEach((module) => {
    const page = pdf.addPage([595.28,841.89]);
    const progress = progressMap.get(module.id);
    const response = normaliseResponse(progress?.response_data);
    addHeader(page, fonts, `Module ${module.module_number}: ${module.title}`, module.learning_objective);
    let y = 685;
    y = addSection(page, fonts, y, "Completion record", progress ? `Completed ${formatDate(progress.completed_at)}. Evidence status: retained.` : "No completed module evidence found.", "green");

    if (response.exercise_type === "three_legged_five_why" && response.paths) {
      for (const [key,label] of [["occurrence","Occurrence path"],["escape","Escape path"],["systemic","Systemic path"]]) {
        const answers = Array.isArray(response.paths[key]) ? response.paths[key] : [];
        const body = answers.map((answer,index) => `${index === answers.length - 1 ? "Root cause" : `Why ${index + 1}`}: ${clean(answer)}`).join("\n");
        y = addSection(page, fonts, y, label, body || "No path recorded.", key === "escape" ? "amber" : key === "systemic" ? "green" : "blue");
        y = addSection(page, fonts, y, `${label} evidence`, response.evidence?.[key] || "No evidence recorded.", "green");
      }
    } else if (response.exercise_type === "structured_practitioner_record" && response.fields && typeof response.fields === "object") {
      y = addSection(page, fonts, y, "Practitioner exercise", response.exercise_title || "Structured RCA record", "blue");
      Object.entries(response.fields).forEach(([key,value],index) => {
        y = addSection(page, fonts, y, fieldLabel(key), value || "No response recorded.", index % 3 === 1 ? "amber" : index % 3 === 2 ? "green" : "blue");
      });
      y = addSection(page, fonts, y, "Learner review", response.guidance_reviewed ? `The learner reviewed and confirmed this record.${response.worked_example_used ? " A worked example was used as a starting point and retained as modified learner evidence." : " The learner created the record without populating the worked example."}` : "Learner review was not recorded.", "green");
    } else {
      y = addSection(page, fonts, y, "Decision question", response.question || "Structured module exercise", "blue");
      y = addSection(page, fonts, y, "Selected response", response.selected_response || "No selected response retained.", "green");
      y = addSection(page, fonts, y, "Learner rationale", response.rationale || "No rationale retained.", "amber");
      y = addSection(page, fonts, y, "Guidance review", response.guidance_reviewed ? "The learner confirmed that the module guidance was reviewed." : "Guidance review was not recorded.", "blue");
    }
  });

  const pages = pdf.getPages();
  pages.slice(1).forEach((page,index) => addFooter(page, fonts, index + 2, certificate.certificate_number));
  const bytes = await pdf.save();
  const safeNumber = clean(certificate.certificate_number).replace(/[^a-zA-Z0-9_-]/g,"-");
  return new Response(bytes, { status:200, headers:{
    "Content-Type":"application/pdf",
    "Content-Disposition":`attachment; filename="${safeNumber}-RCA-Practitioner-Workbook.pdf"`,
    "Cache-Control":"private, no-store, max-age=0",
    "X-Content-Type-Options":"nosniff",
  }});
}
