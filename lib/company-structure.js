import { createClient } from './supabase/server';
import { companyDocumentRows } from './company-documents';
export async function loadCompanyStructure(organizationId) {
 const client=await createClient();
 const [departments,departmentSites,sites]=await Promise.all([
  companyDocumentRows(client,'organization_departments','id,organization_id,code,name,status,all_sites',q=>q.eq('organization_id',organizationId)),
  companyDocumentRows(client,'organization_department_sites','department_id,site_id',q=>q.eq('organization_id',organizationId),['department_id','site_id']),
  companyDocumentRows(client,'organization_sites','id,site_reference,site_name,status',q=>q.eq('organization_id',organizationId)),
 ]);
 return {sites,departments:departments.map(d=>({...d,site_ids:departmentSites.filter(l=>l.department_id===d.id).map(l=>l.site_id)}))};
}
export async function loadDocumentFormOptions(context) {
 const {client,organization,user}=context;
 const [structure,people,classifications,{data:numbering,error:n},{data:settingsAdmin,error:a}]=await Promise.all([
  loadCompanyStructure(organization.id),
  // Directory choices expose company users for explicit assignments, not their module records.
  companyDocumentRows((await import('./supabase/admin')).createAdminClient(),'organization_people','id,user_id,first_name,last_name,email,account_status,account_type,site_id,department_id',q=>q.eq('organization_id',organization.id)),
  companyDocumentRows(client,'document_classifications','key,label,kind,active,position',q=>q.eq('active',true),['kind','position','key']),
  client.from('company_document_numbering').select('*').eq('organization_id',organization.id).maybeSingle(),
  client.rpc('company_structure_administrator',{p_org:organization.id}),
 ]);
 if(n||a)throw new Error('Document settings could not be loaded.');
 return {...structure,people,classifications,numbering:numbering||{company_code:'DOC',padding:5},settingsAdmin,me:people.find(p=>p.user_id===user.id&&p.account_status==='active')||null};
}
