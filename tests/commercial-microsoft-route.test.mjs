import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {normalizeMicrosoftDraft,draftFingerprint,safeOutlookLink,microsoftFailureDetails,MicrosoftGraphFailure} from '../lib/commercial-microsoft.mjs';
import {proposalEmailHtml} from '../lib/commercial-design.mjs';
const input={requestId:'90000000-0000-4000-8000-000000000001',prospectId:'90000000-0000-4000-8000-000000000002',recipient:'contact@example.com',subject:'Reviewed subject',body:'Reviewed body',reviewed:true};
const source=fs.readFileSync(new URL('../app/api/portal/marketing/microsoft/drafts/route.js',import.meta.url),'utf8').replace(/^import .*;\n/gm,'').replace(/export const (?:dynamic|maxDuration)=.*;\n/g,'').replace('export async function POST','async function POST');
const load=new Function('deps','const {NextResponse,commercialContext,assertMicrosoftOrigin,microsoftAccessToken,normalizeMicrosoftDraft,draftFingerprint,microsoftGraph,safeOutlookLink,microsoftFailureDetails,proposalEmailHtml}=deps;'+source+';return POST;');
function setup({record={company:'Example'},authError=false,graphError=false,saveError=false,preflightError=false}={}){
 const rows=new Map(),calls={graph:0,reservations:0};
 const admin={from(table){let operation='select',payload,id;const query={select(){return query;},eq(key,value){if(key==='id')id=value;return query;},insert(value){operation='insert';payload=value;return query;},update(value){operation='update';payload=value;return query;},maybeSingle(){return Promise.resolve({data:table==='commercial_prospects'?{record}:rows.get(id)||null,error:null});},then(resolve,reject){let result={error:null,data:null};if(operation==='insert'){calls.reservations++;if(rows.has(payload.id))result.error={code:'23505'};else rows.set(payload.id,{...payload});}if(operation==='update'){if(saveError&&payload.status==='draft')result.error={message:'database unavailable'};else{const row=rows.get(id);if(row){Object.assign(row,payload);result.data=[row];}else result.data=[];}}return Promise.resolve(result).then(resolve,reject);}};return query;}};
 const post=load({NextResponse:{json:(body,options)=>Response.json(body,options)},commercialContext:async()=>{if(authError){const e=Error('denied');e.status=404;throw e;}return {user:{id:'permitted-user'},admin};},assertMicrosoftOrigin:r=>{if(r.headers.get('origin')!=='https://www.rpgexcellence.com')throw Error('Invalid origin');},microsoftAccessToken:async()=>'test-access',normalizeMicrosoftDraft,draftFingerprint,microsoftGraph:async(token,path)=>{if(path.includes('/mailFolders/')){calls.checks=(calls.checks||0)+1;if(preflightError)throw new MicrosoftGraphFailure(403,'ErrorAccessDenied');return {id:'draft-folder'};}calls.graph++;if(graphError)throw Error('timeout');return {id:'microsoft-draft',isDraft:true,webLink:'https://outlook.office.com/mail/draft'};},safeOutlookLink,microsoftFailureDetails,proposalEmailHtml});
 const request=(body=input,origin='https://www.rpgexcellence.com')=>new Request('https://www.rpgexcellence.com/api/portal/marketing/microsoft/drafts',{method:'POST',headers:{origin,'Content-Type':'application/json'},body:JSON.stringify(body)});
 return {post,request,rows,calls};
}
test('draft route rejects unauthorised sessions, foreign origins, unreviewed messages and do-not-contact records before Graph',async()=>{
 for(const options of [{authError:true},{record:{do_not_contact:true}},{record:{contacts:[{email:input.recipient,do_not_contact:true}]}}]){const s=setup(options);assert.ok((await s.post(s.request())).status>=400);assert.equal(s.calls.graph,0);assert.equal(s.calls.reservations,0);}
 const s=setup();assert.ok((await s.post(s.request(input,'https://evil.example'))).status>=400);assert.ok((await s.post(s.request({...input,reviewed:false}))).status>=400);assert.equal(s.calls.graph,0);
});
test('draft route saves once, reuses an identical request and rejects a changed body under the same request ID',async()=>{
 const s=setup();let response=await s.post(s.request());assert.equal(response.status,200);assert.equal((await response.json()).draft.status,'draft');
 response=await s.post(s.request());assert.equal((await response.json()).reused,true);assert.equal(s.calls.graph,1);assert.equal(s.calls.reservations,1);
 assert.equal((await s.post(s.request({...input,body:'Changed'}))).status,409);assert.equal(s.calls.graph,1);
});
test('uncertain Graph or database outcomes block automatic resubmission',async()=>{
 for(const options of [{graphError:true},{saveError:true}]){const s=setup(options);assert.equal((await s.post(s.request())).status,503);assert.equal(s.rows.get(input.requestId).status,'unknown');assert.equal((await s.post(s.request())).status,409);assert.equal(s.calls.graph,1);}
});

test('mailbox preflight failure returns a specific safe error before a draft reservation or create request',async()=>{const s=setup({preflightError:true}),r=await s.post(s.request());assert.equal(r.status,400);assert.match((await r.json()).error,/HTTP 403; ErrorAccessDenied/);assert.equal(s.calls.checks,1);assert.equal(s.calls.reservations,0);assert.equal(s.calls.graph,0);});
