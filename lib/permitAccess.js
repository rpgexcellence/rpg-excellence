import {createAdminClient} from "./supabase/admin";

const rank={none:0,view:1,contribute:2,review:3,approve:4,admin:5};

export async function getPermitAccess(userId,permitId){
  if(!userId||!permitId)return {allowed:false,level:"none",roles:[],person:null,permit:null};
  const admin=createAdminClient();
  const {data:permit,error}=await admin.from("hs_permits").select("*").eq("id",permitId).maybeSingle();
  if(error)throw new Error(error.message);
  if(!permit)return {allowed:false,level:"none",roles:[],person:null,permit:null};

  const {data:organization,error:organizationError}=await admin.from("organizations").select("id,owner_id,name").eq("id",permit.organization_id).maybeSingle();
  if(organizationError)throw new Error(organizationError.message);
  const owner=permit.owner_id===userId||organization?.owner_id===userId;

  const {data:person,error:personError}=await admin.from("organization_people").select("id,first_name,last_name,email,position,account_status").eq("organization_id",permit.organization_id).eq("user_id",userId).eq("account_status","active").maybeSingle();
  if(personError)throw new Error(personError.message);

  const [permissionsResult,authorizationsResult]=person?await Promise.all([
    admin.from("organization_person_permissions").select("module_key,access_level").eq("organization_id",permit.organization_id).eq("person_id",person.id).in("module_key",["risk_management","people_access"]),
    admin.from("organization_person_authorizations").select("function_key,status,expires_at").eq("organization_id",permit.organization_id).eq("person_id",person.id).eq("status","authorised"),
  ]):[{data:[],error:null},{data:[],error:null}];
  if(permissionsResult.error)throw new Error(permissionsResult.error.message);
  if(authorizationsResult.error)throw new Error(authorizationsResult.error.message);

  const today=new Date().toISOString().slice(0,10);
  const authorizations=(authorizationsResult.data||[]).filter(item=>!item.expires_at||item.expires_at.slice(0,10)>=today);
  const permissionLevel=(permissionsResult.data||[]).reduce((highest,item)=>rank[item.access_level]>rank[highest]?item.access_level:highest,"none");
  const companyAdministrator=authorizations.some(item=>item.function_key==="company_administrator")||(permissionsResult.data||[]).some(item=>item.module_key==="people_access"&&item.access_level==="admin");
  const roles=[];
  if(owner)roles.push("owner");
  if(companyAdministrator)roles.push("company_administrator");
  if(person?.id===permit.issuer_person_id)roles.push("issuer");
  if(person?.id===permit.receiver_person_id)roles.push("receiver");
  for(const item of authorizations)roles.push(item.function_key);
  const level=owner||companyAdministrator?"admin":permissionLevel;
  return {allowed:owner||companyAdministrator||rank[level]>=rank.view||roles.includes("issuer")||roles.includes("receiver"),level,roles:[...new Set(roles)],person,permit,organization,admin};
}

export async function requirePermitAccess(userId,permitId,minimumLevel="view"){
  const access=await getPermitAccess(userId,permitId);
  if(!access.allowed||rank[access.level]<rank[minimumLevel]&&!access.roles.includes("issuer")&&!access.roles.includes("receiver"))throw new Error("You do not have permission to access this permit.");
  return access;
}

export async function requirePermitRole(userId,permitId,allowedRoles=[]){
  const access=await requirePermitAccess(userId,permitId,"view");
  if(!access.roles.some(role=>allowedRoles.includes(role)))throw new Error(`This action requires: ${allowedRoles.join(" or ").replaceAll("_"," ")}.`);
  return access;
}

export function mayEditPermit(access){
  return rank[access?.level]>=rank.contribute||access?.roles?.includes("issuer")||access?.roles?.includes("receiver");
}

export function mayVerifyPermit(access){
  return rank[access?.level]>=rank.review||access?.roles?.includes("issuer")||access?.roles?.includes("permit_verifier");
}

export function mayIssuePermit(access){
  return rank[access?.level]>=rank.approve||access?.roles?.includes("issuer")||access?.roles?.includes("permit_authoriser");
}

export function mayReceivePermit(access){
  return access?.roles?.includes("receiver")||rank[access?.level]>=rank.admin;
}

export function mayAcceptHandback(access){
  return rank[access?.level]>=rank.approve||access?.roles?.includes("issuer")||access?.roles?.includes("operations_authority");
}
