import Link from "next/link";
import PermitToWorkForm from "../../../../../components/PermitToWorkForm";
import { requirePlanAccess } from "../../../../../lib/plan-access";
import {requireOrganizationAccess} from "../../../../../lib/organization-access";
import {createAdminClient} from "../../../../../lib/supabase/admin";

import {createPermit} from "./actions";
import {loadPermitParticipants} from "../../../../../lib/permitParticipants";
import {loadPermitCompanyOptions} from "../../../../../lib/permitCompanyOptions";

export const metadata={title:"New Permit to Work | RPG Excellence"};
export const dynamic="force-dynamic";

export default async function NewPermitPage(){
  const access=await requireOrganizationAccess("risk_management","contribute","/portal/health-safety/permits/new"),{user,organization}=access;
  await requirePlanAccess(user.id,"professional","Permit to Work");
  const admin=createAdminClient();
  const [participants,companyOptions]=await Promise.all([loadPermitParticipants(organization),loadPermitCompanyOptions(organization)]);
  const {data:assessments,error:assessmentError}=await admin.from("hs_risk_assessments").select("id,assessment_reference,title").eq("organization_id",organization.id).in("status",["approved","communicated"]).order("updated_at",{ascending:false});
  if(assessmentError)throw new Error(assessmentError.message);
  const now=new Date(),until=new Date(now.getTime()+8*60*60*1000),local=value=>new Date(value.getTime()-value.getTimezoneOffset()*60000).toISOString().slice(0,16);
  return <main className="pnPage"><style>{`*{box-sizing:border-box}.pnPage{min-height:100vh;padding:32px 22px 90px;background:#edf4f8;color:#071d3a;font-family:Arial,sans-serif}.pnShell{max-width:1120px;margin:auto}.pnTop{display:flex;justify-content:space-between;gap:20px;align-items:flex-start;flex-wrap:wrap;margin-bottom:22px}.pnTop small{color:#087f6c;font-weight:900;letter-spacing:.1em}.pnTop h1{margin:6px 0;font-size:34px}.pnTop p{margin:0;color:#657b91}.pnBack{padding:11px 15px;border:1px solid #cbd8e3;border-radius:9px;background:#fff;color:#173b59;text-decoration:none;font-weight:850}`}</style><div className="pnShell"><header className="pnTop"><div><small>H&amp;S HUB · CONTROL OF HIGH-RISK WORK</small><h1>Create a Permit to Work</h1><p>Define, verify and authorise hazardous work within controlled limits.</p></div><Link className="pnBack" href="/portal/health-safety/permits">← Permit Register</Link></header><PermitToWorkForm action={createPermit} participants={participants} companyOptions={companyOptions} organizationName={organization.name} assessments={assessments||[]} now={local(now)} until={local(until)}/></div></main>;
}
