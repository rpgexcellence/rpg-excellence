import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { createClient } from "../../../../../../lib/supabase/server";
import { requirePlanAccess } from "../../../../../../lib/plan-access";
import { closureLabels, decisionDetails, powraDate, powraDecision, powraStatus, powraTime } from "../../../../../../lib/powra-workflow.mjs";
import { UUID } from "../../../../../../lib/zone-policy.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const navy = rgb(.063,.17,.275);
const pale = rgb(.91,.94,.97);
const white = rgb(1,1,1);
const width = 595.28;
const height = 841.89;
const margin = 42;

function printable(value, font) {
  const text = String(value ?? "").trim() || "Not recorded";
  return Array.from(text, character => {
    if (/\s/.test(character)) return " ";
    try {
      font.encodeText(character);
      return character;
    } catch {
      return "?";
    }
  }).join("").replace(/ +/g," ");
}

function wrap(text, font, size) {
  const lines = [];
  let line = "";
  for (const word of text.split(" ")) {
    const next = line ? line + " " + word : word;
    if (font.widthOfTextAtSize(next,size) <= width - 2*margin) {
      line = next;
      continue;
    }
    if (line) lines.push(line);
    line = "";
    for (const character of word) {
      if (font.widthOfTextAtSize(line+character,size) > width - 2*margin) {
        lines.push(line);
        line = "";
      }
      line += character;
    }
  }
  if (line) lines.push(line);
  return lines;
}

export async function GET(_request,{params}) {
  const {id} = await params;
  if (!UUID.test(id)) return new Response("Assessment not found",{status:404});
  const supabase = await createClient();
  const {data:{user}} = await supabase.auth.getUser();
  if (!user) return new Response("Sign in to download the assessment.",{status:401});
  await requirePlanAccess(user,"professional","POWRA");
  const {data:item,error} = await supabase.from("hs_powra_assessments").select("*")
    .eq("id",id).eq("owner_id",user.id).maybeSingle();
  if (error) return new Response("Unable to load assessment.",{status:500});
  if (!item) return new Response("Assessment not found",{status:404});

  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  pdf.setTitle("POWRA "+item.powra_reference);
  pdf.setAuthor("RPG Excellence");
  let page, y;
  const newPage = () => {
    page = pdf.addPage([width,height]);
    page.drawRectangle({x:0,y:height-70,width,height:70,color:navy});
    page.drawText("RPG EXCELLENCE",{x:margin,y:height-29,size:10,font:bold,color:white});
    page.drawText("Point of Work Risk Assessment",{x:margin,y:height-49,size:15,font:bold,color:white});
    y = height-96;
  };
  const ensure = space => {if (y - space < margin + 18) newPage();};
  const line = (text,font=regular,size=10) => {
    for (const piece of wrap(printable(text,font),font,size)) {
      ensure(15);
      page.drawText(piece,{x:margin,y,size,font,color:navy});
      y -= 15;
    }
  };
  const section = title => {
    ensure(42);
    page.drawRectangle({x:margin-5,y:y-5,width:width-2*margin+10,height:19,color:pale});
    line(title,bold,11);
    y -= 5;
  };
  const facts = rows => rows.forEach(([label,value]) => line(label + ": " + printable(value,regular)));

  newPage();
  line(item.powra_reference,bold,17);
  line(item.task,bold,13);
  y -= 8;
  const review = item.end_review ?? {};
  const work = review.point_of_work ?? {};
  const decision = powraDecision(item);
  const answers = {yes:"Yes", no:"No", na:"Not applicable"};
  section("Assessment details");
  facts([
    ["Location",item.site_location],["Work area",item.work_area],
    ["Assessor",item.completed_by],["Team",item.team_members],
    ["Assessment date",powraDate(item.assessment_date)],["Recorded at",powraTime(item.created_at)],
    ["Recorded decision",decisionDetails[decision][0]],["Record status",powraStatus(item)],
    ["Decision notes",item.decision_reason],["Supervisor",item.supervisor_name],
    ["Supervisor review",powraTime(item.supervisor_approved_at)],
    ["Linked risk assessment",item.linked_assessment_id ? "Linked in POWRA record" : null],
    ["Permit to work",item.linked_permit_reference],["Workplace inspection",work.inspection_reference],
  ]);
  section("Pre-start checks");
  const checks = Array.isArray(item.prestart_checks) ? item.prestart_checks : [];
  if (checks.length) facts(checks.map(row=>[row.question,answers[row.answer]]));
  else line("No pre-start checks recorded.");
  section("Hazards and controls");
  const hazards = Array.isArray(item.hazards) ? item.hazards : [];
  if (!hazards.length) line(work.no_additional_hazards ? "No additional hazards identified." : "No hazards recorded.");
  for (const hazard of hazards) {
    ensure(48);
    line(hazard.name,bold);
    facts([["Control measures",hazard.control],["Remaining risk",hazard.remaining_risk],
      ["Verification",hazard.verified === true ? "Control verified" : hazard.verified === false ? "Verification outstanding" : null]]);
    if (hazard.changed) line("New or significantly changed hazard.");
    y -= 5;
  }
  section("Verification and close-out");
  facts([
    ["Conditions changed",answers[review.conditions_changed]],["New hazards identified",answers[review.new_hazards]],
    ["Controls effective",answers[review.controls_effective]],["Incident or near miss",answers[review.incident]],
    ["Closure outcome",closureLabels[review.outcome]],["Closed at",powraTime(item.closed_at)],
    ["Closure notes",review.comments],["Follow-up action",review.follow_up],
    ["Evidence reference",review.evidence_reference],["Incident reference",review.incident_reference],
  ]);
  if (review.stop_event) {
    section("Decision history");
    facts([["Initial decision",decisionDetails[review.stop_event.previous_decision]?.[0]],
      ["Initial decision notes",review.stop_event.previous_reason],["Stop Work recorded",powraTime(review.stop_event.at)]]);
  }

  pdf.getPages().forEach((sheet,index) => sheet.drawText(`Page ${index+1} of ${pdf.getPageCount()}`,{x:margin,y:28,size:9,font:regular,color:navy}));
  const filename = String(item.powra_reference || "POWRA").replace(/[^a-z0-9_-]/gi,"-").slice(0,90);
  return new Response(await pdf.save(),{headers:{
    "Content-Type":"application/pdf",
    "Content-Disposition":`attachment; filename="${filename}.pdf"`,
    "Cache-Control":"private, no-store",
  }});
}
