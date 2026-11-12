import 'server-only';
import {randomUUID} from 'node:crypto';
import {microsoftConfiguration,requireMicrosoftConfiguration,sealMicrosoft,unsealMicrosoft,microsoftToken,MS_MAILBOX} from './commercial-microsoft.mjs';

export async function microsoftStatus(ctx){
 const config=microsoftConfiguration(),{data,error}=await ctx.admin.from('commercial_microsoft_connection').select('mailbox,connected_at,updated_at').eq('id','primary').maybeSingle();
 const drafts=await ctx.admin.from('commercial_outlook_drafts').select('id,subject,recipient,status,outlook_url,created_at,prospect_id').order('created_at',{ascending:false}).limit(30);
 return {configured:config.configured,missing:config.missing,databaseReady:!error&&!drafts.error,connected:!error&&Boolean(data),mailbox:data?.mailbox||MS_MAILBOX,connectedAt:data?.connected_at||null,drafts:drafts.data||[]};
}
export async function microsoftAccessToken(ctx){
 const config=requireMicrosoftConfiguration();
 const {data:row,error}=await ctx.admin.from('commercial_microsoft_connection').select('*').eq('id','primary').maybeSingle();
 if(error||!row)throw Error('Connect the Microsoft mailbox before creating a draft.');
 const tokens=unsealMicrosoft(row.tokens,config.key,'tokens');
 if(row.expires_at&&Date.parse(row.expires_at)>Date.now()+120000)return tokens.access_token;
 const lease=randomUUID();const claimed=await ctx.admin.rpc('claim_commercial_microsoft_refresh',{p_actor:ctx.user.id,p_lease:lease});
 if(claimed.error||!claimed.data)throw Error('The mailbox connection is refreshing. Try again shortly.');
 try{
  const current=unsealMicrosoft(claimed.data.tokens,config.key,'tokens');
  const fresh=await microsoftToken(config,{grant_type:'refresh_token',refresh_token:current.refresh_token});
  const saved=await ctx.admin.from('commercial_microsoft_connection').update({tokens:sealMicrosoft({access_token:fresh.access_token,refresh_token:fresh.refresh_token||current.refresh_token},config.key,'tokens'),expires_at:new Date(Date.now()+fresh.expires_in*1000).toISOString(),lease_id:null,lease_until:null,updated_at:new Date().toISOString()}).eq('id','primary').eq('lease_id',lease).select('id');
  if(saved.error||!saved.data?.length)throw Error('Microsoft connection changed. Reconnect before continuing.');
  return fresh.access_token;
 }finally{await ctx.admin.from('commercial_microsoft_connection').update({lease_id:null,lease_until:null}).eq('id','primary').eq('lease_id',lease);}
}
export function assertMicrosoftOrigin(request){if(request.headers.get('origin')!=='https://www.rpgexcellence.com')throw Error('Open the production Commercial Hub before using Microsoft 365.');}
