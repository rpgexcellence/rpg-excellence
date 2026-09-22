"use server";

import { redirect } from "next/navigation";
import { createClient } from "../../../../lib/supabase/server";

const clean = (v) => String(v ?? "").trim();
const parseArray = (fd, name) => { try { const value = JSON.parse(clean(fd.get(name)) || "[]"); return Array.isArray(value) ? value : []; } catch { return []; } };
const parseIds = (fd, name) => [...new Set(parseArray(fd, name).map(clean).filter(Boolean))];
const yes = (v) => v === true || v === "yes";
const daysUntil = (date) => date ? Math.ceil((new Date(date).getTime() - Date.now()) / 86400000) : null;
const calculate = (item) => {
  const controls = [item.contractControl,item.performanceMonitoring,item.auditAssurance,item.alternativeSource,item.communicationProtocol].filter(yes).length;
  const continuity = [item.bcpAvailable,item.bcpCurrent,item.bcpTested,item.rtoConfirmed,item.invocationReviewed].filter(yes).length;
  const required = Number(item.requiredRtoHours)||0, supplier = Number(item.supplierRecoveryHours)||0, rtoGap = required && supplier ? supplier-required : null;
  const overdue = (item.actions||[]).filter((a)=>a.status!=="closed"&&daysUntil(a.dueDate)<0).length;
  const capability = Math.round(controls/5*45+continuity/5*45+(item.performanceAcceptable==="yes"?10:0));
  const risk = Math.min(25,(Number(item.criticalityScore)||1)*4+(5-controls)*2+(5-continuity)*2+(rtoGap>0?5:0)+overdue*2);
  return { controlCoverage: controls, continuityCoverage: continuity, capabilityPercent: capability, rtoGapHours: rtoGap, overdueActions: overdue, riskScore: risk, riskBand: risk>=18?"Critical":risk>=12?"High":risk>=7?"Medium":"Low", assurance: capability>=80&&!(rtoGap>0)&&!overdue&&item.performanceAcceptable==="yes"?"Effective":capability>=55&&!overdue?"Partially effective":"Weak" };
};

export async function saveOutsourcedProcesses(_state, fd) {
  const s=await createClient(),{data:{user}}=await s.auth.getUser(); if(!user)redirect("/portal/login?next=/portal/business-continuity/outsourced-processes");
  const{data:org}=await s.from("organizations").select("id").eq("owner_id",user.id).order("created_at").limit(1).maybeSingle(); if(!org)return{error:"Create an organisation before starting Module 7."};
  const t=(name)=>clean(fd.get(name)),id=t("assessment_id"),intent=t("intent"); let existing=null;
  if(id){const{data}=await s.from("bcp_outsourced_process_assessments").select("*").eq("id",id).eq("organization_id",org.id).eq("owner_id",user.id).maybeSingle();existing=data;if(!existing)return{error:"This outsourced-process assessment could not be found."}}
  if(intent==="archive"){if(!existing)return{error:"Only an existing assessment can be archived."};const{error}=await s.from("bcp_outsourced_process_assessments").update({status:"archived",updated_at:new Date().toISOString()}).eq("id",existing.id).eq("owner_id",user.id);if(error)return{error:error.message};redirect("/portal/business-continuity")}
  const ids={profiles:parseIds(fd,"site_profile_id"),contexts:parseIds(fd,"context_assessment_id"),roles:parseIds(fd,"role_assessment_id"),hazards:parseIds(fd,"hazard_assessment_id"),bias:parseIds(fd,"bia_assessment_id")};
  const loadMany=(table,values)=>values.length?s.from(table).select("*").eq("organization_id",org.id).neq("status","archived").in("id",values):Promise.resolve({data:[],error:null});
  const results=await Promise.all([loadMany("bcp_site_profiles",ids.profiles),loadMany("bcp_context_assessments",ids.contexts),loadMany("bcp_role_assessments",ids.roles),loadMany("bcp_hazard_assessments",ids.hazards),loadMany("bcp_bia_assessments",ids.bias)]);
  const sourceError=results.find((x)=>x.error)?.error;if(sourceError)return{error:sourceError.message};
  const order=(rows,selected)=>selected.map((selectedId)=>(rows||[]).find((row)=>row.id===selectedId)).filter(Boolean);
  const[profiles,contexts,roles,hazards,bias]=results.map((result,index)=>order(result.data,Object.values(ids)[index]));
  if(!profiles.length||!bias.length||profiles.length!==ids.profiles.length||contexts.length!==ids.contexts.length||roles.length!==ids.roles.length||hazards.length!==ids.hazards.length||bias.length!==ids.bias.length)return{error:"Select valid Module 1 and Module 6 controlled records. Remove any unavailable or archived selections."};
  const controls=parseArray(fd,"supplier_controls").map((x)=>({...x,calculated:calculate(x)}));
  const checks=[controls.length>0,controls.every((x)=>x.supplierName&&x.processDescription&&x.processOwner),controls.every((x)=>Number(x.requiredRtoHours)>0),controls.every((x)=>x.controlMethod&&x.controlEvidence),controls.every((x)=>x.bcpAvailable&&x.capabilityEvidence),controls.every((x)=>x.performanceAcceptable&&x.performanceResult)];
  const completion=Math.round(checks.filter(Boolean).length/checks.length*100);
  if(["review","approve"].includes(intent)&&!checks.every(Boolean))return{error:"Complete supplier identity and ownership, linked recovery need, operational controls, evidence, continuity capability and performance results before submission."};
  if(intent==="approve"){for(const[records,label]of[[profiles,"Module 1 Site Profile"],[contexts,"Module 3 Context"],[roles,"Module 4 Roles"],[hazards,"Module 5 Hazards"],[bias,"Module 6 BIA"]])for(const record of records)if(record.status!=="approved")return{error:`Every linked ${label} record must be approved first.`}}
  const reviewer=t("reviewer_name"),comment=t("review_comment");if(intent==="approve"&&!reviewer)return{error:"Record the competent reviewer or approver."};
  const now=new Date().toISOString(),currentVersion=Number(existing?.version)||1,editingApproved=existing?.status==="approved"&&intent!=="approve",version=editingApproved?currentVersion+1:currentVersion,status=intent==="approve"?"approved":intent==="review"?"ready_for_review":"draft";
  const data={owner_id:user.id,organization_id:org.id,site_profile_id:profiles[0].id,context_assessment_id:contexts[0]?.id||null,role_assessment_id:roles[0]?.id||null,hazard_assessment_id:hazards[0]?.id||null,bia_assessment_id:bias[0].id,source_links:{siteProfiles:ids.profiles,contexts:ids.contexts,roles:ids.roles,hazards:ids.hazards,bias:ids.bias},source_versions:{siteProfiles:profiles.map((x)=>({id:x.id,version:x.version||1})),contexts:contexts.map((x)=>({id:x.id,version:x.version||1})),roles:roles.map((x)=>({id:x.id,version:x.version||1})),hazards:hazards.map((x)=>({id:x.id,version:x.version||1})),bias:bias.map((x)=>({id:x.id,version:x.version||1}))},source_snapshot:{profiles,contexts,roles,hazards,bias},assessment_title:t("assessment_title")||"Outsourced Process & Supply Chain Control",supplier_controls:controls,assurance_summary:{total:controls.length,critical:controls.filter((x)=>x.calculated.riskBand==="Critical").length,high:controls.filter((x)=>x.calculated.riskBand==="High").length,rtoGaps:controls.filter((x)=>x.calculated.rtoGapHours>0).length,overdueActions:controls.reduce((n,x)=>n+x.calculated.overdueActions,0),averageCapability:Math.round(controls.reduce((n,x)=>n+x.calculated.capabilityPercent,0)/Math.max(1,controls.length))},methodology:{clause:"ISO 22301:2019 8.1",source:"Modules 1, 3, 4, 5 and 6",engine:"Criticality + control coverage + continuity capability + RTO alignment + performance + action status"},review_frequency:t("review_frequency")||"Every 6 months",next_review_date:t("next_review_date")||null,completion_percent:completion,status,version,prepared_by:existing?.prepared_by||user.email||"Account owner",reviewed_by:intent==="approve"?reviewer:null,reviewed_at:intent==="approve"?now:null,review_comment:comment||null,approved_by:intent==="approve"?reviewer:null,approved_at:intent==="approve"?now:null,updated_at:now};
  if(editingApproved){const{error}=await s.from("bcp_outsourced_process_assessment_versions").insert({assessment_id:existing.id,organization_id:org.id,owner_id:user.id,version:currentVersion,status:existing.status,snapshot:existing,change_reason:"Approved version superseded"});if(error)return{error:error.message}}
  let savedId=existing?.id,error;if(existing)({error}=await s.from("bcp_outsourced_process_assessments").update(data).eq("id",existing.id).eq("owner_id",user.id));else{const result=await s.from("bcp_outsourced_process_assessments").insert({...data,assessment_reference:`BCP-OSC-${new Date().getUTCFullYear()}-${crypto.randomUUID().slice(0,6).toUpperCase()}`}).select("id").single();savedId=result.data?.id;error=result.error}if(error)return{error:error.message};
  if(intent==="approve"){const{error:ve}=await s.from("bcp_outsourced_process_assessment_versions").upsert({assessment_id:savedId,organization_id:org.id,owner_id:user.id,version,status,snapshot:{...data,id:savedId},change_reason:comment||"Controlled approval"},{onConflict:"assessment_id,version"});if(ve)return{error:ve.message}}
  if(intent==="continue")redirect(`/portal/business-continuity/outsourced-processes?id=${savedId}&step=${Math.max(0,Math.min(5,Number(t("next_step"))||0))}`);redirect(`/portal/business-continuity/outsourced-processes?id=${savedId}&step=5`);
}
