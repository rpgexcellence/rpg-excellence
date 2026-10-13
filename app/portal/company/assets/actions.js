"use server";

import {randomUUID} from "node:crypto";
import {revalidatePath} from "next/cache";
import {requireOrganizationAccess} from "../../../../lib/organization-access";
import {createAdminClient} from "../../../../lib/supabase/admin";
import {rcaAdministrationLocations} from "../../../../lib/rcaCompanyLinks";
import {getUserSubscription,hasPlanAccess} from "../../../../lib/subscription";

const clean=(value,max=2000)=>String(value||"").trim().slice(0,max);
const ASSET_TYPES=new Set(["plant","equipment","room_area","electrical_system","process_system","vehicle","other"]);
const STATUSES=new Set(["active","out_of_service","retired"]);
const CRITICALITIES=new Set(["low","medium","high","critical"]);
const FREQUENCY_UNITS=new Set(["days","weeks","months","years"]);
const MAINTENANCE_TYPES=new Set(["planned","inspection","calibration","statutory","repair","breakdown","other"]);

async function assetContext(){
  const access=await requireOrganizationAccess("people_access","admin","/portal/company/assets");
  const subscription=await getUserSubscription(access.user.id);
  if(!hasPlanAccess(subscription,"professional"))throw new Error("Asset Management requires the Professional plan.");
  return {...access,admin:createAdminClient()};
}

function addFrequency(dateValue,value,unit){
  const date=new Date(`${dateValue}T12:00:00Z`);
  if(unit==="days")date.setUTCDate(date.getUTCDate()+value);
  if(unit==="weeks")date.setUTCDate(date.getUTCDate()+(value*7));
  if(unit==="months")date.setUTCMonth(date.getUTCMonth()+value);
  if(unit==="years")date.setUTCFullYear(date.getUTCFullYear()+value);
  return date.toISOString().slice(0,10);
}

async function resolveOwner(admin,organizationId,personId){
  if(!personId)throw new Error("Select an accountable asset owner from the active Company User list.");
  const {data,error}=await admin.from("organization_people").select("id,first_name,last_name,email,position")
    .eq("id",personId).eq("organization_id",organizationId).eq("account_status","active").maybeSingle();
  if(error)throw new Error(error.message);
  if(!data)throw new Error("The selected asset owner is not an active Company User.");
  return data;
}

export async function saveCompanyAsset(_previousState,formData){
  try{
    const {organization,admin}=await assetContext();
    const text=(name,max)=>clean(formData.get(name),max);
    const id=text("id",80),assetReference=text("asset_reference",100),assetName=text("asset_name",180);
    const assetType=text("asset_type",40),locationId=text("site_location_id",180),ownerPersonId=text("asset_owner_person_id",80);
    const operationalStatus=text("operational_status",30)||"active",criticality=text("criticality",20)||"medium";
    const ppmRequired=text("ppm_required",10)==="true";
    const frequencyValue=Number(text("ppm_frequency_value",10)),frequencyUnit=text("ppm_frequency_unit",20);
    const lastMaintenanceDate=text("last_maintenance_date",10)||null,submittedNextDate=text("next_maintenance_date",10)||null;
    if(!assetName)return {error:"Enter the asset name."};
    if(id&&!assetReference)return {error:"The controlled asset reference cannot be removed."};
    if(!ASSET_TYPES.has(assetType))return {error:"Select a valid asset type."};
    if(!STATUSES.has(operationalStatus))return {error:"Select a valid operational status."};
    if(!CRITICALITIES.has(criticality))return {error:"Select a valid asset criticality."};
    const location=rcaAdministrationLocations(organization).find(item=>item.id===locationId);
    if(!location)return {error:"Select a current location from Administration → Business Profile."};
    await resolveOwner(admin,organization.id,ownerPersonId);
    let nextMaintenanceDate=null;
    if(ppmRequired){
      if(!Number.isInteger(frequencyValue)||frequencyValue<1||!FREQUENCY_UNITS.has(frequencyUnit))return {error:"Set the PPM frequency using a positive number and days, weeks, months or years."};
      const base=lastMaintenanceDate||new Date().toISOString().slice(0,10);
      nextMaintenanceDate=submittedNextDate||addFrequency(base,frequencyValue,frequencyUnit);
    }
    const values={
      organization_id:organization.id,owner_id:organization.owner_id,
      asset_reference:assetReference||null,asset_name:assetName,asset_type:assetType,
      site_location_id:location.id,site_location_label:location.label,
      area_department:text("area_department",180)||null,description:text("description",2000)||null,
      manufacturer:text("manufacturer",180)||null,model:text("model",180)||null,serial_number:text("serial_number",180)||null,
      asset_owner_person_id:ownerPersonId,criticality,operational_status:operationalStatus,
      ppm_required:ppmRequired,ppm_frequency_value:ppmRequired?frequencyValue:null,ppm_frequency_unit:ppmRequired?frequencyUnit:null,
      last_maintenance_date:lastMaintenanceDate,next_maintenance_date:nextMaintenanceDate,
      maintenance_provider:text("maintenance_provider",250)||null,maintenance_notes:text("maintenance_notes",2000)||null,
      change_control_required:text("change_control_required",10)!=="false",updated_at:new Date().toISOString(),
    };
    const query=id
      ?admin.from("organization_assets").update(values).eq("id",id).eq("organization_id",organization.id)
      :admin.from("organization_assets").insert({...values,created_at:new Date().toISOString()});
    const {error}=await query;
    if(error?.code==="23505")return {error:"That asset reference already exists in this company."};
    if(error)return {error:error.message};
    revalidatePath("/portal/company/assets");revalidatePath("/portal/health-safety/permits/new");revalidatePath("/portal/health-safety/moc/new");
    return {success:id?"Asset details, ownership and PPM controls updated.":"Asset added with a unique controlled reference.",error:""};
  }catch(error){return {error:error?.message||"The asset could not be saved."};}
}

export async function recordAssetMaintenance(_previousState,formData){
  try{
    const {user,organization,admin}=await assetContext();
    const text=(name,max)=>clean(formData.get(name),max),assetId=text("asset_id",80);
    const maintenanceType=text("maintenance_type",30),scheduledDate=text("scheduled_date",10),completedDate=text("completed_date",10)||null;
    if(!assetId||!MAINTENANCE_TYPES.has(maintenanceType)||!scheduledDate)return {error:"Select the asset, maintenance type and scheduled date."};
    const {data:asset,error:assetError}=await admin.from("organization_assets").select("*").eq("id",assetId).eq("organization_id",organization.id).maybeSingle();
    if(assetError)throw new Error(assetError.message);if(!asset)return {error:"The selected company asset was not found."};
    const completed=Boolean(completedDate),reference=`PPM-${new Date().getUTCFullYear()}-${randomUUID().slice(0,6).toUpperCase()}`;
    const {error}=await admin.from("organization_asset_maintenance").insert({
      organization_id:organization.id,owner_id:organization.owner_id,asset_id:assetId,maintenance_reference:reference,
      maintenance_type:maintenanceType,scheduled_date:scheduledDate,completed_date:completedDate,
      performed_by:text("performed_by",250)||null,work_completed:text("work_completed",2000)||null,
      evidence_reference:text("evidence_reference",500)||null,status:completed?"completed":"planned",created_by:user.id,
    });
    if(error)throw new Error(error.message);
    if(completed&&asset.ppm_required&&asset.ppm_frequency_value&&asset.ppm_frequency_unit){
      const next=addFrequency(completedDate,asset.ppm_frequency_value,asset.ppm_frequency_unit);
      const {error:updateError}=await admin.from("organization_assets").update({last_maintenance_date:completedDate,next_maintenance_date:next,updated_at:new Date().toISOString()}).eq("id",assetId).eq("organization_id",organization.id);
      if(updateError)throw new Error(updateError.message);
    }
    revalidatePath("/portal/company/assets");
    return {success:completed?`Maintenance completed. Next PPM date recalculated. Reference ${reference}.`:`Maintenance planned. Reference ${reference}.`,error:""};
  }catch(error){return {error:error?.message||"The maintenance record could not be saved."};}
}

export async function changeCompanyAssetStatus(formData){
  const {organization,admin}=await assetContext();
  const id=clean(formData.get("id"),80),status=clean(formData.get("status"),30);
  if(!id||!STATUSES.has(status))throw new Error("Select a valid asset and status.");
  const {error}=await admin.from("organization_assets").update({operational_status:status,updated_at:new Date().toISOString()}).eq("id",id).eq("organization_id",organization.id);
  if(error)throw new Error(error.message);
  revalidatePath("/portal/company/assets");revalidatePath("/portal/health-safety/permits/new");
}
