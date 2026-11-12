import {NextResponse} from 'next/server';
import {commercialContext} from '../../../../../../lib/commercial-store';
import {assertMicrosoftOrigin,microsoftAccessToken} from '../../../../../../lib/commercial-microsoft-store';
import {normalizeMicrosoftDraft,draftFingerprint,microsoftGraph,safeOutlookLink,microsoftFailureDetails} from '../../../../../../lib/commercial-microsoft.mjs';
import {proposalEmailHtml} from '../../../../../../lib/commercial-design.mjs';
export const dynamic='force-dynamic';
export const maxDuration=60;
const reply=(body,status=200)=>NextResponse.json(body,{status,headers:{'Cache-Control':'private, no-store'}});
export async function POST(request){
 let ctx,reservedId;
 try{
  ctx=await commercialContext();assertMicrosoftOrigin(request);
  if(Number(request.headers.get('content-length')||0)>100000)return reply({error:'Draft is too large.'},413);
  const raw=await request.text();if(raw.length>100000)return reply({error:'Draft is too large.'},413);
  const draft=normalizeMicrosoftDraft(JSON.parse(raw)),fingerprint=draftFingerprint(draft);
  const prospect=await ctx.admin.from('commercial_prospects').select('record').eq('id',draft.prospectId).maybeSingle();
  if(prospect.error||!prospect.data)return reply({error:'The saved company is unavailable.'},404);
  const record=prospect.data.record;
  if(record.do_not_contact||(record.contacts||[]).some(c=>c.do_not_contact&&String(c.email).toLowerCase()===draft.recipient.toLowerCase()))return reply({error:'This organisation or recipient is marked do not contact.'},409);
  const saved=await ctx.admin.from('commercial_outlook_drafts').select('id,fingerprint,status,outlook_url,actor_id').eq('id',draft.requestId).maybeSingle();
  if(saved.error)throw Error('The private Outlook storage is not ready. Apply the Microsoft database setup.');
  if(saved.data){if(saved.data.fingerprint!==fingerprint)return reply({error:'This draft request has changed. Start a new draft.'},409);if(saved.data.status==='draft')return reply({draft:saved.data,reused:true});return reply({error:'This request may already have reached Outlook. Check its Drafts folder before preparing another copy.'},409);}
  const accessToken=await microsoftAccessToken(ctx);
  await microsoftGraph(accessToken,'/me/mailFolders/drafts?$select=id',{timeoutMs:12000});
  const reservation=await ctx.admin.from('commercial_outlook_drafts').insert({id:draft.requestId,prospect_id:draft.prospectId,actor_id:ctx.user.id,fingerprint,recipient:draft.recipient,subject:draft.subject,body:draft.body,status:'creating'});
  if(reservation.error)return reply({error:'This draft request is already being processed. Check the Outlook draft list.'},409);
  reservedId=draft.requestId;
  const message=await microsoftGraph(accessToken,'/me/messages',{method:'POST',timeoutMs:22000,body:{subject:draft.subject,internetMessageHeaders:[{name:'x-rpg-draft-request',value:draft.requestId}],body:{contentType:'HTML',content:proposalEmailHtml({body:draft.body})},toRecipients:[{emailAddress:{address:draft.recipient}}]}});
  if(!message.id||message.isDraft!==true)throw Error('Microsoft did not confirm a saved draft. Check Outlook before retrying.');
  const outlookUrl=safeOutlookLink(message.webLink),updated=await ctx.admin.from('commercial_outlook_drafts').update({status:'draft',microsoft_message_id:message.id,outlook_url:outlookUrl,updated_at:new Date().toISOString()}).eq('id',reservedId).select('id,status,outlook_url');
  if(updated.error||!updated.data?.length)throw Error('Outlook may have created the draft, but its RPG record could not be confirmed. Check Outlook before retrying.');
  return reply({draft:updated.data[0],reused:false});
 }catch(e){if(ctx&&reservedId){await ctx.admin.from('commercial_outlook_drafts').update({status:'unknown',updated_at:new Date().toISOString()}).eq('id',reservedId);return reply({error:'Outlook draft outcome is uncertain. Check the mailbox Drafts folder before creating another copy.',diagnostic:microsoftFailureDetails(e)},503);}return reply({error:e.status?'This workspace is unavailable.':e instanceof SyntaxError?'Invalid draft request.':e.message||'Draft could not be created.'},e.status||400);}
}
