import { createClient } from './supabase/server';
import { createAdminClient } from './supabase/admin';
import { cookies } from 'next/headers';
import { RECOVERY_COMPANY_ID, RECOVERY_EMAILS } from './rpg-document-recovery.mjs';
import { requireOrganizationAccess } from './organization-access';
export const COMPANY_DOCUMENT_BUCKET='company-controlled-documents';
export async function companyDocumentContext() {
  let access=await requireOrganizationAccess(null,'view','/portal/documents');
  const client=await createClient();
  // Only the two protected recovery accounts may opt into the verified target.
  // Existing membership is rechecked on every request; the cookie grants no access.
  const preferred=(await cookies()).get('rpg_document_recovery_company')?.value;
  if(preferred===RECOVERY_COMPANY_ID && access.organization.id!==preferred
    && RECOVERY_EMAILS.includes(String(access.user?.email||'').toLowerCase())) {
    const {data:member,error:membershipError}=await client.rpc('company_document_member',{p_org:preferred});
    if(membershipError||!member)throw new Error('Active access to the recovered company is required.');
    const admin=createAdminClient();
    const [{data:organization,error:organizationError},{data:person,error:personError}]=await Promise.all([
      admin.from('organizations').select('*').eq('id',preferred).single(),
      admin.from('organization_people').select('*').eq('organization_id',preferred).eq('user_id',access.user.id).eq('account_status','active').eq('account_type','system').order('created_at').limit(1).maybeSingle(),
    ]);
    if(organizationError||personError||organization?.name!=='RPG Excellence v1')throw new Error('Recovered company context could not be loaded.');
    access={...access,organization,person,isOwner:organization.owner_id===access.user.id,
      level:organization.owner_id===access.user.id?'owner':'view',permissions:[],functions:[],isCompanyAdministrator:false};
  }
  const {data:allowed,error}=await client.rpc('company_document_member',{p_org:access.organization.id});
  if(error || !allowed) throw new Error('Active company document access is required.');
  return {...access,client};
}
// Explicit pagination avoids silently losing work at the hosted API row limit.
export async function companyDocumentRows(client,table,columns,configure=query=>query,order=['id']) {
 const rows=[];
 for(let start=0;;start+=500) {
  let query=configure(client.from(table).select(columns));
  for(const column of order)query=query.order(column);
  const {data,error}=await query.range(start,start+499);
  if(error)throw new Error('Company document information could not be loaded.');
  rows.push(...(data||[]));if((data||[]).length<500)return rows;
 }
}
export async function companyDocumentTasks(access) {
  const client=await createClient();
  // Request-scoped RLS restricts draft participation and release distribution.
  let docs,reviews,recipients;
  try { [docs,reviews,recipients]=await Promise.all([
    companyDocumentRows(client,'company_documents','id,title,revision,status,due_date,review_date,owner_person_id,author_user_id,distribution',q=>q.eq('organization_id',access.organization.id)),
    companyDocumentRows(client,'company_document_reviews','document_id,person_id,role,accepted_at,decision'),
    companyDocumentRows(client,'company_document_recipients','document_id,person_id,acknowledged_at',q=>q,['document_id','person_id']),
  ]); } catch { return {tasks:[],error:true}; }
  const tasks=[];
  const add=(d,part)=>tasks.push({source:'documents',module:'Document Management',href:`/portal/documents/${d.id}`,due:d.due_date,updated:null,...part});
  for(const d of docs||[]) {
    if(d.status==='in_review') for(const r of (reviews||[]).filter(r=>r.document_id===d.id&&!r.decision)) add(d,{id:`document-review:${d.id}:${r.person_id}:${r.role}`,title:`${r.accepted_at?'Complete':'Accept'} ${r.role} assignment: ${d.title} · Rev ${d.revision}`,assignee:r.person_id,status:'awaiting_review'});
    if(d.status==='approved') add(d,{id:`document-release:${d.id}`,title:`Release approved document: ${d.title} · Rev ${d.revision}`,assignee:d.owner_person_id,assigneeUserId:d.author_user_id,status:'approved_for_release'});
    if(d.status==='draft') add(d,{id:`document-draft:${d.id}`,title:`Prepare draft: ${d.title} · Rev ${d.revision}`,assignee:d.owner_person_id,assigneeUserId:d.author_user_id,status:'draft'});
    if(d.status==='current') {
      for(const r of (recipients||[]).filter(r=>r.document_id===d.id&&!r.acknowledged_at)) add(d,{id:`document-read:${d.id}:${r.person_id}`,title:`Read and acknowledge: ${d.title} · Rev ${d.revision}`,assignee:r.person_id,status:'acknowledgement_due'});
      // Whole-company distribution also covers people who join after the release snapshot.
      if(d.distribution==='company'&&access.person?.id&&!(recipients||[]).some(r=>r.document_id===d.id&&r.person_id===access.person.id)) add(d,{id:`document-read:${d.id}:${access.person.id}`,title:`Read and acknowledge: ${d.title} · Rev ${d.revision}`,assignee:access.person.id,status:'acknowledgement_due'});
    }
  }
  return {tasks,error:false};
}
