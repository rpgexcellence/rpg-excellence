'use server';
import {redirect} from 'next/navigation';
import {revalidatePath} from 'next/cache';
import {companyDocumentContext} from '../../../../lib/company-documents';
export async function saveDocumentSettings(form){
 const {client,organization}=await companyDocumentContext();
 const {error}=await client.rpc('save_company_document_settings',{p_org:organization.id,p_code:String(form.get('company_code')||'').trim().toUpperCase(),p_padding:Number(form.get('padding')),p_powra_prefix:String(form.get('powra_prefix')||'').trim(),p_powra_padding:Number(form.get('powra_padding'))});
 if(error)redirect(`/portal/documents/settings?error=${encodeURIComponent(error.message.slice(0,220))}`);
 revalidatePath('/portal/documents');revalidatePath('/portal/health-safety/powra');revalidatePath('/portal/company/setup');
 redirect('/portal/documents/settings?saved=1');
}
