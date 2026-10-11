"use server";

import {revalidatePath} from "next/cache";
import {requireOrganizationAccess} from "../../../../lib/organization-access";
import {createAdminClient} from "../../../../lib/supabase/admin";
import {rcaAdministrationLocations} from "../../../../lib/rcaCompanyLinks";

const clean=(value,max=250)=>String(value||"").trim().slice(0,max);
const ASSET_TYPES=new Set(["plant","equipment","room_area","electrical_system","process_system","vehicle","other"]);
const STATUSES=new Set(["active","out_of_service","retired"]);

async function assetContext(){
  const access=await requireOrganizationAccess("people_access","admin","/portal/company/assets");
  return {...access,admin:createAdminClient()};
}

export async function saveCompanyAsset(_previousState,formData){
  try{
    const {user,organization,admin}=await assetContext();
    const id=clean(formData.get("id"),80);
    const assetReference=clean(formData.get("asset_reference"),100);
    const assetName=clean(formData.get("asset_name"),180);
    const assetType=clean(formData.get("asset_type"),40);
    const locationId=clean(formData.get("site_location_id"),180);
    const areaDepartment=clean(formData.get("area_department"),180);
    const description=clean(formData.get("description"),2000);
    const operationalStatus=clean(formData.get("operational_status"),30)||"active";

    if(!assetReference||!assetName)return {error:"Enter the asset reference and asset name."};
    if(!ASSET_TYPES.has(assetType))return {error:"Select a valid asset type."};
    if(!STATUSES.has(operationalStatus))return {error:"Select a valid operational status."};

    const location=rcaAdministrationLocations(organization).find(item=>item.id===locationId);
    if(!location)return {error:"Select a current location from Administration → Business Profile."};

    const values={
      organization_id:organization.id,
      owner_id:organization.owner_id,
      asset_reference:assetReference,
      asset_name:assetName,
      asset_type:assetType,
      site_location_id:location.id,
      site_location_label:location.label,
      area_department:areaDepartment||null,
      description:description||null,
      operational_status:operationalStatus,
      updated_at:new Date().toISOString(),
    };

    let query=id
      ?admin.from("organization_assets").update(values).eq("id",id).eq("organization_id",organization.id)
      :admin.from("organization_assets").insert({...values,created_at:new Date().toISOString()});
    const {error}=await query;
    if(error?.code==="23505")return {error:"That asset reference already exists in this company."};
    if(error)return {error:error.message};

    revalidatePath("/portal/company/assets");
    revalidatePath("/portal/health-safety/permits/new");
    return {success:id?"Asset updated.":"Asset added to the company register.",error:""};
  }catch(error){
    return {error:error?.message||"The asset could not be saved."};
  }
}

export async function changeCompanyAssetStatus(formData){
  const {organization,admin}=await assetContext();
  const id=clean(formData.get("id"),80),status=clean(formData.get("status"),30);
  if(!id||!STATUSES.has(status))throw new Error("Select a valid asset and status.");
  const {error}=await admin.from("organization_assets")
    .update({operational_status:status,updated_at:new Date().toISOString()})
    .eq("id",id).eq("organization_id",organization.id);
  if(error)throw new Error(error.message);
  revalidatePath("/portal/company/assets");
  revalidatePath("/portal/health-safety/permits/new");
}
