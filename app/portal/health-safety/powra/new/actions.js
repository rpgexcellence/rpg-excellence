"use server";
import { POWRA_CHECKS } from "../../../../../lib/powraChecklist";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "../../../../../lib/supabase/server";
import { requirePlanAccess } from "../../../../../lib/plan-access";
import { loadPowraCompanyOptions, resolvePowraCompanySelection } from "../../../../../lib/powraCompanyOptions";
export async function createPowra(previousState, formData){
  let savedId;
  try {

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
  const options = await loadPowraCompanyOptions(organisation.id);
  const { site, person, members, supervisor } = resolvePowraCompanySelection(options, formData);
  const task=text("task"),assessmentDate=text("assessment_date");
  if(task.length < 3 || task.length > 500 || !/^\d{4}-\d{2}-\d{2}$/.test(assessmentDate) || !Number.isFinite(Date.parse(assessmentDate))) throw new Error("Complete the task and a valid date.");
  if (!Array.isArray(prestartChecks) || !Array.isArray(hazards) || prestartChecks.length !== POWRA_CHECKS.length || POWRA_CHECKS.some(question => prestartChecks.filter(row => row?.question === question).length !== 1) || prestartChecks.some(row => !row || !["yes","no","na"].includes(row.answer)) || hazards.some(row => !row || !["low","medium","high"].includes(row.remaining_risk))) throw new Error("The POWRA answers are invalid.");
  const decision = prestartChecks.some(row => row.answer === "no") || hazards.some(row => row.remaining_risk === "high") ? "stop_work" : hazards.some(row => row.remaining_risk === "medium") ? "supervisor_review" : "safe_to_start";
  if(decision!=="safe_to_start"&&!text("decision_reason")) throw new Error("Explain the stop-work or escalation decision.");
  const linkedId=text("linked_assessment_id");
  if (linkedId) {
    const {data: linked, error} = await supabase.from("hs_risk_assessments").select("id").eq("id",linkedId).eq("owner_id",user.id).in("status",["approved","communicated"]).maybeSingle();
    if(error || !linked) throw new Error("Select an approved risk assessment belonging to your workspace.");
  }
  const additionalMembers=text("additional_team_members");
  if (additionalMembers.length > 1000) throw new Error("Additional team members: use up to 1000 characters.");
  const status=decision==="stop_work"?"stopped":decision==="supervisor_review"?"supervisor_review":"open";
  const {data,error}=await supabase.from("hs_powra_assessments").insert({owner_id:user.id,organization_id:organisation.id,task,site_location:site.location_name,site_profile_id:site.id,work_area:text("work_area")||null,completed_by:person.name,completed_by_person_id:person.id,team_member_ids:members.map(row=>row.id),team_members:[...members.map(row=>row.name),additionalMembers].filter(Boolean).join("; ")||null,assessment_date:assessmentDate,linked_assessment_id:linkedId||null,linked_permit_reference:text("linked_permit_reference")||null,prestart_checks:prestartChecks,hazards,additional_controls:hazards.filter(item=>item.control),decision,decision_reason:text("decision_reason")||null,supervisor_name:supervisor?.name||null,end_review:{conditions_changed:text("conditions_changed"),new_hazards:text("new_hazards"),controls_effective:text("controls_effective"),incident:text("incident"),comments:text("review_comments")},status}).select("id").single();
  if(error) throw new Error(error.message);
  revalidatePath("/portal/health-safety/powra");
  revalidatePath("/portal/company/business-profile");
  savedId = data.id;
  } catch (error) { if (error?.digest?.startsWith("NEXT_REDIRECT")) throw error; return {error: error.message || "The POWRA could not be saved."}; }
  redirect(`/portal/health-safety/powra/${savedId}`);
}
