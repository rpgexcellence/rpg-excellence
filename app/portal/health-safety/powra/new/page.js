import Link from "next/link";
import { redirect } from "next/navigation";
import PowraForm from "../../../../../components/PowraForm";
import { createClient } from "../../../../../lib/supabase/server";
import { requirePlanAccess } from "../../../../../lib/plan-access";

export const metadata={title:"New POWRA | RPG Excellence"};
export const dynamic="force-dynamic";

async function createPowra(formData){
  "use server";
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user) redirect("/portal/login?next=/portal/health-safety/powra/new");
  await requirePlanAccess(user.id,"professional","POWRA");
  const {data:organisation,error:orgError}=await supabase.from("organizations").select("id").eq("owner_id",user.id).order("created_at").limit(1).maybeSingle();
  if(orgError) throw new Error(orgError.message);
  if(!organisation) throw new Error("Create an organisation before starting a POWRA.");
  const text=name=>String(formData.get(name)||"").trim();
  let prestartChecks=[],hazards=[];
  try{prestartChecks=JSON.parse(text("prestart_checks")||"[]");hazards=JSON.parse(text("hazards")||"[]");}catch{throw new Error("The POWRA answers could not be read.");}
  const task=text("task"),site=text("site_location"),completedBy=text("completed_by"),assessmentDate=text("assessment_date"),decision=text("decision");
  if(!task||!site||!completedBy||!assessmentDate) throw new Error("Complete the task, location, assessor and date.");
  if(!["safe_to_start","supervisor_review","stop_work"].includes(decision)) throw new Error("The POWRA decision is invalid.");
  if(decision!=="safe_to_start"&&!text("decision_reason")) throw new Error("Explain the stop-work or escalation decision.");
  const reference=`POWRA-${new Date().getUTCFullYear()}-${crypto.randomUUID().slice(0,6).toUpperCase()}`;
  const status=decision==="stop_work"?"stopped":decision==="supervisor_review"?"supervisor_review":"open";
  const {data,error}=await supabase.from("hs_powra_assessments").insert({owner_id:user.id,organization_id:organisation.id,powra_reference:reference,task,site_location:site,work_area:text("work_area")||null,completed_by:completedBy,team_members:text("team_members")||null,assessment_date:assessmentDate,linked_assessment_id:text("linked_assessment_id")||null,linked_permit_reference:text("linked_permit_reference")||null,prestart_checks:prestartChecks,hazards,additional_controls:hazards.filter(item=>item.control),decision,decision_reason:text("decision_reason")||null,supervisor_name:text("supervisor_name")||null,end_review:{conditions_changed:text("conditions_changed"),new_hazards:text("new_hazards"),controls_effective:text("controls_effective"),incident:text("incident"),comments:text("review_comments")},status}).select("id").single();
  if(error) throw new Error(error.message);
  redirect(`/portal/health-safety/powra/${data.id}`);
}

export default async function NewPowraPage(){
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user) redirect("/portal/login?next=/portal/health-safety/powra/new");
  const {data:assessments}=await supabase.from("hs_risk_assessments").select("id,assessment_reference,title").eq("owner_id",user.id).in("status",["approved","communicated"]).order("updated_at",{ascending:false});
  return <main className="pnPage"><style>{`*{box-sizing:border-box}.pnPage{min-height:100vh;padding:32px 22px 90px;background:#edf4f8;color:#071d3a;font-family:Arial,sans-serif}.pnShell{max-width:1120px;margin:auto}.pnTop{display:flex;justify-content:space-between;gap:20px;align-items:flex-start;flex-wrap:wrap;margin-bottom:22px}.pnTop small{color:#087f6c;font-weight:900;letter-spacing:.1em}.pnTop h1{margin:6px 0;font-size:34px}.pnTop p{margin:0;color:#657b91}.pnBack{padding:11px 15px;border:1px solid #cbd8e3;border-radius:9px;background:#fff;color:#173b59;text-decoration:none;font-weight:850}`}</style><div className="pnShell"><header className="pnTop"><div><small>H&amp;S HUB · POINT OF WORK CONTROL</small><h1>Point of Work Risk Assessment</h1><p>Stop, think, act and review before and after the task.</p></div><Link className="pnBack" href="/portal/health-safety/powra">← POWRA Register</Link></header><PowraForm action={createPowra} assessments={assessments||[]} today={new Date().toISOString().slice(0,10)}/></div></main>;
}
