export const LEGACY_DEPARTMENT='__legacy__';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function departmentApplies(department,siteId){return Boolean(department.all_sites||(siteId&&(department.site_ids||[]).includes(siteId)));}
export async function resolveCompanyPersonDepartment(admin,organizationId,form,person=null,siteValues={}) {
 if(!form.has('department_id'))return person?{}:{department_id:null,department:String(form.get('department')||'').trim().slice(0,180)||null};
 const id=String(form.get('department_id')||'');
 if(id===LEGACY_DEPARTMENT){if(!person||person.department_id||!person.department)throw new Error('Select a company department.');return{};}
 if(!id)return {department_id:null,department:null};
 if(!UUID.test(id))throw new Error('Select a valid company department.');
 const {data:d,error}=await admin.from('organization_departments').select('id,name,status,all_sites').eq('id',id).eq('organization_id',organizationId).maybeSingle();
 if(error||!d)throw new Error('Select a department belonging to this company.');
 const siteId=Object.hasOwn(siteValues,'site_id')?siteValues.site_id:person?.site_id;
 const unchanged=person?.department_id===id&&person?.site_id===siteId;
 if(!unchanged){
  if(d.status!=='active')throw new Error('Select an active company department.');
  if(!d.all_sites){const {data:link,error:e}=await admin.from('organization_department_sites').select('department_id').eq('department_id',id).eq('organization_id',organizationId).eq('site_id',siteId||'00000000-0000-0000-0000-000000000000').maybeSingle();if(e||!link)throw new Error('Select a department applicable to this site.');}
 }
 return {department_id:d.id,department:d.name};
}
