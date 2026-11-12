import test from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes,createHash} from 'node:crypto';
import fs from 'node:fs';
import {microsoftConfiguration,requireMicrosoftConfiguration,sealMicrosoft,unsealMicrosoft,createMicrosoftAuthorization,verifyMicrosoftAuthorization,microsoftToken,microsoftGraph,verifyMicrosoftMailbox,normalizeMicrosoftDraft,draftFingerprint,safeOutlookLink,MS_CALLBACK} from '../lib/commercial-microsoft.mjs';
const env={RPG_MS_CLIENT_ID:'10000000-0000-4000-8000-000000000001',RPG_MS_TENANT_ID:'10000000-0000-4000-8000-000000000002',RPG_MS_CLIENT_SECRET:'test-client-secret-only',RPG_MS_TOKEN_KEY:randomBytes(32).toString('base64')},config=requireMicrosoftConfiguration(env);
test('Microsoft authorization uses tenant-specific PKCE, bound sessions, expiry and fixed callback',()=>{
 const flow=createMicrosoftAuthorization(config,'rpg-user',1000),u=new URL(flow.url),state=u.searchParams.get('state');
 assert.equal(u.hostname,'login.microsoftonline.com');assert.ok(u.pathname.startsWith('/'+env.RPG_MS_TENANT_ID+'/'));assert.equal(u.searchParams.get('redirect_uri'),MS_CALLBACK);
 assert.equal(u.searchParams.get('code_challenge_method'),'S256');assert.equal(u.searchParams.get('login_hint'),'info@rpgexcellence.com');assert.ok(!u.search.includes('client_secret'));assert.ok(!u.searchParams.get('scope').includes('Mail.Send'));
 const verified=verifyMicrosoftAuthorization(flow.cookie,state,'rpg-user',config.key,1001);assert.equal(u.searchParams.get('code_challenge'),createHash('sha256').update(verified.verifier).digest('base64url'));
 for(const args of [[flow.cookie,'wrong','rpg-user',config.key,1001],[flow.cookie,state,'other-user',config.key,1001],[flow.cookie,state,'rpg-user',config.key,700000]])assert.throws(()=>verifyMicrosoftAuthorization(...args));
 assert.throws(()=>verifyMicrosoftAuthorization(flow.cookie.slice(0,-3)+'abc',state,'rpg-user',config.key,1001));
});
test('encrypted tokens reject tampering, key substitution and cross-purpose use; configuration fails closed',()=>{
 const encrypted=sealMicrosoft({access_token:'private',refresh_token:'refresh'},config.key,'tokens');assert.ok(!encrypted.includes('private'));assert.equal(unsealMicrosoft(encrypted,config.key,'tokens').refresh_token,'refresh');
 assert.throws(()=>unsealMicrosoft(encrypted,config.key,'oauth'));assert.throws(()=>unsealMicrosoft(encrypted,randomBytes(32).toString('base64'),'tokens'));
 assert.equal(microsoftConfiguration({}).configured,false);assert.throws(()=>requireMicrosoftConfiguration({...env,RPG_MS_TENANT_ID:'common'}));assert.throws(()=>requireMicrosoftConfiguration({...env,RPG_MS_TOKEN_KEY:'weak'}));
});
test('Microsoft token exchange and mailbox checks reject wrong accounts, missing mail permission and raw provider errors',async()=>{
 let request;const fetcher=async(url,options)=>{request={url,options};return {ok:true,json:async()=>({access_token:'test-access',refresh_token:'test-refresh',token_type:'Bearer',expires_in:3600,scope:'User.Read Mail.ReadWrite'})};};
 await microsoftToken(config,{grant_type:'authorization_code',code:'test-code',code_verifier:'test-verifier'},fetcher);assert.ok(request.url.includes(config.tenantId));assert.equal(request.options.body.get('client_secret'),env.RPG_MS_CLIENT_SECRET);assert.equal(request.options.redirect,'error');
 await assert.rejects(()=>microsoftToken(config,{},async()=>({ok:false,json:async()=>({error_description:'SECRET_FROM_PROVIDER'})})),e=>!e.message.includes('SECRET_FROM_PROVIDER'));
 await assert.rejects(()=>microsoftToken(config,{},async()=>({ok:true,json:async()=>({access_token:'access',expires_in:3600,token_type:'Bearer',scope:'User.Read'})})));
 assert.equal(verifyMicrosoftMailbox({id:'mailbox-id',mail:'info@rpgexcellence.com'}),'mailbox-id');assert.throws(()=>verifyMicrosoftMailbox({id:'other',mail:'other@example.com'}));
});
test('reviewed drafts retain exact recipient/content and reject multiple recipients, missing prospects and header injection',()=>{
 const draft={requestId:env.RPG_MS_CLIENT_ID,prospectId:env.RPG_MS_TENANT_ID,recipient:'business@example.com',subject:'A conversation',body:'Hello\n\nReviewed introduction.',reviewed:true};
 assert.equal(normalizeMicrosoftDraft(draft).recipient,draft.recipient);assert.equal(draftFingerprint(draft),draftFingerprint({...draft}));assert.notEqual(draftFingerprint(draft),draftFingerprint({...draft,body:'Changed'}));
 for(const patch of [{recipient:'one@example.com;two@example.com'},{subject:'Subject\r\nBcc: other@example.com'},{reviewed:false},{prospectId:''}])assert.throws(()=>normalizeMicrosoftDraft({...draft,...patch}));
 assert.equal(safeOutlookLink('https://evil.example/'), '');assert.equal(safeOutlookLink('javascript:alert(1)'),'');assert.equal(safeOutlookLink('https://outlook.office.com/mail/deeplink/compose'),'https://outlook.office.com/mail/deeplink/compose');
});
test('Graph draft creation uses fixed Graph origin, explicit HTML and never invokes sending',async()=>{
 let request;const draft=await microsoftGraph('token','/me/messages',{method:'POST',body:{subject:'Reviewed',toRecipients:[{emailAddress:{address:'test@example.com'}}]}},async(url,options)=>{request={url,options};return {ok:true,json:async()=>({id:'draft-id',isDraft:true})};});
 assert.equal(draft.isDraft,true);assert.equal(request.url,'https://graph.microsoft.com/v1.0/me/messages');assert.equal(request.options.redirect,'error');
 await assert.rejects(()=>microsoftGraph('token','https://evil.example'));
 const route=fs.readFileSync(new URL('../app/api/portal/marketing/microsoft/drafts/route.js',import.meta.url),'utf8');
 assert.ok(route.includes('commercialContext()'));assert.ok(route.includes('assertMicrosoftOrigin(request)'));assert.ok(route.includes('record.do_not_contact'));assert.ok(route.includes("status:'creating'"));assert.ok(route.includes("status:'unknown'"));assert.ok(!route.includes('/send'));assert.ok(!route.includes('sendMail'));
});
