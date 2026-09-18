import Link from "next/link";
import { redirect } from "next/navigation";
import BCPContextAssessment from "../../../../components/BCPContextAssessment";
import { createClient } from "../../../../lib/supabase/server";

export const metadata={title:"Organisational Context | RPG Excellence"};
export const dynamic="force-dynamic";

const clean=value=>String(value??"").trim();
const parseArray=(formData,name)=>{try{const value=JSON.parse(clean(formData.get(name))||"[]");return Array.isArray(value)?value:[]}catch{return []}};
const parseObject=(formData,name)=>{try{const value=JSON.parse(clean(formData.get(name))||"{}");return value&&typeof value==="object"&&!Array.isArray(value)?value:{}}catch{return {}}};
const within=(value,min,max,fallback)=>{const number=Number(value);return Number.isFinite(number)?Math.max(min,Math.min(max,number)):fallback};

function completionChecks({profile,external,internal,parties,objectives,risks,scope}){
 return [
  Boolean(profile),
  external.some(x=>clean(x?.issue)&&Array.isArray(x?.applicableSystems)&&x.applicableSystems.length),
  internal.some(x=>clean(x?.issue)&&Array.isArray(x?.applicableSystems)&&x.applicableSystems.length),
  parties.some(x=>clean(x?.name)&&clean(x?.requirement)&&clean(x?.communication)),
  objectives.some(x=>clean(x?.objective)&&clean(x?.metric)&&clean(x?.owner))&&risks.some(x=>clean(x?.description)&&clean(x?.owner)&&clean(x?.decision)),
  Boolean(clean(scope?.statement)&&(Array.isArray(scope?.boundarySelections)&&scope.boundarySelections.length||clean(scope?.boundaryNotes)||clean(scope?.boundaries)))
 ];
}

async function saveContext(_previousState,formData){
 "use server";
 const supabase=await createClient(),{data:{user}}=await supabase.auth.getUser();
 if(!user)redirect("/portal/login?next=/portal/business-continuity/context");
 const{data:org}=await supabase.from("organizations").select("id").eq("owner_id",user.id).order("created_at").limit(1).maybeSingle();
 if(!org)return{error:"Create an organisation before starting the context assessment."};
 const intent=clean(formData.get("intent")),assessmentId=clean(formData.get("assessment_id")),siteProfileId=clean(formData.get("site_profile_id"));
 const external=parseArray(formData,"external_context"),internal=parseArray(formData,"internal_context"),parties=parseArray(formData,"interested_parties"),objectives=parseArray(formData,"objectives"),risks=parseArray(formData,"risks_opportunities"),scope=parseObject(formData,"scope_data");
 let existing=null;
 if(assessmentId){const{data}=await supabase.from("bcp_context_assessments").select("*").eq("id",assessmentId).eq("organization_id",org.id).eq("owner_id",user.id).maybeSingle();existing=data;if(!existing)return{error:"This Module 3 assessment could not be found or you do not have access to it."}}
 if(intent==="archive"){
  if(!existing)return{error:"Only an existing assessment can be archived."};
  const{error}=await supabase.from("bcp_context_assessments").update({status:"archived",updated_at:new Date().toISOString()}).eq("id",existing.id).eq("owner_id",user.id);
  if(error)return{error:error.message};
  redirect("/portal/business-continuity");
 }
 let profile=null;
 if(siteProfileId){const{data}=await supabase.from("bcp_site_profiles").select("id").eq("id",siteProfileId).eq("organization_id",org.id).neq("status","archived").maybeSingle();profile=data}
 const checks=completionChecks({profile,external,internal,parties,objectives,risks,scope}),completed=checks.filter(Boolean).length,completionPercent=Math.round(completed/checks.length*100);
 if(["review","approve"].includes(intent)&&!checks.every(Boolean))return{error:"Complete all six controlled sections before submission: linked site, External context, Internal context, interested parties with communication, owned objectives and evaluated risks, and the BCMS scope."};
 const reviewer=clean(formData.get("reviewer_name")),reviewComment=clean(formData.get("review_comment"));
 if(intent==="approve"&&!reviewer)return{error:"Record the competent reviewer or approval authority before approval."};
 if(intent==="changes"&&(!reviewer||!reviewComment))return{error:"Record the reviewer and the changes required."};
 const currentVersion=Number(existing?.version)||1,editingApproved=existing?.status==="approved"&&intent!=="approve",version=editingApproved?currentVersion+1:currentVersion;
 const status=intent==="approve"?"approved":intent==="changes"?"changes_required":intent==="review"?"ready_for_review":"draft";
 const now=new Date().toISOString(),data={owner_id:user.id,organization_id:org.id,site_profile_id:profile?.id||null,assessment_title:clean(formData.get("assessment_title"))||"Organisational context and interested parties",participants:clean(formData.get("participants")),risk_appetite:within(formData.get("risk_appetite"),1,5,3),external_context:external,internal_context:internal,interested_parties:parties,objectives,risks_opportunities:risks,scope_data:scope,completion_percent:completionPercent,review_due_date:clean(formData.get("review_due_date"))||null,status,version,prepared_by:existing?.prepared_by||user.email||"Account owner",reviewed_by:["approve","changes"].includes(intent)?reviewer:null,reviewed_at:["approve","changes"].includes(intent)?now:null,review_comment:["approve","changes"].includes(intent)?reviewComment:null,approved_by:intent==="approve"?reviewer:null,approved_at:intent==="approve"?now:null,updated_at:now};
 if(editingApproved)await supabase.from("bcp_context_assessment_versions").insert({assessment_id:existing.id,organization_id:org.id,owner_id:user.id,version:currentVersion,status:existing.status,snapshot:existing,change_reason:"Approved version superseded by a new revision"});
 let savedId=existing?.id,error;
 if(existing)({error}=await supabase.from("bcp_context_assessments").update(data).eq("id",existing.id).eq("owner_id",user.id));
 else{const result=await supabase.from("bcp_context_assessments").insert({...data,assessment_reference:`BCP-CTX-${new Date().getUTCFullYear()}-${crypto.randomUUID().slice(0,6).toUpperCase()}`}).select("id").single();error=result.error;savedId=result.data?.id}
 if(error)return{error:error.message};
 if(intent==="approve")await supabase.from("bcp_context_assessment_versions").upsert({assessment_id:savedId,organization_id:org.id,owner_id:user.id,version,status:"approved",snapshot:{...data,id:savedId},change_reason:reviewComment||"Controlled approval"},{onConflict:"assessment_id,version"});
 if(intent==="continue")redirect(`/portal/business-continuity/context?id=${savedId}&step=${within(formData.get("next_step"),0,5,0)}`);
 redirect(`/portal/business-continuity/context?id=${savedId}&step=5`);
}

export default async function ContextPage({searchParams}){
 const params=await searchParams,supabase=await createClient(),{data:{user}}=await supabase.auth.getUser();
 if(!user)redirect("/portal/login?next=/portal/business-continuity/context");
 const{data:org}=await supabase.from("organizations").select("id,name").eq("owner_id",user.id).order("created_at").limit(1).maybeSingle();
 let profiles=[],initial=null;
 if(org){
  ({data:profiles=[]}=await supabase.from("bcp_site_profiles").select("id,profile_reference,region,country,location_name,address,site_leader,local_facilitator,operational_description,critical_products_services,value_chain_processes,support_processes,site_dependencies,interested_parties,training_participants").eq("organization_id",org.id).neq("status","archived").order("updated_at",{ascending:false}));
  if(params?.new!=="1"){
   let query=supabase.from("bcp_context_assessments").select("*").eq("organization_id",org.id).neq("status","archived");
   if(params?.id)query=query.eq("id",params.id);
   ({data:initial}=await query.order("updated_at",{ascending:false}).limit(1).maybeSingle());
  }
 }
 return <main style={{minHeight:"100vh",padding:"26px 2vw 80px",background:"#edf3f8",fontFamily:"Arial,sans-serif"}}><div style={{maxWidth:1740,margin:"auto"}}><header style={{display:"flex",justifyContent:"space-between",gap:20,alignItems:"start",marginBottom:20}}><div><small style={{color:"#6845d1",fontWeight:900,letterSpacing:".1em"}}>BCP HUB · MODULE 3 · ISO 22301 CLAUSE 4</small><h1 style={{margin:"7px 0",color:"#071d3a",fontSize:42}}>Context &amp; Interested Parties</h1><p style={{margin:0,color:"#62788e",fontSize:16}}>Turn organisational context, stakeholder requirements and scope decisions into a prioritised, auditable register.</p></div><div style={{display:"flex",gap:8}}><Link href="/portal/business-continuity/context?new=1" style={{padding:"11px 14px",border:"1px solid #315fe6",borderRadius:8,background:"#315fe6",color:"#fff",textDecoration:"none",fontWeight:850}}>+ New assessment</Link><Link href="/portal/business-continuity" style={{padding:"11px 14px",border:"1px solid #c5d3e0",borderRadius:8,background:"#fff",color:"#173b60",textDecoration:"none",fontWeight:850}}>← BCP Hub</Link></div></header><BCPContextAssessment action={saveContext} profiles={profiles||[]} initial={initial} organisationName={org?.name||""} startStep={params?.step||0}/></div></main>;
}
