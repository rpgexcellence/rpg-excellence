"use server";
import {redirect} from "next/navigation";
import {revalidatePath} from "next/cache";
import {requirePlanAccess} from "../../../../../lib/plan-access";
import {requireOrganizationAccess} from "../../../../../lib/organization-access";
import {createAdminClient} from "../../../../../lib/supabase/admin";
import {loadPermitParticipants,resolvePermitParticipants} from "../../../../../lib/permitParticipants";
import {loadPermitCompanyOptions,resolvePermitCompanyLinks} from "../../../../../lib/permitCompanyOptions";
import {COMMON_CONTROLS,COMMON_HAZARDS,PERMIT_CONTROL_RULES,validatePermitSpecificControls} from "../../../../../lib/permitControlRules";

const readJson=(value,fallback)=>{
  try{return JSON.parse(String(value||""))}catch{return fallback}
};

const cleanControlValues=(rule,values,people)=>Object.fromEntries(rule.fields.map(field=>{
  const raw=String(values?.[field.key]??"").trim();
  if(field.type==="person"&&raw&&!people.some(person=>person.id===raw))throw new Error(`${field.label} must be selected from the active company-user list.`);
  if(field.type==="select"&&raw&&!field.options.includes(raw))throw new Error(`Select a valid option for ${field.label}.`);
  if(field.type==="number"&&raw&&(!Number.isFinite(Number(raw))||Number(raw)<0))throw new Error(`${field.label} must be a valid positive value.`);
  return [field.key,field.type==="number"&&raw!==""?Number(raw):raw||null];
}));

export async function createPermit(previousState,formData){
  try {
  const access=await requireOrganizationAccess("risk_management","contribute","/portal/health-safety/permits/new"),{user,organization:organisation}=access;
  await requirePlanAccess(user.id,"professional","Permit to Work");
  const admin=createAdminClient();
  const [options,companyOptions]=await Promise.all([loadPermitParticipants(organisation),loadPermitCompanyOptions(organisation)]);
  const participants = resolvePermitParticipants(options, organisation, formData);
  const companyLinks=resolvePermitCompanyLinks(companyOptions,formData);
  const text=name=>String(formData.get(name)||"").trim();
  const permitType=text("permit_type"),rule=PERMIT_CONTROL_RULES[permitType];
  if(!rule)throw new Error("Select a valid permit type.");
  const hazards=readJson(text("hazards"),null),commonControls=readJson(text("common_controls"),null),specific=readJson(text("permit_specific_controls"),null);
  if(!Array.isArray(hazards)||!Array.isArray(commonControls)||!specific||!Array.isArray(specific.selected)||typeof specific.values!=="object")throw new Error("The permit controls could not be read.");
  if(!hazards.length||hazards.some(value=>!COMMON_HAZARDS.includes(value)))throw new Error("Select at least one valid hazard.");
  const validCommonKeys=COMMON_CONTROLS.map(item=>item.key);
  if(commonControls.some(value=>!validCommonKeys.includes(value)))throw new Error("The common-control selection is invalid.");
  const missingCommon=COMMON_CONTROLS.filter(item=>item.critical&&!commonControls.includes(item.key));
  if(missingCommon.length)throw new Error(`Confirm critical control: ${missingCommon[0].label}.`);
  const validation=validatePermitSpecificControls(permitType,specific.values,specific.selected,hazards);
  if(!validation.valid)throw new Error(`Complete the permit-specific requirements: ${[...validation.missingControls,...validation.missingFields].join(", ")}.`);
  const controlValues=cleanControlValues(rule,specific.values,options.people);
  const precautions=[...commonControls,...specific.selected];
  const validFrom=text("valid_from"),validUntil=text("valid_until");
  if(!text("task_description")||!text("scope_limits")||!text("work_area")||!text("linked_assessment_id")||!text("stop_work_conditions")||!text("emergency_arrangements"))throw new Error("Complete all mandatory permit fields.");
  if(!validFrom||!validUntil||!Number.isFinite(Date.parse(validFrom))||!Number.isFinite(Date.parse(validUntil))||new Date(validUntil)<=new Date(validFrom))throw new Error("The permit expiry must be after its start time.");
  if(text("issuer_declaration")!=="true"||text("receiver_declaration")!=="true")throw new Error("Both permit declarations must be accepted.");
  const {data:assessment,error:assessmentError}=await admin.from("hs_risk_assessments").select("id").eq("id",text("linked_assessment_id")).eq("organization_id",organisation.id).in("status",["approved","communicated"]).maybeSingle();
  if(assessmentError)throw new Error(assessmentError.message);if(!assessment)throw new Error("Select one of your approved or communicated risk assessments.");
  const reference=`PTW-${new Date().getUTCFullYear()}-${crypto.randomUUID().slice(0,6).toUpperCase()}`;
  const {data,error}=await admin.from("hs_permits").insert({
    owner_id:organisation.owner_id,organization_id:organisation.id,permit_reference:reference,permit_type:permitType,
    task_description:text("task_description"),scope_limits:text("scope_limits"),work_area:text("work_area"),...companyLinks,
    linked_assessment_id:text("linked_assessment_id"),valid_from:new Date(validFrom).toISOString(),valid_until:new Date(validUntil).toISOString(),
    hazards,precautions,permit_specific_controls:{selected:specific.selected,values:controlValues},prohibited_work:text("prohibited_work")||null,
    stop_work_conditions:text("stop_work_conditions"),emergency_arrangements:text("emergency_arrangements"),...participants,
    issuer_declaration:true,receiver_declaration:true,status:"draft",version:1
  }).select("id").single();
  if(error)throw new Error(error.message);revalidatePath("/portal/health-safety/permits");redirect(`/portal/health-safety/permits/${data.id}`);
  } catch(error) { if(error?.digest?.startsWith("NEXT_REDIRECT")) throw error; return {error:error.message || "The permit could not be saved."}; }
}

