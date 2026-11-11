'use server';
import {redirect} from 'next/navigation';
import {revalidatePath} from 'next/cache';
import {companyDocumentContext} from '../../../../lib/company-documents';
export async function saveDepartment(form){
 const {client,organization}=await companyDocumentContext();
 const sites=form.getAll('sites').map(String);
 const {error}=await client.rpc('save_company_department',{p_org:organization.id,p_id:String(form.get('department_id')||'')||null,p_code:String(form.get('code')||'').trim(),p_name:String(form.get('name')||'').trim(),p_all_sites:form.get('all_sites')==='on',p_sites:sites,p_status:String(form.get('status')||'active')});
 if(error)redirect(`/portal/company/setup?section=departments&error=${encodeURIComponent(error.message.slice(0,220))}`);
 revalidatePath('/portal/company/setup');revalidatePath('/portal/company/people');revalidatePath('/portal/documents');
 redirect('/portal/company/setup?section=departments&saved=1');
}
