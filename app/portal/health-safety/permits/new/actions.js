"use server";
import {redirect} from "next/navigation";
import {revalidatePath} from "next/cache";
import {createClient} from "../../../../../lib/supabase/server";
import {requirePlanAccess} from "../../../../../lib/plan-access";
import {loadPermitParticipants,resolvePermitParticipants} from "../../../../../lib/permitParticipants";

export async function createPermit(previousState,formData){
  try {
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)redirect("/portal/login?next=/portal/health-safety/permits/new");
  await requirePlanAccess(user.id,"professional","Permit to Work");
  const {data:organisation,error:orgError}=await supabase.from("organizations").select("id,owner_id,name").eq("owner_id",user.id).order("created_at").limit(1).maybeSingle();
  if(orgError)throw new Error(orgError.message);if(!organisation)throw new Error("Create an organisation before creating a permit.");
  const options = await loadPermitParticipants(organisation);
  const participants = resolvePermitParticipants(options, organisation, formData);
  const text=name=>String(formData.get(name)||"").trim();let hazards=[],precautions=[];
  try{hazards=JSON.parse(text("hazards")||"[]");precautions=JSON.parse(text("precautions")||"[]");}catch{throw new Error("The permit controls could not be read.");}
  const validFrom=text("valid_from"),validUntil=text("valid_until");
  if(!text("task_description")||!text("site_location")||!text("linked_assessment_id")||!text("emergency_arrangements"))throw new Error("Complete all mandatory permit fields.");
  if(!Array.isArray(hazards)||!Array.isArray(precautions)||!hazards.length||precautions.length<3)throw new Error("Select a hazard and verify at least three precautions.");
  if(!validFrom||!validUntil||!Number.isFinite(Date.parse(validFrom))||!Number.isFinite(Date.parse(validUntil))||new Date(validUntil)<=new Date(validFrom))throw new Error("The permit expiry must be after its start time.");
  if(text("issuer_declaration")!=="true"||text("receiver_declaration")!=="true")throw new Error("Both permit declarations must be accepted.");
  const {data:assessment,error:assessmentError}=await supabase.from("hs_risk_assessments").select("id").eq("id",text("linked_assessment_id")).eq("owner_id",user.id).in("status",["approved","communicated"]).maybeSingle();
  if(assessmentError)throw new Error(assessmentError.message);if(!assessment)throw new Error("Select one of your approved or communicated risk assessments.");
  const reference=`PTW-${new Date().getUTCFullYear()}-${crypto.randomUUID().slice(0,6).toUpperCase()}`;
  const {data,error}=await supabase.from("hs_permits").insert({owner_id:user.id,organization_id:organisation.id,permit_reference:reference,permit_type:text("permit_type"),task_description:text("task_description"),site_location:text("site_location"),work_area:text("work_area")||null,equipment_asset:text("equipment_asset")||null,contractor_company:text("contractor_company")||null,linked_assessment_id:text("linked_assessment_id"),valid_from:new Date(validFrom).toISOString(),valid_until:new Date(validUntil).toISOString(),hazards,precautions,isolations:text("isolations")||null,emergency_arrangements:text("emergency_arrangements"),...participants,issuer_declaration:true,receiver_declaration:true,status:"draft"}).select("id").single();
  if(error)throw new Error(error.message);revalidatePath("/portal/health-safety/permits");redirect(`/portal/health-safety/permits/${data.id}`);
  } catch(error) { if(error?.digest?.startsWith("NEXT_REDIRECT")) throw error; return {error:error.message || "The permit could not be saved."}; }
}
