import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { createClient } from "../../../../../../lib/supabase/server";
import { createAdminClient } from "../../../../../../lib/supabase/admin";
import { calculateProgress, calculateSimpleOverallScore } from "../../scoring";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const P={w:595.28,h:841.89,m:42}, C={navy:rgb(.025,.102,.2),blue:rgb(.08,.35,.85),ink:rgb(.07,.13,.21),grey:rgb(.37,.44,.53),pale:rgb(.95,.97,.99),line:rgb(.83,.87,.92),white:rgb(1,1,1),red:rgb(.7,.1,.14),green:rgb(.04,.5,.3),cyan:rgb(.08,.7,.76)};
const clean=(v,f="Not recorded")=>String(v??f).replace(/[\u2010-\u2015]/g,"-").replace(/[\u2018\u2019]/g,"'").replace(/[^\x20-\x7E]/g," ").replace(/\s+/g," ").trim()||f;
const label=(v)=>clean(v).replaceAll("_"," ").replace(/\b\w/g,x=>x.toUpperCase());
const maturity=(s)=>s===null?"Not assessed":s<=20?"Initial":s<=40?"Developing":s<=60?"Managed":s<=80?"Controlled":"Optimised";

export async function GET(_request,{params}){
  const {id}=await params, supabase=await createClient(), admin=createAdminClient();
  const {data:{user}}=await supabase.auth.getUser(); if(!user)return new Response("Unauthorised",{status:401});
  const {data:assessment}=await supabase.from("assessments").select("*").eq("id",id).eq("owner_id",user.id).maybeSingle(); if(!assessment)return new Response("Assessment not found",{status:404});
  const [qR,aR,fR,rR]=await Promise.all([
    supabase.from("assessment_questions").select("question_number,clause,question,requirement_summary").eq("standard",assessment.standard).eq("active",true).order("display_order"),
    supabase.from("assessment_answers").select("*").eq("assessment_id",id).eq("owner_id",user.id),
    admin.from("assessment_findings").select("*").eq("assessment_id",id).eq("owner_id",user.id).neq("finding_type","conformity").order("created_at"),
    admin.from("assessment_executive_reports").select("*").eq("assessment_id",id).eq("owner_id",user.id).maybeSingle(),
  ]); for(const r of [qR,aR,fR,rR])if(r.error)return new Response(r.error.message,{status:500});
  const questions=qR.data||[],answers=aR.data||[],findings=fR.data||[],report=rR.data;
  if(!report)return new Response("Build and save the controlled executive report first",{status:409});
  const answerMap=new Map(answers.map(a=>[a.clause,a])), progress=calculateProgress(questions,answers), score=calculateSimpleOverallScore(answers);
  const open=findings.filter(f=>!["closed","withdrawn"].includes(f.status)), major=open.filter(f=>f.finding_type==="major_nc").length;
  const ref=report.report_reference||`GAR-${id.replaceAll("-","").slice(0,8).toUpperCase()}-RPT`, status=report.report_status||"draft", controlled=["approved","issued"].includes(status);
  const pdf=await PDFDocument.create(); pdf.setTitle(`${ref} - Gap Assessment Executive Report`);pdf.setAuthor("RPG Excellence");
  const reg=await pdf.embedFont(StandardFonts.Helvetica),bold=await pdf.embedFont(StandardFonts.HelveticaBold),cw=P.w-P.m*2;let page,y;
  const wrap=(v,font=reg,size=8.8,width=cw)=>{const out=[];let line="";for(const word of clean(v).split(" ")){const n=line?`${line} ${word}`:word;if(font.widthOfTextAtSize(n,size)<=width)line=n;else{if(line)out.push(line);line=word}}if(line)out.push(line);return out};
  const add=()=>{page=pdf.addPage([P.w,P.h]);page.drawRectangle({x:0,y:P.h-8,width:P.w,height:8,color:C.blue});page.drawText("RPG EXCELLENCE",{x:P.m,y:P.h-31,size:9,font:bold,color:C.blue});page.drawText("CONTROLLED GAP ASSESSMENT REPORT",{x:P.w-P.m-180,y:P.h-31,size:7.3,font:bold,color:C.grey});y=P.h-58};
  const ensure=(n=40)=>{if(y-n<55)add()};
  const text=(v,o={})=>{const font=o.bold?bold:reg,size=o.size??8.8,lines=wrap(v,font,size,o.width??cw),lead=o.leading??size+3;ensure(lines.length*lead+(o.after??5));for(const l of lines){page.drawText(l,{x:o.x??P.m,y,size,font,color:o.color??C.ink});y-=lead}y-=o.after??5};
  const section=(n,t)=>{ensure(44);y-=5;page.drawText(String(n).padStart(2,"0"),{x:P.m,y,size:8.5,font:bold,color:C.cyan});page.drawText(clean(t),{x:P.m+27,y:y-2,size:14,font:bold,color:C.navy});y-=12;page.drawLine({start:{x:P.m+27,y},end:{x:P.w-P.m,y},thickness:1,color:C.line});y-=17};
  const kv=(k,v)=>{ensure(30);page.drawText(clean(k).toUpperCase(),{x:P.m,y,size:6.8,font:bold,color:C.grey});y-=11;text(v,{size:8.8,after:7})};
  add();page.drawRectangle({x:P.m,y:530,width:cw,height:215,color:C.navy});page.drawText(controlled?"CONTROLLED EXECUTIVE REPORT":"DRAFT - NOT CONTROLLED FOR ISSUE",{x:64,y:708,size:9,font:bold,color:controlled?C.cyan:rgb(1,.68,.35)});page.drawText("GAP ASSESSMENT",{x:64,y:660,size:25,font:bold,color:C.white});page.drawText("EXECUTIVE REPORT",{x:64,y:626,size:25,font:bold,color:C.white});text(assessment.standard,{x:64,width:cw-44,size:12,color:C.white,after:0});page.drawText(clean(ref),{x:64,y:557,size:10,font:bold,color:C.cyan});y=495;
  const vals=[[`${score??"-"}%`,"ASSURANCE SCORE",C.blue],[`${progress.percentage}%`,"PROGRESS",C.blue],[open.length,"OPEN FINDINGS",open.length?C.red:C.green],[major,"MAJOR NC",major?C.red:C.green]];const mw=(cw-24)/4;vals.forEach((v,i)=>{const x=P.m+i*(mw+8);page.drawRectangle({x,y:y-58,width:mw,height:58,color:C.pale,borderColor:C.line,borderWidth:.7});page.drawRectangle({x,y:y-58,width:4,height:58,color:v[2]});page.drawText(String(v[0]),{x:x+13,y:y-27,size:18,font:bold,color:v[2]});page.drawText(v[1],{x:x+13,y:y-44,size:6.5,font:bold,color:C.grey})});y-=88;kv("Standard",assessment.standard);kv("Report status",`${label(status)} | ${label(report.confidentiality||"Internal")}`);kv("Maturity",maturity(score));kv("Prepared / reviewed / approved",`${report.prepared_by||"Not recorded"} | ${report.reviewed_by||"Not recorded"} | ${report.approved_by||"Not recorded"}`);
  add();section(1,"Executive summary");text(report.executive_summary,{size:9.7,leading:13.5});section(2,"Methodology and sampling");text(report.methodology_and_sampling,{size:9.2,leading:13});section(3,"Limitations and exclusions");text(report.limitations_and_exclusions,{size:9.2,leading:13});section(4,"Priority actions");text(report.priority_actions,{size:9.2,leading:13});section(5,"Overall conclusion");text(report.overall_conclusion,{size:9.7,leading:13.5});
  section(6,"Clause and requirement results");
  for(const q of questions){const a=answerMap.get(q.question_number),result=a?.score===null||a?.score===undefined?"Not assessed":`Score ${a.score}`;const lines=wrap(`${q.question||q.requirement_summary||"Requirement"} ${a?.notes?`Assessor note: ${a.notes}`:""}`,reg,8,cw-22).slice(0,7),h=31+lines.length*10;ensure(h+8);const accent=!a?C.grey:Number(a.score)>=4?C.green:Number(a.score)<=1?C.red:C.blue;page.drawRectangle({x:P.m,y:y-h,width:cw,height:h,color:C.pale,borderColor:C.line,borderWidth:.5});page.drawRectangle({x:P.m,y:y-h,width:4,height:h,color:accent});page.drawText(`${clean(q.question_number)} | Clause ${clean(q.clause)} | ${result}`,{x:P.m+11,y:y-14,size:8.3,font:bold,color:C.navy});let ry=y-28;for(const l of lines){page.drawText(l,{x:P.m+11,y:ry,size:8,font:reg,color:C.ink});ry-=10}y-=h+7}
  section(7,"Controlled findings");if(!findings.length)text("No formal findings are recorded.");for(const f of findings){kv("Finding",`${f.question_number||f.id} | ${label(f.finding_type)} | ${label(f.status)}`);kv("Statement",f.finding_statement||f.requirement_summary);kv("Objective evidence",f.objective_evidence)}
  section(8,"Report control");kv("Distribution",report.distribution_list);kv("Prepared by",report.prepared_by);kv("Reviewed by",report.reviewed_by);kv("Approved by",report.approved_by);text("This controlled report is generated from live RPG Intelligence assessment records. Automated narrative and scores remain subject to competent review and do not replace accredited certification judgement.",{size:8,color:C.grey});
  const pages=pdf.getPages();pages.forEach((p,i)=>{p.drawLine({start:{x:P.m,y:40},end:{x:P.w-P.m,y:40},thickness:.7,color:C.line});p.drawText(`${controlled?"CONTROLLED":"DRAFT"} | ${label(report.confidentiality||"Internal")} | ${clean(ref)}`,{x:P.m,y:25,size:6.8,font:reg,color:C.grey});p.drawText(`Page ${i+1} of ${pages.length}`,{x:P.w-P.m-58,y:25,size:6.8,font:reg,color:C.grey})});
  const bytes=await pdf.save(),name=`${ref}-${status}.pdf`.replace(/[^a-zA-Z0-9._-]/g,"-");return new Response(bytes,{headers:{"Content-Type":"application/pdf","Content-Disposition":`inline; filename="${name}"`,"Cache-Control":"private, no-store"}});
}
