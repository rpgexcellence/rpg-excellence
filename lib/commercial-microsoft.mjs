import {randomBytes,createHash,createCipheriv,createDecipheriv,timingSafeEqual} from 'node:crypto';

export const MS_MAILBOX='info@rpgexcellence.com';
export const MS_ORIGIN='https://www.rpgexcellence.com';
export const MS_CALLBACK=`${MS_ORIGIN}/api/portal/marketing/microsoft/callback`;
export const MS_SCOPES='openid profile offline_access User.Read Mail.ReadWrite';
export const MS_COOKIE='__Host-rpg-commercial-microsoft';
const guid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function microsoftConfiguration(env=process.env){
 const missing=[],key=String(env.RPG_MS_TOKEN_KEY||'').trim();
 if(!guid.test(env.RPG_MS_CLIENT_ID||''))missing.push('RPG_MS_CLIENT_ID');
 if(!guid.test(env.RPG_MS_TENANT_ID||''))missing.push('RPG_MS_TENANT_ID');
 if((env.RPG_MS_CLIENT_SECRET||'').length<10)missing.push('RPG_MS_CLIENT_SECRET');
 if(!/^[A-Za-z0-9+/]{43}=$/.test(key))missing.push('RPG_MS_TOKEN_KEY');
 return {configured:!missing.length,missing,clientId:env.RPG_MS_CLIENT_ID,tenantId:env.RPG_MS_TENANT_ID,clientSecret:env.RPG_MS_CLIENT_SECRET,key};
}
export function requireMicrosoftConfiguration(env=process.env){const c=microsoftConfiguration(env);if(!c.configured)throw Error('Microsoft 365 setup is incomplete. Review the connection settings.');return c;}
export function sealMicrosoft(value,key,purpose){
 const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',Buffer.from(key,'base64'),iv);cipher.setAAD(Buffer.from(`rpg-commercial:${purpose}:v1`));
 return ['v1',iv.toString('base64url'),Buffer.concat([cipher.update(JSON.stringify(value),'utf8'),cipher.final()]).toString('base64url'),cipher.getAuthTag().toString('base64url')].join('.');
}
export function unsealMicrosoft(value,key,purpose){
 try{const [version,iv,data,tag,...extra]=String(value||'').split('.');if(version!=='v1'||extra.length)throw Error();const decipher=createDecipheriv('aes-256-gcm',Buffer.from(key,'base64'),Buffer.from(iv,'base64url'));decipher.setAAD(Buffer.from(`rpg-commercial:${purpose}:v1`));decipher.setAuthTag(Buffer.from(tag,'base64url'));return JSON.parse(Buffer.concat([decipher.update(Buffer.from(data,'base64url')),decipher.final()]).toString('utf8'));}catch{throw Error('Microsoft connection data could not be verified. Reconnect the mailbox.');}
}
export function createMicrosoftAuthorization(config,userId,now=Date.now()){
 const state=randomBytes(32).toString('base64url'),verifier=randomBytes(48).toString('base64url');
 const url=new URL(`https://login.microsoftonline.com/${config.tenantId}/oauth2/v2.0/authorize`);
 url.search=new URLSearchParams({client_id:config.clientId,response_type:'code',redirect_uri:MS_CALLBACK,response_mode:'query',scope:MS_SCOPES,state,code_challenge:createHash('sha256').update(verifier).digest('base64url'),code_challenge_method:'S256',prompt:'select_account',login_hint:MS_MAILBOX}).toString();
 return {url:url.href,cookie:sealMicrosoft({state,verifier,userId,expires:now+600000},config.key,'oauth')};
}
export function verifyMicrosoftAuthorization(cookie,state,userId,key,now=Date.now()){
 const flow=unsealMicrosoft(cookie,key,'oauth');
 const a=Buffer.from(String(flow.state||'')),b=Buffer.from(String(state||''));
 if(!a.length||a.length!==b.length||!timingSafeEqual(a,b)||flow.userId!==userId||!Number.isFinite(flow.expires)||flow.expires<now||flow.expires>now+600000||typeof flow.verifier!=='string')throw Error('Microsoft sign-in expired or belongs to another session. Start again.');
 return flow;
}
export async function microsoftToken(config,grant,fetcher=fetch){
 const response=await fetcher(`https://login.microsoftonline.com/${config.tenantId}/oauth2/v2.0/token`,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:config.clientId,client_secret:config.clientSecret,redirect_uri:MS_CALLBACK,scope:MS_SCOPES,...grant}),cache:'no-store',redirect:'error',signal:AbortSignal.timeout(15000)});
 let data;try{data=await response.json();}catch{throw Error('Microsoft authentication did not return a valid response. Reconnect the mailbox.');}
 if(!response.ok||data.token_type?.toLowerCase()!=='bearer'||!data.access_token||!Number.isFinite(data.expires_in)||data.expires_in<60||data.expires_in>86400)throw Error('Microsoft authentication failed. Check the application settings and reconnect.');
 const scopes=String(data.scope||'').toLowerCase().split(/\s+/);if(!scopes.some(s=>s==='mail.readwrite'||s==='https://graph.microsoft.com/mail.readwrite'))throw Error('Microsoft mailbox permission is missing. Reconnect with Mail.ReadWrite.');
 return data;
}
const graphCodes=new Set(['ErrorAccessDenied','Authorization_RequestDenied','InvalidAuthenticationToken','MailboxNotEnabledForRESTAPI','ErrorMailboxNotEnabledForRESTAPI','ErrorNonExistentMailbox','ErrorInvalidUser','OrganizationFromTenantGuidNotFound','ErrorItemNotFound','ErrorQuotaExceeded','ErrorExceededConnectionCount','ErrorInvalidRequest','ErrorInvalidProperty','ErrorInvalidPropertySet','ErrorMessageSizeExceeded','GraphTimeout','GraphDnsFailure','GraphTlsFailure','GraphConnectionFailure','GraphRedirectBlocked']);
export class MicrosoftGraphFailure extends Error{
 constructor(httpStatus,code){const safeCode=graphCodes.has(code)?code:httpStatus?'GraphRequestRejected':'GraphNetworkFailure';super(httpStatus?'Microsoft mailbox request failed (HTTP '+httpStatus+'; '+safeCode+').':'Microsoft mailbox could not be reached. No automatic retry was made.');this.name='MicrosoftGraphFailure';this.httpStatus=httpStatus||null;this.code=safeCode;}
}
export function microsoftFailureDetails(error){return error instanceof MicrosoftGraphFailure?{code:error.code,httpStatus:error.httpStatus,message:error.message}:{code:'ConnectionCheckFailed',httpStatus:null,message:'The mailbox check could not complete. Review the Microsoft connection and try the check again.'};}
export async function microsoftGraph(token,path,{method='GET',body,timeoutMs=20000}={},fetcher=fetch){
 if(!/^\/me(?:\?|\/|$)/.test(path)||path.includes('..')||!Number.isFinite(timeoutMs)||timeoutMs<1000||timeoutMs>35000)throw Error('Unsupported Microsoft operation.');
 let response;try{response=await fetcher(`https://graph.microsoft.com/v1.0${path}`,{method,headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json',Prefer:'IdType="ImmutableId"'},...(body?{body:JSON.stringify(body)}:{}),cache:'no-store',redirect:'manual',signal:AbortSignal.timeout(timeoutMs)});
 }catch(error){const code=error?.cause?.code||error?.code;const category=error?.name==='TimeoutError'||error?.name==='AbortError'||['UND_ERR_CONNECT_TIMEOUT','UND_ERR_HEADERS_TIMEOUT','UND_ERR_BODY_TIMEOUT','ETIMEDOUT'].includes(code)?'GraphTimeout':['ENOTFOUND','EAI_AGAIN'].includes(code)?'GraphDnsFailure':['CERT_HAS_EXPIRED','UNABLE_TO_VERIFY_LEAF_SIGNATURE','DEPTH_ZERO_SELF_SIGNED_CERT'].includes(code)?'GraphTlsFailure':['ECONNRESET','ECONNREFUSED'].includes(code)?'GraphConnectionFailure':'GraphNetworkFailure';throw new MicrosoftGraphFailure(null,category);}
 if(response.status>=300&&response.status<400)throw new MicrosoftGraphFailure(response.status,'GraphRedirectBlocked');
 if(!response.ok){let code;try{code=(await response.json())?.error?.code;}catch{}throw new MicrosoftGraphFailure(response.status,code);}
 try{return await response.json();}catch{throw Error('Microsoft returned an unreadable response. Check Outlook before creating another copy.');}
}
export function verifyMicrosoftMailbox(profile){if(!profile?.id||String(profile.mail||profile.userPrincipalName||'').trim().toLowerCase()!==MS_MAILBOX)throw Error('Connect Microsoft using info@rpgexcellence.com. Other mailboxes cannot be linked.');return profile.id;}
export function normalizeMicrosoftDraft(input){
 const recipient=String(input?.recipient||'').trim(),subject=String(input?.subject||'').trim(),body=String(input?.body||'').trim();
 if(!/^[^\s@<>;,]+@[^\s@<>;,]+\.[^\s@<>;,]+$/.test(recipient)||recipient.length>254)throw Error('Enter one valid recipient email address.');
 if(!subject||subject.length>250||/[\r\n]/.test(subject)||!body||body.length>30000)throw Error('Add a subject (up to 250 characters) and message (up to 30,000 characters).');
 if(!guid.test(input?.requestId||'')||!guid.test(input?.prospectId||''))throw Error('Choose a saved prospect before creating an Outlook draft.');
 if(input.reviewed!==true)throw Error('Review the message before creating an Outlook draft.');
 return {recipient,subject,body,requestId:input.requestId,prospectId:input.prospectId};
}
export function safeOutlookLink(value){try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&!u.port&&['outlook.office.com','outlook.office365.com'].includes(u.hostname)?u.href:'';}catch{return '';}}
export function draftFingerprint(draft){return createHash('sha256').update(JSON.stringify([draft.prospectId,draft.recipient.toLowerCase(),draft.subject,draft.body])).digest('hex');}
