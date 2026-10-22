import { createHash, timingSafeEqual, randomUUID } from 'node:crypto';
import { AsyncLocalStorage } from 'node:async_hooks';
import { isIP } from 'node:net';
import { createClient } from '@supabase/supabase-js';
import { getUserSubscription, hasPlanAccess } from './subscription';
const requests=new AsyncLocalStorage();
const API_KEY_PATTERN=/^rpg_(test|live)_([a-f0-9]{12})_([A-Za-z0-9_-]{32,128})$/;
const digest=value=>createHash('sha256').update(value,'utf8').digest('hex');
const safeEqual=(left,right)=>{const a=Buffer.from(String(left||'')),b=Buffer.from(String(right||''));return a.length===b.length&&timingSafeEqual(a,b);};
const unavailable=(requestId)=>integrationJson({error:'integration_service_unavailable',message:'The integration could not be completed safely. Retry later and quote the request ID.'},503,requestId);
function adminClient(){
 return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{
  auth:{autoRefreshToken:false,persistSession:false,detectSessionInUrl:false},
  global:{fetch:(url,options={})=>fetch(url,{...options,signal:options.signal?AbortSignal.any([options.signal,AbortSignal.timeout(15000)]):AbortSignal.timeout(15000)})},
 });
}
export function canonicalIntegrationIp(value){
 const ip=String(value||'').trim();if(!isIP(ip)) return null;
 return isIP(ip)===6?new URL('http://['+ip+']/').hostname.slice(1,-1):ip;
}
export function integrationSourceIp(request){
 // Set only when the hosting ingress OVERWRITES this header. Do not trust arbitrary forwarding headers.
 const header=process.env.INTEGRATION_TRUSTED_IP_HEADER?.trim().toLowerCase();
 if(!['x-vercel-forwarded-for','cf-connecting-ip','x-forwarded-for','x-real-ip'].includes(header)) return null;
 const raw=request.headers.get(header)||'';
 return canonicalIntegrationIp(raw.split(',')[0]);
}
export async function integrationOwnerEntitled(ownerId,organizationId){
 const subscription=await getUserSubscription(ownerId);
 return Boolean(hasPlanAccess(subscription,'consultant')&&
  (subscription.access_source!=='organization_subscription'||subscription.organization_id===organizationId));
}
export function integrationJson(body,status=200,requestId=null){
 const ctx=requests.getStore(),headers={'cache-control':'no-store','x-content-type-options':'nosniff',...(requestId?{'x-request-id':requestId}:{}),...(ctx?.rateHeaders||{})};
 return Response.json(body,{status,headers});
}
export async function recordIntegrationEvent({admin,client,request,requestId,eventType,resourceType=null,resourceId=null,responseStatus,errorSummary=null,payloadDigest=null}){
 const rawCorrelation=request.headers.get('x-request-id')||'';
 const correlation=/^[\w.:-]{1,128}$/.test(rawCorrelation)?rawCorrelation:null;
 const {error}=await admin.from('integration_events').insert({
  organization_id:client.organization_id,api_client_id:client.id,direction:'inbound',event_type:eventType,
  resource_type:resourceType,resource_id:resourceId,request_id:requestId,external_request_id:correlation,
  http_method:request.method,endpoint:new URL(request.url).pathname,response_status:responseStatus,payload_digest:payloadDigest,
  // Store a bounded technical code, not raw database narratives or query text.
  error_summary:errorSummary?'integration_operation_failed':null,source_ip:integrationSourceIp(request),
 });
 if(error){console.error('INTEGRATION_AUDIT_WRITE_FAILED',{request_id:requestId,code:error.code||'database_error'});throw Object.assign(Error('Integration audit unavailable'),{code:'INTEGRATION_AUDIT_UNAVAILABLE'});}
}
export function withIntegrationRequest(handler){
 return async function(request,...args){
  const ctx={requestId:randomUUID(),client:null,admin:null,rateHeaders:{}};
  return requests.run(ctx,async()=>{
   try{
    const response=await handler(request,...args);
    if(ctx.client) await recordIntegrationEvent({admin:ctx.admin,client:ctx.client,request,requestId:ctx.requestId,eventType:'request_completed',responseStatus:response.status});
    else if(response.status>=400) console.warn('INTEGRATION_REQUEST_REJECTED',{request_id:ctx.requestId,status:response.status});
    response.headers.set('x-request-id',ctx.requestId);
    for(const [key,value] of Object.entries(ctx.rateHeaders)) response.headers.set(key,value);
    return response;
   }catch(error){
    console.error('INTEGRATION_REQUEST_FAILED',{request_id:ctx.requestId,code:error.code||'operation_failed'});
    if(ctx.client&&error.code!=='INTEGRATION_AUDIT_UNAVAILABLE'){
     try{await recordIntegrationEvent({admin:ctx.admin,client:ctx.client,request,requestId:ctx.requestId,eventType:'request_failed',responseStatus:503,errorSummary:'operation_failed'});}catch{}
    }
    return unavailable(ctx.requestId);
   }
  });
 };
}
export async function requireIntegrationClient(request,requiredPermission){
 const ctx=requests.getStore(),requestId=ctx?.requestId||randomUUID();
 const authorization=request.headers.get('authorization')||'';
 const token=authorization.startsWith('Bearer ')?authorization.slice(7).trim():'';
 const match=token.match(API_KEY_PATTERN);
 const reject=(error,message,status=401)=>({error:integrationJson({error,message,request_id:requestId},status,requestId)});
 if(!match) return reject('invalid_api_key','Provide a valid RPG Bearer API key.');
 const [,environment,publicId]=match,admin=adminClient();
 const result=await admin.from('integration_api_clients').select('id,owner_id,organization_id,client_name,environment,key_prefix,secret_hash,permissions,allowed_ip_ranges,active,expires_at,revoked_at').eq('key_prefix',`rpg_${environment}_${publicId}`).maybeSingle();
 if(result.error) return {error:unavailable(requestId)};
 const client=result.data;
 if(!client||!safeEqual(digest(token),client.secret_hash)||client.environment!==environment) return reject('invalid_api_key','The API key is invalid.');
 if(ctx){ctx.client=client;ctx.admin=admin;}
 if(!client.active||client.revoked_at) return reject('api_key_revoked','The API key has been revoked.');
 if(client.expires_at&&(!Number.isFinite(Date.parse(client.expires_at))||Date.parse(client.expires_at)<=Date.now())) return reject('api_key_expired','The API key has expired.');
 const organization=await admin.from('organizations').select('id,owner_id').eq('id',client.organization_id).maybeSingle();
 if(organization.error) return {error:unavailable(requestId)};
 if(!organization.data||organization.data.owner_id!==client.owner_id) return reject('organization_binding_invalid','The API client organisation binding needs administrator review.',403);
 const budget=await admin.rpc('reserve_integration_request',{p_client:client.id,p_org:client.organization_id});
 if(budget.error||!budget.data) return {error:unavailable(requestId)};
 const limit=budget.data;
 if(ctx) ctx.rateHeaders={'x-ratelimit-limit':String(limit.client_limit),'x-ratelimit-remaining':String(Math.max(0,limit.client_remaining)),'x-ratelimit-reset':String(limit.reset_at),'x-ratelimit-organization-limit':String(limit.organization_limit),'x-ratelimit-organization-remaining':String(limit.organization_remaining)};
 if(!limit.allowed){const response=integrationJson({error:'rate_limit_exceeded',message:'Request budget exhausted. Retry after the indicated delay.',request_id:requestId},429,requestId);response.headers.set('retry-after',String(limit.retry_after));return {error:response};}
 if(!await integrationOwnerEntitled(client.owner_id,client.organization_id)) return reject('integration_entitlement_required','The organisation needs an active Consultant or protected platform-administrator entitlement.',403);
 const ip=integrationSourceIp(request);
 if((client.allowed_ip_ranges||[]).length){
  if(!process.env.INTEGRATION_TRUSTED_IP_HEADER||!ip) return reject('trusted_source_ip_unavailable','The configured IP restriction requires a verified hosting ingress address.',403);
  const allowed=client.allowed_ip_ranges.map(canonicalIntegrationIp);
  if(allowed.some(value=>!value)||!allowed.includes(ip)) return reject('ip_not_allowed','The request source is not permitted for this API key.',403);
 }
 // Test credentials can verify authentication, but never query customer registers.
 if(environment==='test'&&new URL(request.url).pathname!=='/api/v1/integration/health') return reject('test_environment_unavailable','Test keys are credential checks only. A separate sandbox dataset is not available; use a scoped live key for approved production reads.',403);
 if(requiredPermission&&!(client.permissions||[]).includes(requiredPermission)) return reject('insufficient_scope',`This API key requires ${requiredPermission}.`,403);
 await recordIntegrationEvent({admin,client,request,requestId,eventType:'request_admitted',responseStatus:200});
 const used=await admin.from('integration_api_clients').update({last_used_at:new Date().toISOString(),last_used_ip:ip}).eq('id',client.id).eq('organization_id',client.organization_id);
 if(used.error){console.error('INTEGRATION_LAST_USED_WRITE_FAILED',{request_id:requestId});throw Error('Credential monitoring unavailable');}
 return {admin,client,requestId,sourceIp:ip};
}
export function integrationPayloadDigest(payload){return digest(typeof payload==='string'?payload:JSON.stringify(payload));}
