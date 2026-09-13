import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { createClient } from "../../../../../../lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PAGE = { width: 841.89, height: 595.28, margin: 28 };
const C = { navy: rgb(.025,.11,.23), blue: rgb(.08,.34,.84), teal: rgb(.03,.5,.4), ink: rgb(.07,.14,.23), grey: rgb(.38,.45,.53), pale: rgb(.94,.97,.985), line: rgb(.76,.82,.87), white: rgb(1,1,1), red: rgb(.76,.16,.13), orange: rgb(.91,.34,.14), amber: rgb(.92,.62,.08), green: rgb(.04,.55,.36) };
const clean = (value, fallback = "Not recorded") => String(value ?? fallback).replace(/[\u2010-\u2015]/g,"-").replace(/[^\x20-\x7E]/g," ").replace(/\s+/g," ").trim() || fallback;
const label = (value) => clean(value).replaceAll("_"," ").replace(/\b\w/g, letter => letter.toUpperCase());
const date = (value) => value ? new Intl.DateTimeFormat("en-GB", { dateStyle:"medium" }).format(new Date(value)) : "Not recorded";
const riskBand = (score) => score >= 15 ? "UNACCEPTABLE" : score >= 10 ? "INADEQUATE" : score >= 5 ? "ADEQUATE" : score > 0 ? "ACCEPTABLE" : "NOT SCORED";
const riskColour = (score) => score >= 15 ? C.red : score >= 10 ? C.orange : score >= 5 ? C.amber : C.green;

export async function GET(_request, { params }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorised", { status:401 });
  const [assessmentResult, hazardsResult, actionsResult] = await Promise.all([
    supabase.from("hs_risk_assessments").select("*").eq("id",id).eq("owner_id",user.id).maybeSingle(),
    supabase.from("hs_risk_hazards").select("*").eq("assessment_id",id).eq("owner_id",user.id).order("display_order"),
    supabase.from("hs_risk_actions").select("*").eq("assessment_id",id).eq("owner_id",user.id).order("target_date"),
  ]);
  for (const result of [assessmentResult,hazardsResult,actionsResult]) if (result.error) return new Response(result.error.message,{status:500});
  const assessment = assessmentResult.data;
  if (!assessment) return new Response("Risk assessment not found",{status:404});
  if (!["approved","communicated"].includes(assessment.status)) return new Response("A controlled PDF is available only after approval.",{status:409});
  const hazards = hazardsResult.data || [], actions = actionsResult.data || [];

  const pdf = await PDFDocument.create();
  pdf.setTitle(`${clean(assessment.assessment_reference)} - ${clean(assessment.title)}`);
  pdf.setAuthor("RPG Excellence");
  pdf.setSubject("Controlled workplace risk assessment register");
  const regular = await pdf.embedFont(StandardFonts.Helvetica), bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const width = PAGE.width - PAGE.margin * 2;
  let page, y;
  const wrap = (value, font=regular, size=7, maxWidth=width) => {
    const lines=[]; let line="";
    for (const word of clean(value).split(" ")) { const next=line?`${line} ${word}`:word; if(font.widthOfTextAtSize(next,size)<=maxWidth) line=next; else { if(line) lines.push(line); line=word; } }
    if(line) lines.push(line); return lines;
  };
  const newPage = () => {
    page=pdf.addPage([PAGE.width,PAGE.height]);
    page.drawRectangle({x:0,y:PAGE.height-7,width:PAGE.width,height:7,color:C.blue});
    page.drawText("RPG EXCELLENCE",{x:PAGE.margin,y:PAGE.height-24,size:8,font:bold,color:C.blue});
    page.drawText("CONTROLLED RISK ASSESSMENT",{x:PAGE.margin+83,y:PAGE.height-24,size:8,font:bold,color:C.navy});
    page.drawText(clean(assessment.assessment_reference),{x:PAGE.width-PAGE.margin-90,y:PAGE.height-24,size:7.5,font:bold,color:C.grey});
    y=PAGE.height-38;
  };
  const ensure = (height=40) => { if(y-height<45) newPage(); };
  const textInCell = (value,x,top,cellWidth,cellHeight,options={}) => {
    const font=options.bold?bold:regular, size=options.size||6.5;
    wrap(value,font,size,cellWidth-8).slice(0,Math.max(1,Math.floor((cellHeight-8)/(size+1.5)))).forEach((line,index)=>page.drawText(line,{x:x+4,y:top-10-index*(size+1.5),size,font,color:options.color||C.ink}));
  };
  const row = (cells,widths,options={}) => {
    const height=options.height||28; let x=PAGE.margin;
    cells.forEach((cell,index)=>{ const cellWidth=widths[index]; page.drawRectangle({x,y:y-height,width:cellWidth,height,color:options.fill||C.white,borderColor:C.line,borderWidth:.6}); textInCell(cell,x,y,cellWidth,height,{bold:options.bold,size:options.size,color:options.color}); x+=cellWidth; });
    y-=height;
  };
  const section = (title) => { ensure(29); y-=5; page.drawRectangle({x:PAGE.margin,y:y-22,width,height:22,color:C.navy}); page.drawText(clean(title).toUpperCase(),{x:PAGE.margin+8,y:y-15,size:8.5,font:bold,color:C.white}); y-=27; };
  const detailsRow = (items) => {
    const cellWidth=width/items.length; ensure(39); let x=PAGE.margin;
    items.forEach(([name,value])=>{ page.drawRectangle({x,y:y-35,width:cellWidth,height:35,color:C.pale,borderColor:C.line,borderWidth:.6}); page.drawText(clean(name).toUpperCase(),{x:x+6,y:y-10,size:5.6,font:bold,color:C.grey}); textInCell(value,x+2,y-10,cellWidth-4,24,{bold:true,size:6.7}); x+=cellWidth; }); y-=35;
  };

  newPage();
  page.drawText("RISK ASSESSMENT",{x:PAGE.margin,y:y-19,size:19,font:bold,color:C.navy});
  page.drawText(`${clean(assessment.assessment_reference)} | Version ${assessment.version||1} | ${label(assessment.status)}`,{x:PAGE.width-PAGE.margin-205,y:y-16,size:8,font:bold,color:C.blue}); y-=32;
  detailsRow([["Assessment title",assessment.title],["Site / location",assessment.site_location],["Area / department",assessment.area_department],["Section / lab",assessment.section_lab]]);
  detailsRow([["Assessor",assessment.assessor_name],["Assessment date",date(assessment.assessment_date)],["Approver",assessment.approver_name],["Review date",date(assessment.review_date)]]);
  detailsRow([["Assessment type",label(assessment.assessment_type)],["Project / job",assessment.project_number],["Review frequency",assessment.review_frequency_months?`Every ${assessment.review_frequency_months} months`:"Event-based / significant change"],["Status",label(assessment.status)]]);
  section("Task, activity and assessment scope");
  row([`${clean(assessment.task_description)} | Worker consultation: ${clean(assessment.consultation_summary)}`],[width],{height:37,size:7});
  detailsRow([["COSHH / SDS",assessment.coshh_msds_reference],["Safe system of work",assessment.safe_system_reference],["Permit / registration",assessment.permit_required?assessment.permit_reference:"Not required"],["Emergency arrangements",assessment.emergency_arrangements]]);
  section("Who might be harmed");
  const people=[["Employees",["employee"]],["Contractors",["contractor"]],["Visitors / Public",["visitor","public"]],["Young Persons",["young"]],["New / Expectant Mothers",["mother","expectant"]],["Disabled Persons",["disabled"]],["Lone Workers",["lone"]],["Others",["other"]]];
  const selected=(assessment.persons_at_risk||[]).map(item=>clean(item).toLowerCase());
  row(people.map(([person,aliases])=>`${selected.some(item=>aliases.some(alias=>item.includes(alias)))?"[X]":"[ ]"} ${person}`),Array(8).fill(width/8),{height:27,size:5.8});

  const hazardWidths=[130,120,150,32,32,55,150,32,32,53];
  const hazardHeader = () => { section("Hazard register and risk evaluation"); row(["Hazard / source","How harm could occur","Current control measures","S","L","Current risk","Additional controls required","S","L","Residual risk"],hazardWidths,{height:34,fill:C.pale,bold:true,size:5.8}); };
  hazardHeader();
  if(!hazards.length) row(["No significant hazards recorded.","","","","","","","","",""],hazardWidths,{height:32,size:6.5});
  hazards.forEach((hazard,index)=>{
    if(y-64<45){newPage();hazardHeader();}
    const initial=Number(hazard.current_score||0), residual=Number(hazard.residual_score||0), top=y, height=60;
    const values=[`${index+1}. ${clean(hazard.hazard_category)} - ${clean(hazard.hazard_description)}`,`${clean(hazard.people_exposed)}. ${clean(hazard.harm_description)}`,hazard.existing_controls,hazard.current_severity||"-",hazard.current_likelihood||"-",initial,hazard.additional_controls,hazard.residual_severity||"-",hazard.residual_likelihood||"-",residual];
    let x=PAGE.margin;
    values.forEach((value,cellIndex)=>{
      const cellWidth=hazardWidths[cellIndex], riskCell=cellIndex===5||cellIndex===9, score=cellIndex===5?initial:residual;
      page.drawRectangle({x,y:top-height,width:cellWidth,height,color:riskCell?riskColour(score):C.white,borderColor:C.line,borderWidth:.6});
      if(riskCell){ page.drawText(String(score||"-"),{x:x+cellWidth/2-4,y:top-24,size:11,font:bold,color:score>=5?C.white:C.ink}); page.drawText(riskBand(score),{x:x+3,y:top-39,size:4.9,font:bold,color:score>=5?C.white:C.ink}); }
      else textInCell(value,x,top,cellWidth,height,{bold:cellIndex===0,size:6.1}); x+=cellWidth;
    }); y-=height;
  });

  section("Risk-reduction action plan");
  const actionWidths=[70,300,125,90,90,100];
  row(["Reference","Action required","Responsible person","Target date","Status","Verification"],actionWidths,{height:25,fill:C.pale,bold:true,size:6});
  if(!actions.length) row(["-","No additional risk-reduction actions were recorded.","-","-","-","-"],actionWidths,{height:29,size:6.5});
  actions.forEach(action=>{ ensure(39); row([action.action_reference,action.action_required,action.responsible_name,date(action.target_date),label(action.status),action.verified_at?`Verified ${date(action.verified_at)}`:"Pending"],actionWidths,{height:34,size:6.2}); });
  section("Approval and document control");
  detailsRow([["Assessor",assessment.assessor_name],["Competent approver",assessment.approver_name],["Approved",date(assessment.approved_at)],["Communicated",date(assessment.communicated_at)]]);
  row([`Approval comment: ${clean(assessment.approval_comment,"No additional comment")}`],[width],{height:28,size:6.7});
  ensure(190);
  section("Employee acknowledgement - briefing / read and understood");
  page.drawText("Signing confirms receipt and understanding of the assessment and controls. It does not transfer management responsibility.",{x:PAGE.margin,y:y-2,size:6.5,font:regular,color:C.grey}); y-=12;
  const acknowledgementWidths=[210,180,240,145];
  row(["Name","Department / role","Signature","Date"],acknowledgementWidths,{height:24,fill:C.pale,bold:true,size:6.3});
  for(let index=0;index<6;index+=1) row(["","","",""],acknowledgementWidths,{height:22});

  const pages=pdf.getPages();
  pages.forEach((currentPage,index)=>{ currentPage.drawLine({start:{x:PAGE.margin,y:31},end:{x:PAGE.width-PAGE.margin,y:31},thickness:.6,color:C.line}); currentPage.drawText(`CONTROLLED | ${clean(assessment.assessment_reference)} v${assessment.version||1} | Approved ${date(assessment.approved_at)}`,{x:PAGE.margin,y:18,size:6.2,font:regular,color:C.grey}); currentPage.drawText("Printed copies are uncontrolled unless formally issued.",{x:PAGE.width/2-96,y:18,size:6.2,font:regular,color:C.grey}); currentPage.drawText(`Page ${index+1} of ${pages.length}`,{x:PAGE.width-PAGE.margin-48,y:18,size:6.2,font:regular,color:C.grey}); });
  const bytes=await pdf.save();
  const fileName=`${clean(assessment.assessment_reference)}-v${assessment.version||1}.pdf`.replace(/[^a-zA-Z0-9._-]/g,"-");
  return new Response(bytes,{headers:{"Content-Type":"application/pdf","Content-Disposition":`inline; filename="${fileName}"`,"Cache-Control":"private, no-store"}});
}
