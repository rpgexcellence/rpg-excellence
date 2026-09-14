import Link from "next/link";
import { redirect } from "next/navigation";
import PermitToWorkForm from "../../../../../components/PermitToWorkForm";
import { createClient } from "../../../../../lib/supabase/server";
import { requirePlanAccess } from "../../../../../lib/plan-access";

export const metadata={title:"New Permit to Work | RPG Excellence"};
export const dynamic="force-dynamic";

async function createPermit(formData){
  "use server";
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)redirect("/portal/login?next=/portal/health-safety/permits/new");
  await requirePlanAccess(user.id,"professional","Permit to Work");
  const {data:organisation,error:orgError}=await supabase.from("organizations").select("id").eq("owner_id",user.id).order("created_at").limit(1).maybeSingle();
  if(orgError)throw new Error(orgError.message);if(!organisation)throw new Error("Create an organisation before creating a permit.");
  const text=name=>String(formData.get(name)||"").trim();let hazards=[],precautions=[];
  try{hazards=JSON.parse(text("hazards")||"[]");precautions=JSON.parse(text("precautions")||"[]");}catch{throw new Error("The permit controls could not be read.");}
  const validFrom=text("valid_from"),validUntil=text("valid_until");
  if(!text("task_description")||!text("site_location")||!text("linked_assessment_id")||!text("emergency_arrangements")||!text("issuer_name")||!text("receiver_name"))throw new Error("Complete all mandatory permit fields.");
  if(!hazards.length||precautions.length<3)throw new Error("Select a hazard and verify at least three precautions.");
  if(!validFrom||!validUntil||new Date(validUntil)<=new Date(validFrom))throw new Error("The permit expiry must be after its start time.");
  if(text("issuer_declaration")!=="true"||text("receiver_declaration")!=="true")throw new Error("Both permit declarations must be accepted.");
  const reference=`PTW-${new Date().getUTCFullYear()}-${crypto.randomUUID().slice(0,6).toUpperCase()}`;
  const {data,error}=await supabase.from("hs_permits").insert({owner_id:user.id,organization_id:organisation.id,permit_reference:reference,permit_type:text("permit_type"),task_description:text("task_description"),site_location:text("site_location"),work_area:text("work_area")||null,equipment_asset:text("equipment_asset")||null,contractor_company:text("contractor_company")||null,linked_assessment_id:text("linked_assessment_id"),valid_from:new Date(validFrom).toISOString(),valid_until:new Date(validUntil).toISOString(),hazards,precautions,isolations:text("isolations")||null,emergency_arrangements:text("emergency_arrangements"),issuer_name:text("issuer_name"),receiver_name:text("receiver_name"),issuer_declaration:true,receiver_declaration:true,status:"draft"}).select("id").single();
  if(error)throw new Error(error.message);redirect(`/portal/health-safety/permits/${data.id}`);
}

export default async function NewPermitPage(){
  const supabase=await createClient();const {data:{user}}=await supabase.auth.getUser();if(!user)redirect("/portal/login?next=/portal/health-safety/permits/new");
  const {data:assessments}=await supabase.from("hs_risk_assessments").select("id,assessment_reference,title").eq("owner_id",user.id).in("status",["approved","communicated"]).order("updated_at",{ascending:false});
  const now=new Date(),until=new Date(now.getTime()+8*60*60*1000),local=value=>new Date(value.getTime()-value.getTimezoneOffset()*60000).toISOString().slice(0,16);
  return <main className="pnPage"><style>{`*{box-sizing:border-box}.pnPage{min-height:100vh;padding:32px 22px 90px;background:#edf4f8;color:#071d3a;font-family:Arial,sans-serif}.pnShell{max-width:1120px;margin:auto}.pnTop{display:flex;justify-content:space-between;gap:20px;align-items:flex-start;flex-wrap:wrap;margin-bottom:22px}.pnTop small{color:#087f6c;font-weight:900;letter-spacing:.1em}.pnTop h1{margin:6px 0;font-size:34px}.pnTop p{margin:0;color:#657b91}.pnBack{padding:11px 15px;border:1px solid #cbd8e3;border-radius:9px;background:#fff;color:#173b59;text-decoration:none;font-weight:850}`}</style><div className="pnShell"><header className="pnTop"><div><small>H&amp;S HUB · CONTROL OF HIGH-RISK WORK</small><h1>Create a Permit to Work</h1><p>Define, verify and authorise hazardous work within controlled limits.</p></div><Link className="pnBack" href="/portal/health-safety/permits">← Permit Register</Link></header><PermitToWorkForm action={createPermit} assessments={assessments||[]} now={local(now)} until={local(until)}/></div></main>;
}
