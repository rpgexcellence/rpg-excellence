'use server';
import { randomUUID, createHash } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createAdminClient } from '../../../lib/supabase/admin';
import { companyDocumentContext, COMPANY_DOCUMENT_BUCKET } from '../../../lib/company-documents';
const text=(f,k)=>String(f.get(k)||'').trim();
const safeName=name=>String(name).replace(/[^a-zA-Z0-9._-]/g,'_').slice(-160)||'document';
const allowedExtensions=new Set(['pdf','doc','docx','xls','xlsx','ppt','pptx','txt','csv','png','jpg','jpeg']);
export async function documentCommand(form) {
  const {client,organization}=await companyDocumentContext();
  const command=text(form,'command'),id=text(form,'document_id')||null;
  let payload={},uploadedPath=null;
  if(['create','revise'].includes(command)) for(const k of ['document_number','title','revision','document_type','standard','description','change_reason','change_impact']) payload[k]=text(form,k);
  if(command==='save') {
    const {data:d,error}=await client.from('company_documents').select('id,status').eq('id',id).eq('organization_id',organization.id).maybeSingle();
    if(error||!d||d.status!=='draft') throw new Error('The draft is unavailable.');
    for(const k of ['title','document_type','standard','description','owner_person_id','change_reason','change_impact','distribution','due_date','review_date']) payload[k]=text(form,k);
    payload.reviews=[...form.getAll('verifiers').map(person_id=>({person_id,role:'verifier'})),...form.getAll('approvers').map(person_id=>({person_id,role:'approver'}))];
    payload.recipients=form.getAll('recipients');
    const file=form.get('file');
    if(file?.size) {
      if(file.size>3*1024*1024 || !allowedExtensions.has(file.name.split('.').pop().toLowerCase())) throw new Error('Choose a supported document, spreadsheet, presentation or image up to 3 MB.');
      // Check edit authority before using privileged storage. SQL rechecks it atomically at save.
      const {data:full}=await client.from('company_documents').select('author_user_id,owner_person_id').eq('id',id).single();
      const {data:{user}}=await client.auth.getUser();
      const [{data:controller},{data:owner}]=await Promise.all([
        client.rpc('company_document_controller',{p_org:organization.id}),
        client.from('organization_people').select('user_id').eq('id',full?.owner_person_id).eq('organization_id',organization.id).maybeSingle(),
      ]);
      if(!user || !(controller||full?.author_user_id===user.id||owner?.user_id===user.id)) throw new Error('You cannot edit this draft.');
      const bytes=Buffer.from(await file.arrayBuffer());
      uploadedPath=`${organization.id}/${id}/${randomUUID()}/${safeName(file.name)}`;
      const {error:uploadError}=await createAdminClient().storage.from(COMPANY_DOCUMENT_BUCKET).upload(uploadedPath,bytes,{upsert:false,contentType:'application/octet-stream'});
      if(uploadError) throw new Error('Document upload failed. Please try again.');
      payload={...payload,file_path:uploadedPath,file_name:safeName(file.name),file_sha256:createHash('sha256').update(bytes).digest('hex')};
    }
  }
  if(['accept','confirm','changes_required','withdraw','recall'].includes(command)) payload={role:text(form,'role'),comments:text(form,'comments')};
  const {data:documentId,error}=await client.rpc('company_document_command',{p_org:organization.id,p_id:id,p_command:command,p_data:payload});
  if(error) {
    if(uploadedPath) await createAdminClient().storage.from(COMPANY_DOCUMENT_BUCKET).remove([uploadedPath]);
    redirect(`/portal/documents${id?`/${id}`:''}?error=${encodeURIComponent(error.message.slice(0,240))}`);
  }
  revalidatePath('/portal/documents');revalidatePath('/portal/tasks');revalidatePath('/portal');
  redirect(`/portal/documents/${documentId}?saved=${encodeURIComponent(command)}`);
}

// Shared creation and editing path: reviewer/distribution controls are available from the first draft.
export async function saveDocumentDraft(_state,form) {
 let uploadedPath=null,createdUpload=false;
 try {
  const {client,organization,user}=await companyDocumentContext();
  const {documentDraftValues}=await import('../../../lib/document-form.mjs');
  const payload=documentDraftValues(form);
  const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const id=text(form,'document_id')||null,draftId=text(form,'draft_id'),requestId=text(form,'request_id');
  if(!UUID.test(draftId)||!UUID.test(requestId)||(id&&!UUID.test(id)))throw new Error('Reload the document form before saving.');
  if(id){
   const {data:d,error}=await client.from('company_documents').select('id,status,author_user_id,owner_person_id').eq('id',id).eq('organization_id',organization.id).maybeSingle();
   if(error||!d||d.status!=='draft')throw new Error('This draft is unavailable or has already been submitted.');
   const [{data:controller},{data:owner}]=await Promise.all([client.rpc('company_document_controller',{p_org:organization.id}),client.from('organization_people').select('user_id').eq('id',d.owner_person_id).eq('organization_id',organization.id).maybeSingle()]);
   if(!(controller||d.author_user_id===user.id||owner?.user_id===user.id))throw new Error('You cannot edit this draft.');
  }else payload.draft_id=draftId;
  const file=form.get('file');
  if(file?.size){
   if(file.size>3*1024*1024||!allowedExtensions.has(file.name.split('.').pop().toLowerCase()))throw new Error('Choose a supported file up to 3 MB.');
   const bytes=Buffer.from(await file.arrayBuffer()),hash=createHash('sha256').update(bytes).digest('hex');
   uploadedPath=`${organization.id}/${id||draftId}/${requestId}_${hash}/${safeName(file.name)}`;
   const {error:e}=await createAdminClient().storage.from(COMPANY_DOCUMENT_BUCKET).upload(uploadedPath,bytes,{upsert:false,contentType:'application/octet-stream'});
   if(e&&!(String(e.statusCode)==='409'||e.error==='Duplicate'||/already exists|duplicate/i.test(e.message||'')))throw new Error('Document upload failed. Please try again.');
   createdUpload=!e;Object.assign(payload,{file_path:uploadedPath,file_name:safeName(file.name),file_sha256:hash});
  }
  const submit=text(form,'intent')==='submit';
  const {data:documentId,error}=await client.rpc('save_company_document_draft',{p_org:organization.id,p_id:id,p_request:requestId,p_submit:submit,p_data:payload});
  if(error)throw new Error(error.message);
  revalidatePath('/portal/documents');revalidatePath('/portal/tasks');revalidatePath('/portal');
  redirect(`/portal/documents/${documentId}?saved=${submit?'submitted_for_review':'draft_saved'}`);
 }catch(error){
  if(error?.digest?.startsWith('NEXT_REDIRECT'))throw error;
  if(uploadedPath&&createdUpload)await createAdminClient().storage.from(COMPANY_DOCUMENT_BUCKET).remove([uploadedPath]);
  return {error:error.message?.slice(0,300)||'The document could not be saved.'};
 }
}
