import {createClient} from '../../../../../lib/supabase/server';
import {createAdminClient} from '../../../../../lib/supabase/admin';
import {resolvePortalAdminAccess} from '../../../../../lib/portal-admin-access';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'private, no-store, max-age=0','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; sandbox",'Referrer-Policy':'no-referrer'};
export async function GET(request,{params}) {
 const client=await createClient();const {data:{user}}=await client.auth.getUser();
 if(!user)return new Response('Authentication required',{status:401,headers});
 const admin=createAdminClient();
 const {access,error}=await resolvePortalAdminAccess({admin,user,allowedRoles:['admin','document_controller']});
 if(error||!access)return new Response('Document unavailable',{status:404,headers});
 const {id}=await params;
 const {data:d,error:queryError}=await admin.from('controlled_documents').select('file_path,file_name').eq('id',id).maybeSingle();
 if(queryError||!d?.file_path)return new Response('Document unavailable',{status:404,headers});
 const {data:file,error:storageError}=await admin.storage.from('controlled-documents').download(d.file_path);
 if(storageError||!file)return new Response('Document unavailable',{status:404,headers});
 return new Response(file,{headers:{...headers,'Content-Type':'application/octet-stream','Content-Disposition':`attachment; filename="${String(d.file_name||'document').replace(/[^A-Za-z0-9._-]/g,'_')}"`}});
}
