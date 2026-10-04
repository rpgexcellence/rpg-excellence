import Link from "next/link";
import { redirect } from "next/navigation";
import { createPowra } from "./actions";
import { loadPowraCompanyOptions } from "../../../../../lib/powraCompanyOptions";
import PowraForm from "../../../../../components/PowraForm";
import { createClient } from "../../../../../lib/supabase/server";
import { requirePlanAccess } from "../../../../../lib/plan-access";

export const metadata={title:"New POWRA | RPG Excellence"};
export const dynamic="force-dynamic";


export default async function NewPowraPage(){
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user) redirect("/portal/login?next=/portal/health-safety/powra/new");
  await requirePlanAccess(user.id,"professional","POWRA");
  const { data: organization, error: orgError } = await supabase.from("organizations").select("*").eq("owner_id", user.id).order("created_at").limit(1).maybeSingle();
  if(orgError) throw new Error(orgError.message);
  if(!organization) redirect("/portal");
  const {sites,people} = await loadPowraCompanyOptions(organization.id);
  const {data:assessments,error:assessmentError}=await supabase.from("hs_risk_assessments").select("id,assessment_reference,title").eq("owner_id",user.id).in("status",["approved","communicated"]).order("updated_at",{ascending:false});
  if(assessmentError) throw new Error(assessmentError.message);
  return <main className="pnPage"><style>{`*{box-sizing:border-box}.pnPage{min-height:100vh;padding:32px 22px 90px;background:#edf4f8;color:#071d3a;font-family:Arial,sans-serif}.pnShell{max-width:1120px;margin:auto}.pnTop{display:flex;justify-content:space-between;gap:20px;align-items:flex-start;flex-wrap:wrap;margin-bottom:22px}.pnTop small{color:#087f6c;font-weight:900;letter-spacing:.1em}.pnTop h1{margin:6px 0;font-size:34px}.pnTop p{margin:0;color:#657b91}.pnBack{padding:11px 15px;border:1px solid #cbd8e3;border-radius:9px;background:#fff;color:#173b59;text-decoration:none;font-weight:850}`}</style><div className="pnShell"><header className="pnTop"><div><small>H&amp;S HUB · POINT OF WORK CONTROL</small><h1>Point of Work Risk Assessment</h1><p>Stop, think, act and review before and after the task.</p></div><Link className="pnBack" href="/portal/health-safety/powra">← POWRA Register</Link></header><PowraForm action={createPowra} sites={sites} people={people} numbering={organization} assessments={assessments||[]} today={new Date().toISOString().slice(0,10)}/></div></main>;
}
