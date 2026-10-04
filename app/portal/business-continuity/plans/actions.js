"use server";
import crypto from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "../../../../lib/supabase/server";
import { PLAN_SOURCE_TABLES, normalisePlanData, planMissing, planSourceIssues, planSourceVersions, generateBCPPlan, planActivityRows, planList } from "../../../../lib/bcpPlanEngine";
const parse = (fd,key) => { try { return JSON.parse(String(fd.get(key) || "{}")); } catch { return null; } };
export async function saveBCPPlan(_state, fd) {
  const s = await createClient();
  const { data:{user} } = await s.auth.getUser();
  if (!user) redirect("/portal/login?next=/portal/business-continuity/plans");
  const { data:org, error:orgError } = await s.from("organizations").select("id,name").eq("owner_id",user.id).order("created_at").limit(1).maybeSingle();
  if (!org || orgError) return {error:"Create an organisation before saving a plan."};
  const id = String(fd.get("plan_id") || "").slice(0,80), intent = String(fd.get("intent") || "draft");
  if (!["draft","review","approve"].includes(intent)) return {error:"Choose a valid save action."};
  let existing = null;
  if (id) {
    const {data,error} = await s.from("bcp_plans").select("*").eq("id",id).eq("organization_id",org.id).eq("owner_id",user.id).maybeSingle();
    if (error) return {error:error.message};
    if (!data) return {error:"This plan is no longer available."};
    existing = data;
    if (existing.updated_at !== String(fd.get("expected_updated_at") || "")) return {error:"This plan was changed in another session. Reload before saving; your edits have not been saved."};
    if (existing.status === "approved" && intent !== "draft") return {error:"Save an amendment as a draft before requesting review or approval."};
  }
  const raw = parse(fd,"plan_data"), sourceIds = parse(fd,"source_ids"), expectedSources = parse(fd,"expected_sources");
  if (!raw || typeof raw !== "object" || Array.isArray(raw) || !sourceIds || !expectedSources) return {error:"Invalid plan form data."};
  const data = normalisePlanData(raw);
  const specs = Object.entries(PLAN_SOURCE_TABLES);
  const results = await Promise.all(specs.map(([key,table]) => typeof sourceIds[key] === "string" && sourceIds[key] ? s.from(table).select("*").eq("id",sourceIds[key]).eq("organization_id",org.id).eq("owner_id",user.id).neq("status","archived").maybeSingle() : Promise.resolve({data:null,error:null})));
  if (results.some((r) => r.error)) return {error:results.find((r) => r.error).error.message};
  const sources = Object.fromEntries(specs.map(([key],i) => [key,results[i].data]));
  if (!sources.site) return {error:"Select a valid Site Profile before saving."};
  for (const [key] of specs) {
    if (sourceIds[key] && !sources[key]) return {error:"A selected source is missing, archived or inaccessible. Reload and review source links."};
    if (sources[key] && (expectedSources[key]?.id !== sources[key].id || expectedSources[key]?.updatedAt !== sources[key].updated_at || Number(expectedSources[key]?.version) !== Number(sources[key].version || 1))) return {error:"A source changed while you were editing. Reload the page, then use Refresh source content before saving."};
  }
  const conflicts = planSourceIssues(sources).filter((label) => !label.startsWith("Select "));
  if (conflicts.length) return {error:conflicts.join(". ")};
  const {data:people,error:peopleError} = await s.from("organization_people").select("*").eq("organization_id",org.id).not("account_status","in","(suspended,closed)");
  if (peopleError) return {error:peopleError.message};
  const missing = planMissing(data,sources,people || []);
  if (intent !== "draft" && missing.length) return {error:`Complete ${missing.length} outstanding checks before review or approval.`,missing};
  if (intent === "approve" && Object.values(sources).filter(Boolean).some((row) => row.status !== "approved")) return {error:"Approve every linked source record before approving this plan."};
  const status = intent === "approve" ? "approved" : intent === "review" ? "ready_for_review" : "draft";
  const version = (existing?.version || 1) + (existing?.status === "approved" ? 1 : 0), now = new Date().toISOString();
  const reference = existing?.plan_reference || `BCP-${now.slice(0,10).replaceAll("-","")}-${crypto.randomUUID().slice(0,8).toUpperCase()}`;
  const generatedDocument = generateBCPPlan(data,sources,people || [],{organisation:org.name,reference,version,status,generatedAt:now,approvedAt:status === "approved" ? now : "",approvalRecordedBy:status === "approved" ? user.email || user.id : ""});
  // Retain only people used by this self-contained document, not the whole organisation directory.
  const relevantIds = new Set([data.planOwnerPersonId,data.deputyPersonId,data.approverPersonId,...data.participantIds,...planActivityRows(data,sources).flatMap(({activity,local})=>[activity.ownerPersonId,local.ownerPersonId,local.deputyPersonId]),...planList(sources.incident?.response_teams).flatMap((r)=>[r.leadPersonId,r.alternatePersonId]),...planList(sources.incident?.warning_communications).map((r)=>r.ownerPersonId),...planList(sources.incident?.incident_action_plan).map((r)=>r.ownerPersonId),...planList(sources.strategy?.resource_requirements).map((r)=>r.ownerPersonId)]);
  const relevantPeople = (people || []).filter((p) => relevantIds.has(p.id));
  const payload = {organization_id:org.id,site_profile_id:sources.site.id,incident_assessment_id:sources.incident?.id || null,bia_assessment_id:sources.bia?.id || null,plan_reference:reference,plan_title:data.title || "Business Continuity Plan",version,status,plan_data:data,source_ids:Object.fromEntries(specs.map(([key]) => [key,sources[key]?.id || null])),source_versions:planSourceVersions(sources),source_snapshot:{sources,people:relevantPeople.map((p) => ({id:p.id,first_name:p.first_name,last_name:p.last_name,email:p.email,position:p.position,phone:p.phone || p.telephone || ""}))},generated_document:generatedDocument,completion_percent:Math.max(0,100-Math.min(100,missing.length*4)),next_review_date:/^\d{4}-\d{2}-\d{2}$/.test(data.nextReviewDate) ? data.nextReviewDate : null,approved_at:status === "approved" ? now : null};
  const {data:saved,error} = await s.rpc("bcp_save_plan",{p_id:existing?.id || null,p_expected_updated_at:existing?.updated_at || null,p_payload:payload});
  if (error) return {error: error.message.includes("bcp_save_plan") ? "Module 10 database setup is missing or incompatible. Apply the supplied migration, then try again." : error.message};
  revalidatePath("/portal/business-continuity");
  revalidatePath("/portal/business-continuity/plans");
  return {record:saved,message:status === "approved" ? `Version ${version} approved and preserved.` : status === "ready_for_review" ? "Plan saved for review." : "Draft saved successfully."};
}
