"use server";

import { redirect } from "next/navigation";
import { createClient } from "../../../../lib/supabase/server";

const clean = (v) => String(v ?? "").trim();
const parseArray = (fd, name) => { try { const v = JSON.parse(clean(fd.get(name)) || "[]"); return Array.isArray(v) ? v : []; } catch { return []; } };
const sourceVersion = (row) => row ? { id: row.id, version: row.version || 1, status: row.status } : null;

export async function saveStrategiesSolutions(_state, fd) {
  const s = await createClient(), { data: { user } } = await s.auth.getUser();
  if (!user) redirect("/portal/login?next=/portal/business-continuity/strategies-solutions");
  const { data: org } = await s.from("organizations").select("id").eq("owner_id", user.id).order("created_at").limit(1).maybeSingle();
  if (!org) return { error: "Create an organisation before starting Module 8." };
  const text = (name) => clean(fd.get(name)), id = text("assessment_id"), intent = text("intent");
  let existing = null;
  if (id) { const { data } = await s.from("bcp_strategy_assessments").select("*").eq("id", id).eq("organization_id", org.id).eq("owner_id", user.id).maybeSingle(); existing = data; if (!existing) return { error: "This Module 8 assessment could not be found." }; }
  if (intent === "archive") { if (!existing) return { error: "Only an existing assessment can be archived." }; const { error } = await s.from("bcp_strategy_assessments").update({status:"archived",updated_at:new Date().toISOString()}).eq("id",existing.id).eq("owner_id",user.id); if (error) return {error:error.message}; redirect("/portal/business-continuity"); }
  const biaId = text("bia_assessment_id"), hazardId = text("hazard_assessment_id"), outsourcedId = text("outsourced_assessment_id");
  if (!biaId) return { error: "Select a valid Module 6 Business Impact Analysis." };
  const load = (table, sourceId) => sourceId ? s.from(table).select("*").eq("id", sourceId).eq("organization_id", org.id).neq("status", "archived").maybeSingle() : Promise.resolve({data:null,error:null});
  const [biaResult, hazardResult, outsourcedResult] = await Promise.all([load("bcp_bia_assessments",biaId),load("bcp_hazard_assessments",hazardId),load("bcp_outsourced_process_assessments",outsourcedId)]);
  const sourceError = [biaResult,hazardResult,outsourcedResult].find((x)=>x.error)?.error; if (sourceError) return {error:sourceError.message};
  const bia = biaResult.data, hazard = hazardResult.data, outsourced = outsourcedResult.data; if (!bia) return {error:"The selected BIA is unavailable or archived."};
  const assessments = parseArray(fd,"strategy_assessments"), resources = parseArray(fd,"resource_requirements"), actions = parseArray(fd,"implementation_actions");
  const feasibility = assessments.map((x)=>{const timing=Number(x.recoveryLeadHours)>0&&Number(x.recoveryLeadHours)<=Number(x.rtoHours),capacity=Number(x.expectedCapacity)>=Number(x.mbcoPercent)&&Number(x.mbcoPercent)>0;return{activityId:x.id,activity:x.name,timing,capacity,feasible:timing&&capacity&&Array.isArray(x.selectedStrategies)&&x.selectedStrategies.length>0&&Boolean(x.strategyRationale&&x.solutionDescription)}});
  const applicableResources = resources.filter((x)=>clean(x.requirement));
  const capitalCost = resources.reduce((n,x)=>n+(Number(x.quantity)||1)*(Number(x.unitCost)||0),0), recurringCost=resources.reduce((n,x)=>n+(Number(x.recurringCost)||0),0);
  const checks=[assessments.length>0,assessments.every((x)=>Array.isArray(x.selectedStrategies)&&x.selectedStrategies.length&&clean(x.strategyRationale)),applicableResources.length>0&&applicableResources.every((x)=>clean(x.owner)),feasibility.length>0&&feasibility.every((x)=>x.feasible),actions.length>0&&actions.every((x)=>clean(x.action)&&clean(x.owner)&&clean(x.dueDate)),assessments.length>0&&feasibility.every((x)=>x.feasible)];
  const completion=Math.round(checks.filter(Boolean).length/checks.length*100);
  if (["review","approve"].includes(intent)&&!checks.every(Boolean)) return {error:"Complete strategy selection, resource ownership, feasibility evidence and implementation actions before submission."};
  if (intent==="approve" && [bia,hazard,outsourced].filter(Boolean).some((x)=>x.status!=="approved")) return {error:"Every linked source record must be approved before Module 8 can be approved."};
  const reviewer=text("reviewer_name"),comment=text("review_comment"); if(intent==="approve"&&!reviewer)return{error:"Record the competent approver."};
  const now=new Date().toISOString(),currentVersion=Number(existing?.version)||1,editingApproved=existing?.status==="approved"&&intent!=="approve",version=editingApproved?currentVersion+1:currentVersion,status=intent==="approve"?"approved":intent==="review"?"ready_for_review":"draft";
  const data={owner_id:user.id,organization_id:org.id,bia_assessment_id:bia.id,hazard_assessment_id:hazard?.id||null,outsourced_assessment_id:outsourced?.id||null,assessment_title:text("assessment_title")||"Business Continuity Strategies & Solutions",source_versions:{bia:sourceVersion(bia),hazard:sourceVersion(hazard),outsourced:sourceVersion(outsourced)},source_snapshot:{bia,hazard,outsourced},strategy_assessments:assessments,resource_requirements:resources,implementation_actions:actions,feasibility_summary:{total:assessments.length,feasible:feasibility.filter(x=>x.feasible).length,gaps:feasibility.filter(x=>!x.feasible),openActions:actions.filter(x=>x.status!=="closed").length,capitalCost,recurringCost,totalCost:capitalCost+recurringCost},methodology:{clause:"ISO 22301:2019 8.3",source:"Modules 5, 6 and 7",engine:"RTO and MBCO alignment + multi-option strategy selection + resource lead time + cost + implementation status"},review_frequency:text("review_frequency")||"Every 6 months",next_review_date:text("next_review_date")||null,completion_percent:completion,status,version,prepared_by:existing?.prepared_by||user.email||"Account owner",reviewed_by:intent==="approve"?reviewer:null,reviewed_at:intent==="approve"?now:null,review_comment:comment||null,approved_by:intent==="approve"?reviewer:null,approved_at:intent==="approve"?now:null,updated_at:now};
  if(editingApproved){const{error}=await s.from("bcp_strategy_assessment_versions").insert({assessment_id:existing.id,organization_id:org.id,owner_id:user.id,version:currentVersion,status:existing.status,snapshot:existing,change_reason:"Approved version superseded"});if(error)return{error:error.message}}
  let savedId=existing?.id,error;if(existing)({error}=await s.from("bcp_strategy_assessments").update(data).eq("id",existing.id).eq("owner_id",user.id));else{const result=await s.from("bcp_strategy_assessments").insert({...data,assessment_reference:`BCP-STR-${new Date().getUTCFullYear()}-${crypto.randomUUID().slice(0,6).toUpperCase()}`}).select("id").single();savedId=result.data?.id;error=result.error}if(error)return{error:error.message};
  if(intent==="approve"){const{error:ve}=await s.from("bcp_strategy_assessment_versions").upsert({assessment_id:savedId,organization_id:org.id,owner_id:user.id,version,status,snapshot:{...data,id:savedId},change_reason:comment||"Controlled approval"},{onConflict:"assessment_id,version"});if(ve)return{error:ve.message}}
  if(intent==="continue")redirect(`/portal/business-continuity/strategies-solutions?id=${savedId}&step=${Math.max(0,Math.min(5,Number(text("next_step"))||0))}`);redirect(`/portal/business-continuity/strategies-solutions?id=${savedId}&step=5`);
}
