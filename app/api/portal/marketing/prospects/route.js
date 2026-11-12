import {NextResponse} from 'next/server';
import {createHash} from 'node:crypto';
import {commercialContext,loadCommercialProspects} from '../../../../../lib/commercial-store';
import {normalizeProspect,normalizeImport,companyKey} from '../../../../../lib/commercial-prospects.mjs';
export const dynamic='force-dynamic';
const reply=(body,status=200)=>NextResponse.json(body,{status,headers:{'Cache-Control':'private, no-store'}});
export async function GET(){try{return reply({prospects:await loadCommercialProspects(await commercialContext())});}catch(e){return reply({error:e.message},e.status||503);}}
export async function POST(request){
 try{
  const ctx=await commercialContext();
  if(request.headers.get('origin')!==new URL(request.url).origin)return reply({error:'Reload the website and submit from the Commercial Hub.'},403);
  if(Number(request.headers.get('content-length')||0)>2000000)return reply({error:'Use an import file smaller than 2 MB.'},413);
  const raw=await request.text();if(raw.length>2000000)return reply({error:'Use an import file smaller than 2 MB.'},413);
  let body;try{body=JSON.parse(raw);}catch{return reply({error:'Invalid JSON file.'},400);}
  if(body.intent==='import'){
   const records=normalizeImport(body.prospects);
   const batchKey=createHash('sha256').update(JSON.stringify(records)).digest('hex');
   const {data,error}=await ctx.admin.rpc('import_commercial_prospects',{p_actor:ctx.user.id,p_records:records,p_batch_key:batchKey});
   if(error)return reply({error:'Import could not complete. Check the private register migration and try again.'},503);
   return reply({result:data,prospects:await loadCommercialProspects(ctx)});
  }
  const record=normalizeProspect(body.prospect),key=companyKey(record);
  const id=body.prospect?.id||null;
  if(id&&!/^[0-9a-f-]{36}$/i.test(id))return reply({error:'Invalid company reference.'},400);
  const {data,error}=await ctx.admin.rpc('save_commercial_prospect',{p_actor:ctx.user.id,p_id:id,p_key:key,p_record:record,p_expected_revision:Number(body.expectedRevision)||0});
  if(error){const stale=String(error.message).includes('changed');return reply({error:stale?'This company was changed in another session. Reload before saving.':'Company could not be saved. Check for an existing record with the same website.'},stale?409:400);}
  return reply({prospect:{...data.record,id:data.id,company_key:data.company_key,revision:data.revision,created_at:data.created_at,updated_at:data.updated_at}});
 }catch(e){return reply({error:e.message},e.status||400);}
}
