"use server";
import {redirect} from "next/navigation";
import {revalidatePath} from "next/cache";
import {requirePlanAccess} from "../../../../../lib/plan-access";
import {requireOrganizationAccess} from "../../../../../lib/organization-access";
import {createAdminClient} from "../../../../../lib/supabase/admin";
import {loadPermitParticipants,resolvePermitParticipants} from "../../../../../lib/permitParticipants";
import {loadPermitCompanyOptions,resolvePermitCompanyLinks} from "../../../../../lib/permitCompanyOptions";
import {COMMON_CONTROLS,COMMON_HAZARDS,PERMIT_CONTROL_RULES} from "../../../../../lib/permitControlRules";

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
  const participants = resolvePermitParticipants(options, organisation, formData, {draft:true});
  const companyLinks=resolvePermitCompanyLinks(companyOptions,formData,{draft:true});
  const text=name=>String(formData.get(name)||"").trim();
  const permitType=text("permit_type"),rule=PERMIT_CONTROL_RULES[permitType];
  if(!rule)throw new Error("Select a valid permit type.");
  const hazards=readJson(text("hazards"),null),commonControls=readJson(text("common_controls"),null),specific=readJson(text("permit_specific_controls"),null);
  if(!Array.isArray(hazards)||!Array.isArray(commonControls)||!specific||!Array.isArray(specific.selected)||typeof specific.values!=="object")throw new Error("The permit controls could not be read.");
  if(hazards.some(value=>!COMMON_HAZARDS.includes(value)))throw new Error("Select at least one valid hazard.");
  const validCommonKeys=COMMON_CONTROLS.map(item=>item.key);
  if(commonControls.some(value=>!validCommonKeys.includes(value)))throw new Error("The common-control selection is invalid.");

  if(specific.selected.some(key=>!rule.controls.some(control=>control.key===key)))throw new Error("The permit-specific control selection is invalid.");

  const controlValues=cleanControlValues(rule,specific.values,options.people);
  const precautions=[...commonControls,...specific.selected];
  const validFrom=text("valid_from"),validUntil=text("valid_until");
  if (validFrom && !Number.isFinite(Date.parse(validFrom)) || validUntil && !Number.isFinite(Date.parse(validUntil))) throw new Error("Enter valid permit dates, or leave them blank in the draft.");
  if(text("linked_assessment_id")) {
    const {data:assessment,error:assessmentError}=await admin.from("hs_risk_assessments").select("id").eq("id",text("linked_assessment_id")).eq("organization_id",organisation.id).in("status",["approved","communicated"]).maybeSingle();
    if(assessmentError)throw new Error(assessmentError.message);if(!assessment)throw new Error("Select one of your approved or communicated risk assessments.");
  }
  const permitId=text("permit_id");
  let existing=null;
  if(permitId){
    const {data,error}=await admin.from("hs_permits").select("id,status,updated_at").eq("id",permitId).eq("organization_id",organisation.id).maybeSingle();
    if(error || !data || data.status!=="draft")throw new Error("Only an accessible draft permit can be edited.");
    if(data.updated_at!==text("expected_updated_at"))throw new Error("This draft changed. Reload before saving again.");
    existing=data;
  }
  const reference=`PTW-${new Date().getUTCFullYear()}-${crypto.randomUUID().slice(0,6).toUpperCase()}`;
  const values={
    owner_id:organisation.owner_id,organization_id:organisation.id,permit_type:permitType,
    task_description:text("task_description"),scope_limits:text("scope_limits"),work_area:text("work_area"),...companyLinks,
    linked_assessment_id:text("linked_assessment_id")||null,valid_from:validFrom?new Date(validFrom).toISOString():null,valid_until:validUntil?new Date(validUntil).toISOString():null,
    hazards,precautions,permit_specific_controls:{selected:specific.selected,values:controlValues},prohibited_work:text("prohibited_work")||null,
    stop_work_conditions:text("stop_work_conditions"),emergency_arrangements:text("emergency_arrangements"),...participants,
    issuer_declaration:text("issuer_declaration")==="true",receiver_declaration:text("receiver_declaration")==="true",status:"draft",
    draft_form_data:Object.fromEntries([...formData.entries()].filter(([key,value])=>typeof value==="string"&&!['permit_id','expected_updated_at'].includes(key))),updated_at:new Date().toISOString()
  };
  const result=existing
    ? await admin.from("hs_permits").update(values).eq("id",existing.id).eq("organization_id",organisation.id).eq("status","draft").eq("updated_at",existing.updated_at).select("id").maybeSingle()
    : await admin.from("hs_permits").insert({...values,permit_reference:reference,version:1}).select("id").single();
  const {data,error}=result;
  if(!error && !data)throw new Error("This draft changed. Reload before saving again.");
  if(error)throw new Error(error.message);revalidatePath("/portal/health-safety/permits");redirect(`/portal/health-safety/permits/${data.id}`);
  } catch(error) { if(error?.digest?.startsWith("NEXT_REDIRECT")) throw error; return {error:error.message || "The permit could not be saved."}; }
}

