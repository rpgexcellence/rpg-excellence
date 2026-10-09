import { createAdminClient } from "./supabase/admin";

const rank = { none:0, view:1, contribute:2, review:3, approve:4, admin:5 };
export const personName = person => [person?.first_name, person?.last_name].filter(Boolean).join(" ").trim() || person?.email || "Unnamed user";

export async function loadAssessmentPeople(organizationId) {
  const admin = createAdminClient();
  const [{data:people=[],error:peopleError},{data:permissions=[],error:permissionError},{data:authorizations=[],error:authorizationError}] = await Promise.all([
    admin.from("organization_people").select("id,first_name,last_name,email,position,department,site,user_id").eq("organization_id",organizationId).eq("account_status","active").order("last_name"),
    admin.from("organization_person_permissions").select("person_id,module_key,access_level,scope_type,scope_values").eq("organization_id",organizationId).in("module_key",["assessments","capa_8d"]),
    admin.from("organization_person_authorizations").select("person_id,function_key,status,standards_scope,expires_at").eq("organization_id",organizationId).eq("status","authorised")
  ]);
  if(peopleError||permissionError||authorizationError) throw new Error(peopleError?.message||permissionError?.message||authorizationError?.message);
  const permissionMap=new Map(),authorizationMap=new Map();
  for(const row of permissions){if(!permissionMap.has(row.person_id))permissionMap.set(row.person_id,{});permissionMap.get(row.person_id)[row.module_key]=row;}
  for(const row of authorizations){if(row.expires_at&&new Date(`${row.expires_at}T23:59:59`)<new Date())continue;if(!authorizationMap.has(row.person_id))authorizationMap.set(row.person_id,new Set());authorizationMap.get(row.person_id).add(row.function_key);}
  return people.map(person=>({...person,name:personName(person),permissions:permissionMap.get(person.id)||{},functions:[...(authorizationMap.get(person.id)||[])],assessmentLevel:permissionMap.get(person.id)?.assessments?.access_level||"none",capaLevel:permissionMap.get(person.id)?.capa_8d?.access_level||"none"}));
}

export const atLeast=(person,moduleKey,level)=>rank[person?.permissions?.[moduleKey]?.access_level||"none"]>=rank[level];
export const authorised=(person,...functions)=>functions.some(key=>person?.functions?.includes(key));
export function requirePerson(people,id,label,{moduleKey="assessments",level="view",functions=[]}={}){
  const person=people.find(row=>row.id===id);
  if(!person)throw new Error(`${label} must be selected from the active Company User list.`);
  if(!atLeast(person,moduleKey,level))throw new Error(`${person.name} does not have the required ${moduleKey.replaceAll("_"," ")} access for ${label.toLowerCase()}.`);
  if(functions.length&&!authorised(person,...functions))throw new Error(`${person.name} does not hold an authorised ${label.toLowerCase()} function.`);
  return person;
}
