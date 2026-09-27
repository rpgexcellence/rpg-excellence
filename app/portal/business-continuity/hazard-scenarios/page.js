import Link from "next/link";
import {redirect} from "next/navigation";
import BCPHazardScenarioAssessment from "../../../../components/BCPHazardScenarioAssessment";
import {createClient} from "../../../../lib/supabase/server";

export const metadata={title:"BCP Hazard Scenario Risk Assessment | RPG Excellence"};
export const dynamic="force-dynamic";
const clean=value=>String(value??"").trim();
const parseArray=(fd,name)=>{try{const value=JSON.parse(clean(fd.get(name))||"[]");return Array.isArray(value)?value:[]}catch{return []}};
const within=(value,min,max,fallback)=>{const n=Number(value);return Number.isFinite(n)?Math.max(min,Math.min(max,n)):fallback};
const riskMetrics=r=>{const impact=Math.max(...Object.values(r?.impact||{}).map(Number),1),likelihood=within(r?.likelihood,1,5,1),effectiveness=within(r?.controlEffectiveness,0,100,0),residualLikelihood=Math.max(1,Math.ceil(likelihood*(1-effectiveness/100)));return{impact,likelihood,inherent:impact*likelihood,residualLikelihood,residual:impact*residualLikelihood}};
const riskName=(risk,index)=>clean(risk?.name)||`Scenario ${index+1}`;
const validateAssessment=({profile,participants,risks,title,scope,nextReview,reviewer})=>{
 const steps=[[],[],[],[],[],[]];
 if(!profile)steps[0].push("Select a Module 1 Site Profile");
 if(!participants.length)steps[0].push("Select at least one assessment participant");
 if(!title)steps[0].push("Enter the assessment title");
 if(!scope)steps[0].push("Describe the operational activities and local scope");
 if(!nextReview)steps[0].push("Select the next review date");
 if(!risks.length)steps[1].push("Select at least one credible hazard scenario");
 risks.forEach((risk,index)=>{
  const name=riskName(risk,index),residual=riskMetrics(risk).residual;
  if(!clean(risk?.name))steps[1].push(`${name}: enter the scenario name`);
  if(!clean(risk?.description))steps[2].push(`${name}: add a detailed risk / hazard description`);
  if(!Array.isArray(risk?.affectedProcesses)||!risk.affectedProcesses.length)steps[2].push(`${name}: select at least one affected process`);
  if(!Array.isArray(risk?.applicableSystems)||!risk.applicableSystems.length)steps[2].push(`${name}: select management-system applicability`);
  if(!Array.isArray(risk?.existingControls)||!risk.existingControls.length)steps[3].push(`${name}: add at least one existing control`);
  if(!clean(risk?.owner))steps[3].push(`${name}: select a risk owner from Company Users`);
  if(!clean(risk?.treatment))steps[4].push(`${name}: select a treatment decision`);
  if(!clean(risk?.decisionRationale))steps[4].push(`${name}: add the treatment and tolerability rationale`);
  if(residual>=6&&(!Array.isArray(risk?.actions)||!risk.actions.length))steps[4].push(`${name}: add a treatment action because residual risk is elevated`);
 });
 if(!reviewer)steps[4].push("Select a reviewer or approver from Company Users");
 steps[5]=[...steps[2],...steps[3],...steps[4]];
 const complete=steps.map(items=>items.length===0);
 return{steps,complete,percent:Math.round(complete.filter(Boolean).length/complete.length*100),firstIncomplete:complete.findIndex(value=>!value)};
};

async function saveHazards(_previousState,fd){
 "use server";
 const s=await createClient(),{data:{user}}=await s.auth.getUser();
 if(!user)redirect("/portal/login?next=/portal/business-continuity/hazard-scenarios");
 const{data:org}=await s.from("organizations").select("id").eq("owner_id",user.id).order("created_at").limit(1).maybeSingle();
 if(!org)return{error:"Create an organisation before starting Module 5."};
 const t=name=>clean(fd.get(name)),id=t("assessment_id"),intent=t("intent");let existing=null;
 if(id){const{data}=await s.from("bcp_hazard_assessments").select("*").eq("id",id).eq("organization_id",org.id).eq("owner_id",user.id).maybeSingle();existing=data;if(!existing)return{error:"This Module 5 assessment could not be found."}}
 if(intent==="archive"){if(!existing)return{error:"Only an existing assessment can be archived."};const{error}=await s.from("bcp_hazard_assessments").update({status:"archived",updated_at:new Date().toISOString()}).eq("id",existing.id).eq("owner_id",user.id);if(error)return{error:error.message};redirect("/portal/business-continuity")}
 const profileId=t("site_profile_id"),contextId=t("context_assessment_id"),roleId=t("role_assessment_id");
 const [{data:profile},{data:context},{data:role}]=await Promise.all([
  profileId?s.from("bcp_site_profiles").select("*").eq("id",profileId).eq("organization_id",org.id).neq("status","archived").maybeSingle():{data:null},
  contextId?s.from("bcp_context_assessments").select("*").eq("id",contextId).eq("organization_id",org.id).neq("status","archived").maybeSingle():{data:null},
  roleId?s.from("bcp_role_assessments").select("*").eq("id",roleId).eq("organization_id",org.id).neq("status","archived").maybeSingle():{data:null}
 ]);
 const [peopleResult,permissionsResult]=await Promise.all([
  s.from("organization_people").select("id,first_name,last_name").eq("organization_id",org.id).eq("account_status","active"),
  s.from("organization_person_permissions").select("person_id").eq("organization_id",org.id).eq("module_key","business_continuity").neq("access_level","none")
 ]);
 const permittedIds=new Set((permissionsResult.data||[]).map(x=>x.person_id));
 const controlledPeople=new Set((peopleResult.data||[]).filter(person=>permittedIds.has(person.id)).map(person=>`${person.first_name||""} ${person.last_name||""}`.trim()).filter(Boolean));
 const participants=parseArray(fd,"participants").map(clean).filter(Boolean),risks=parseArray(fd,"scenario_assessments").map(r=>({...r,calculated:riskMetrics(r)}));
 if(participants.some(name=>!controlledPeople.has(name)))return{error:"Remove invalid participant entries and select participants from active Company Users with Business Continuity access."};
 const field=(name,fallback="")=>t(name)||clean(fallback);
 const assessmentTitle=field("assessment_title",existing?.assessment_title),operationalDescription=field("operational_description",existing?.operational_description),nextReviewDate=field("next_review_date",existing?.next_review_date),reviewFrequency=field("review_frequency",existing?.review_frequency||"Semi-annually"),reviewer=field("reviewer_name",existing?.reviewed_by),comment=field("review_comment",existing?.review_comment);
 const validation=validateAssessment({profile,participants,risks,title:assessmentTitle,scope:operationalDescription,nextReview:nextReviewDate,reviewer});
 const completion=validation.percent;
 if(["review","approve"].includes(intent)&&validation.firstIncomplete>=0){const step=validation.firstIncomplete,items=validation.steps[step];return{error:`Cannot submit: ${items.length} requirement${items.length===1?" is":"s are"} incomplete in Step ${step+1}.`,validation:{step,items}}};
 if(intent==="approve"&&profile?.status!=="approved")return{error:"Approve the linked Module 1 Site Profile before approving Module 5."};
 if(intent==="approve"&&context&&context.status!=="approved")return{error:"The linked Module 3 Context Assessment must be approved first."};
 if(intent==="approve"&&role&&role.status!=="approved")return{error:"The linked Module 4 Roles Assessment must be approved first."};
 if(reviewer&&!controlledPeople.has(reviewer))return{error:"Select the reviewer or approver from active Company Users with Business Continuity access.",validation:{step:4,items:["Reviewer / approver is not an active Company User with Business Continuity access"]}};
 const now=new Date().toISOString(),currentVersion=Number(existing?.version)||1,editingApproved=existing?.status==="approved"&&intent!=="approve",version=editingApproved?currentVersion+1:currentVersion,status=intent==="approve"?"approved":intent==="review"?"ready_for_review":"draft";
 const data={owner_id:user.id,organization_id:org.id,site_profile_id:profile?.id||null,context_assessment_id:context?.id||null,role_assessment_id:role?.id||null,site_profile_version:profile?.version||null,context_assessment_version:context?.version||null,role_assessment_version:role?.version||null,source_snapshot:{profile,context,role},assessment_title:assessmentTitle||"BC risk assessment - hazard scenarios",participants,operational_description:operationalDescription,scenario_screening:risks.map(r=>({id:r.id,name:r.name,category:r.category,applicableSystems:r.applicableSystems})),scenario_assessments:risks,methodology:{impactMethod:"Highest applicable credible impact across injury, collision, environment, energy, assets, customer assets, reputation and legal/contractual",inherentFormula:"Impact x likelihood",residualMethod:"Control effectiveness adjusts likelihood",targetMethod:"Selected target impact x target likelihood",appetiteScore:within(t("risk_appetite_score"),1,25,9),scale:"5 x 5",bands:{low:"1-5",moderate:"6-11",high:"12-19",critical:"20-25"}},review_frequency:reviewFrequency,next_review_date:nextReviewDate||null,completion_percent:completion,status,version,prepared_by:existing?.prepared_by||user.email||"Account owner",reviewed_by:reviewer||null,reviewed_at:intent==="approve"?now:existing?.reviewed_at||null,review_comment:comment||null,approved_by:intent==="approve"?reviewer:existing?.approved_by||null,approved_at:intent==="approve"?now:existing?.approved_at||null,updated_at:now};
 if(editingApproved){const{error}=await s.from("bcp_hazard_assessment_versions").insert({assessment_id:existing.id,organization_id:org.id,owner_id:user.id,version:currentVersion,status:existing.status,snapshot:existing,change_reason:"Approved version superseded"});if(error)return{error:error.message}}
 let savedId=existing?.id,error;if(existing)({error}=await s.from("bcp_hazard_assessments").update(data).eq("id",existing.id).eq("owner_id",user.id));else{const result=await s.from("bcp_hazard_assessments").insert({...data,assessment_reference:`BCP-HZ-${new Date().getUTCFullYear()}-${crypto.randomUUID().slice(0,6).toUpperCase()}`}).select("id").single();savedId=result.data?.id;error=result.error}if(error)return{error:error.message};
 if(intent==="approve"){const{error:versionError}=await s.from("bcp_hazard_assessment_versions").upsert({assessment_id:savedId,organization_id:org.id,owner_id:user.id,version,status,snapshot:{...data,id:savedId},change_reason:comment||"Controlled approval"},{onConflict:"assessment_id,version"});if(versionError)return{error:versionError.message}}
 if(intent==="continue")redirect(`/portal/business-continuity/hazard-scenarios?id=${savedId}&step=${within(t("next_step"),0,5,0)}`);redirect(`/portal/business-continuity/hazard-scenarios?id=${savedId}&step=5`);
}

export default async function HazardScenarioPage({searchParams}){const params=await searchParams,s=await createClient(),{data:{user}}=await s.auth.getUser();if(!user)redirect("/portal/login?next=/portal/business-continuity/hazard-scenarios");const{data:org}=await s.from("organizations").select("id,name").eq("owner_id",user.id).order("created_at").limit(1).maybeSingle();let profiles=[],contexts=[],roles=[],companyPeople=[],initial=null;if(org){const[profilesResult,contextsResult,rolesResult,peopleResult,permissionsResult]=await Promise.all([s.from("bcp_site_profiles").select("*").eq("organization_id",org.id).neq("status","archived").order("updated_at",{ascending:false}),s.from("bcp_context_assessments").select("*").eq("organization_id",org.id).neq("status","archived").order("updated_at",{ascending:false}),s.from("bcp_role_assessments").select("*").eq("organization_id",org.id).neq("status","archived").order("updated_at",{ascending:false}),s.from("organization_people").select("id,first_name,last_name,email,position,account_status").eq("organization_id",org.id).eq("account_status","active").order("last_name"),s.from("organization_person_permissions").select("person_id").eq("organization_id",org.id).eq("module_key","business_continuity").neq("access_level","none")]);profiles=profilesResult.data||[];contexts=contextsResult.data||[];roles=rolesResult.data||[];const permittedIds=new Set((permissionsResult.data||[]).map(permission=>permission.person_id));companyPeople=(peopleResult.data||[]).filter(person=>permittedIds.has(person.id));if(params?.new!=="1"){let query=s.from("bcp_hazard_assessments").select("*").eq("organization_id",org.id).neq("status","archived");if(params?.id)query=query.eq("id",params.id);({data:initial}=await query.order("updated_at",{ascending:false}).limit(1).maybeSingle())}}return <main style={{minHeight:"100vh",padding:"26px 2vw 80px",background:"#edf3f8",fontFamily:"Arial,sans-serif"}}><div style={{maxWidth:1780,margin:"auto"}}><header style={{display:"flex",justifyContent:"space-between",gap:20,marginBottom:20}}><div><small style={{color:"#6845d1",fontWeight:900,letterSpacing:".1em"}}>BCP HUB · MODULE 5 · ISO 22301 CLAUSE 8.2.3</small><h1 style={{margin:"7px 0",color:"#071d3a",fontSize:42}}>Risk Assessment - Hazard Scenarios</h1><p style={{margin:0,color:"#62788e"}}>Screen credible disruption threats, quantify inherent and residual risk, and control treatment decisions.</p></div><div style={{display:"flex",gap:8}}><Link href="/portal/business-continuity/hazard-scenarios?new=1" style={{padding:"11px 14px",borderRadius:8,background:"#315fe6",color:"#fff",textDecoration:"none",fontWeight:850}}>+ New assessment</Link><Link href="/portal/business-continuity" style={{padding:"11px 14px",border:"1px solid #c5d3e0",borderRadius:8,background:"#fff",color:"#173b60",textDecoration:"none",fontWeight:850}}>← BCP Hub</Link></div></header><BCPHazardScenarioAssessment action={saveHazards} profiles={profiles} contexts={contexts} roles={roles} companyPeople={companyPeople} initial={initial} organisationName={org?.name||""} startStep={params?.step||0}/></div></main>}
