"use server";
import {redirect} from "next/navigation";
import {revalidatePath} from "next/cache";
import {createAdminClient} from "../../../../lib/supabase/admin";
import {createClient} from "../../../../lib/supabase/server";

const clean=v=>String(v||"").trim();
const number=(v,min=1,max=5)=>Math.max(min,Math.min(max,Number(v)||min));
const list=v=>{try{const parsed=JSON.parse(clean(v)||"[]");return Array.isArray(parsed)?parsed:[]}catch{return[]}};
const object=v=>{try{return JSON.parse(clean(v)||"{}")||{}}catch{return{}}};

export async function saveISMSRisk(fd){
 const s=await createClient(),{data:{user}}=await s.auth.getUser();
 if(!user)redirect("/portal/login?next=/portal/information-security/risk-management");
 const{data:org}=await s.from("organizations").select("id").eq("owner_id",user.id).order("created_at").limit(1).maybeSingle();
 if(!org)throw new Error("Create an organisation before recording ISMS risks.");
 const intent=clean(fd.get("intent"))||"complete",title=clean(fd.get("title")),cause=clean(fd.get("cause")),event=clean(fd.get("event")),consequence=clean(fd.get("consequence")),rationale=clean(fd.get("assessment_rationale"));
 const ownerPersonId=clean(fd.get("risk_owner_person_id"));
 const {data:ownerPerson,error:ownerError}=await s.from("organization_people").select("id,first_name,last_name,email").eq("id",ownerPersonId||"00000000-0000-0000-0000-000000000000").eq("organization_id",org.id).eq("account_status","active").maybeSingle();
 if(ownerError||!ownerPerson)throw new Error("Select an active risk owner from the company user list.");
 const riskOwner=[ownerPerson.first_name,ownerPerson.last_name].filter(Boolean).join(" ")||ownerPerson.email;
 if(!title||!riskOwner)throw new Error("Enter the risk title and select a risk owner.");
 if(intent==="complete"&&(!cause||!event||!consequence||!rationale))throw new Error("Complete the risk statement and assessment rationale.");
 if(intent==="complete"&&!clean(fd.get("review_due_date")))throw new Error("Select the risk review due date before completing the assessment.");
 const id=clean(fd.get("risk_id")),soaAssessmentId=clean(fd.get("soa_assessment_id"))||null,controls=list(fd.get("controls")),assets=list(fd.get("asset_ids"));
 if(soaAssessmentId){const{data:owned}=await s.from("assessments").select("id").eq("id",soaAssessmentId).eq("owner_id",user.id).maybeSingle();if(!owned)throw new Error("The selected SoA workspace is not available to this account.")}
 const{data:methodology}=await s.from("isms_risk_methodologies").select("id,appetite_score").eq("organization_id",org.id).eq("status","approved").order("approved_at",{ascending:false}).limit(1).maybeSingle();
 const inherentLikelihood=number(fd.get("inherent_likelihood")),inherentImpact=number(fd.get("inherent_impact")),residualLikelihood=number(fd.get("residual_likelihood")),residualImpact=number(fd.get("residual_impact")),targetLikelihood=number(fd.get("target_likelihood")),targetImpact=number(fd.get("target_impact")),residualScore=residualLikelihood*residualImpact,treatmentDecision=clean(fd.get("treatment_decision"))||null;
 const status=intent==="draft"?"draft":treatmentDecision==="retain"?(residualScore>(methodology?.appetite_score||9)?"acceptance_pending":"approved"):(clean(fd.get("treatment_action"))?"treatment_in_progress":"treatment_required");
 const data={owner_id:user.id,organization_id:org.id,methodology_id:methodology?.id||null,soa_assessment_id:soaAssessmentId,title,cause:cause||null,event:event||null,consequence:consequence||null,risk_owner:riskOwner,risk_owner_person_id:ownerPerson.id,source:clean(fd.get("source")),scope:clean(fd.get("scope")),cia_properties:list(fd.get("cia_properties")),affected_processes:list(fd.get("affected_processes")),status,treatment_decision:treatmentDecision,inherent_likelihood:inherentLikelihood,inherent_impact:inherentImpact,residual_likelihood:residualLikelihood,residual_impact:residualImpact,target_likelihood:targetLikelihood,target_impact:targetImpact,impact_dimensions:object(fd.get("impact_dimensions")),assessment_rationale:rationale||null,assumptions:clean(fd.get("assumptions")),evidence_reference:clean(fd.get("evidence_reference")),review_due_date:clean(fd.get("review_due_date"))||null,completion_percent:number(fd.get("completion_percent"),0,100),current_assessment_step:number(fd.get("current_assessment_step"),1,5),updated_at:new Date().toISOString()};
 let risk,error;
if(id){const result=await s.from("isms_risks").update(data).eq("id",id).eq("owner_id",user.id).select("id,risk_reference").single();risk=result.data;error=result.error}else{const refResult=await s.rpc("next_isms_risk_reference");const reference=refResult.data||("ISR-"+new Date().getUTCFullYear()+"-"+crypto.randomUUID().slice(0,6).toUpperCase());const result=await s.from("isms_risks").insert({...data,risk_reference:reference}).select("id,risk_reference").single();risk=result.data;error=result.error}
 if(error)throw new Error(error.message);
 const {error:controlError}=await createAdminClient().rpc("replace_isms_soa_links",{p_risk:risk.id,p_actor:user.id,p_assessment:soaAssessmentId,p_controls:controls});
 if(controlError)throw new Error("Risk controls could not be saved. Check the SoA workflow migration, then retry.");
 await s.from("isms_risk_assets").delete().eq("risk_id",risk.id).eq("owner_id",user.id);
 if(assets.length){const{error:assetError}=await s.from("isms_risk_assets").insert(assets.map(assetId=>({risk_id:risk.id,asset_id:assetId,owner_id:user.id})));if(assetError)throw new Error(assetError.message)}
 const action=clean(fd.get("treatment_action"));
 if(action){const treatmentData={action,action_owner:clean(fd.get("treatment_owner"))||riskOwner,target_date:clean(fd.get("treatment_target_date"))||null,status:"planned",resources:clean(fd.get("treatment_resources"))};const treatmentId=clean(fd.get("treatment_id"));if(treatmentId){const{error:treatmentError}=await s.from("isms_risk_treatments").update(treatmentData).eq("id",treatmentId).eq("risk_id",risk.id).eq("owner_id",user.id);if(treatmentError)throw new Error(treatmentError.message)}else{const{error:treatmentError}=await s.from("isms_risk_treatments").insert({risk_id:risk.id,owner_id:user.id,...treatmentData});if(treatmentError)throw new Error(treatmentError.message)}}
 if(treatmentDecision==="retain"&&residualScore>(methodology?.appetite_score||9)){await s.from("isms_risk_acceptances").insert({risk_id:risk.id,owner_id:user.id,acceptance_authority:clean(fd.get("acceptance_authority"))||"Senior management",rationale:clean(fd.get("acceptance_rationale"))||rationale,accepted_score:residualScore,decision:"pending",expires_at:clean(fd.get("acceptance_expires_at"))||null})}
 revalidatePath("/portal/information-security/risk-management");
 revalidatePath("/portal/soa/management-board");
 if(soaAssessmentId)revalidatePath(`/portal/assessments/${soaAssessmentId}/soa`);
 redirect("/portal/information-security/risk-management?risk="+encodeURIComponent(risk.id)+"&saved="+(intent==="draft"?"draft":"1"));
}
