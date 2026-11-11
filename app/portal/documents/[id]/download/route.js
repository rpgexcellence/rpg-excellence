import { createClient } from '../../../../../lib/supabase/server';
import { createAdminClient } from '../../../../../lib/supabase/admin';
import { COMPANY_DOCUMENT_BUCKET } from '../../../../../lib/company-documents';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'private, no-store, max-age=0','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; sandbox",'Referrer-Policy':'no-referrer'};
export async function GET(request,{params}) {
 const {id}=await params;
 const client=await createClient();
 const {data:{user}}=await client.auth.getUser();
 if(!user)return new Response('Authentication required',{status:401,headers});
 const {data:d,error}=await client.from('company_documents').select('id,organization_id,file_path,file_name').eq('id',id).maybeSingle();
 // Request-scoped RLS rechecks current company membership and document distribution.
 if(error||!d||!d.file_path?.startsWith(`${d.organization_id}/${d.id}/`)||d.file_path.includes('..'))return new Response('Document unavailable',{status:404,headers});
 const {data:file,error:storageError}=await createAdminClient().storage.from(COMPANY_DOCUMENT_BUCKET).download(d.file_path);
 if(storageError||!file)return new Response('Document unavailable',{status:404,headers});
 return new Response(file,{headers:{...headers,'Content-Type':'application/octet-stream','Content-Disposition':`attachment; filename="${String(d.file_name||'document').replace(/[^A-Za-z0-9._-]/g,'_')}"`}});
}
