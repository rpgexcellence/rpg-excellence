import test from 'node:test';
import assert from 'node:assert/strict';
import {soaPerson,validateSoaAction,soaTasks,soaControlHref,validateSoaUpload} from '../lib/soa-workflow.mjs';
const people=[{id:'owner',account_status:'active',user_id:'author'},{id:'reviewer',account_status:'active',user_id:'verifier'},{id:'old',account_status:'closed'}];
const action={action_required:'Implement policy',action_owner_person_id:'owner',action_verifier_person_id:'reviewer',target_date:'2026-12-01',action_status:'planned'};
test('company owner choices reject unavailable and inactive people',()=>{assert.equal(soaPerson(people,'owner','control owner').id,'owner');assert.throws(()=>soaPerson(people,'foreign','risk owner'));assert.throws(()=>soaPerson(people,'old','risk owner'));assert.throws(()=>soaPerson(people,'','owner',true));});
test('assigned SoA actions require an owner and deadline',()=>{assert.doesNotThrow(()=>validateSoaAction({values:action,people,actorId:'author'}));for(const change of [{action_owner_person_id:''},{target_date:''}])assert.throws(()=>validateSoaAction({values:{...action,...change},people,actorId:'author'}));});
test('verification is routed to the independent assigned reviewer and cannot be self-approved',()=>{const values={...action,action_status:'verified',action_completion_evidence:'Implementation records',action_verification_conclusion:'Sample confirmed effective'};assert.throws(()=>validateSoaAction({values,existing:{action_status:'awaiting_verification'},people,actorId:'author',canApprove:true}));assert.throws(()=>validateSoaAction({values:{...values,action_verifier_person_id:'owner'},existing:{action_status:'awaiting_verification'},people,actorId:'author',canApprove:true}));assert.doesNotThrow(()=>validateSoaAction({values,existing:{action_status:'awaiting_verification'},people,actorId:'verifier',canApprove:true}));});
test('tasks use the assigned owner then reviewer and deep-link to the exact control',()=>{const rows=[{...action,assessment_id:'assessment',control_id:'5.1'},{...action,assessment_id:'assessment',control_id:'5.2',action_status:'awaiting_verification'}];const tasks=soaTasks(rows);assert.equal(tasks[0].assignee,'owner');assert.equal(tasks[1].assignee,'reviewer');assert.equal(tasks[0].href,'/portal/assessments/assessment/soa?q=5.1&control=5.1#soa-5_1');assert.match(soaControlHref('a','5.1'),/#soa-5_1$/);});
test('empty actions create no task and existing action history cannot be silently deleted',()=>{assert.deepEqual(soaTasks([{action_required:'',action_status:'not_required'}]),[]);assert.throws(()=>validateSoaAction({values:{action_status:'not_required'},existing:action,people}));});
test('evidence validation rejects oversized files, executable/web formats and mismatched contents',()=>{assert.throws(()=>validateSoaUpload({size:11*1024*1024,name:'x.pdf',type:'application/pdf'},new Uint8Array()));assert.throws(()=>validateSoaUpload({size:10,name:'x.html',type:'text/html'},new TextEncoder().encode('<html>')));assert.throws(()=>validateSoaUpload({size:10,name:'x.pdf',type:'application/pdf'},new TextEncoder().encode('<script>')));assert.doesNotThrow(()=>validateSoaUpload({size:8,name:'x.pdf',type:'application/pdf'},new TextEncoder().encode('%PDF-1.7')));});

import {readFile} from 'node:fs/promises';
const routeSource=await readFile(new URL('../app/portal/assessments/[id]/soa/evidence/[evidenceId]/route.js',import.meta.url),'utf8');
async function evidenceRoute(ctx){
 globalThis.__soaRouteContext=ctx;
 const code=`const soaContext=globalThis.__soaRouteContext;const NextResponse=class extends Response {static redirect(url){return new Response(null,{status:307,headers:{Location:url}})}};\n`+routeSource.replace(/^import .*;\n/gm,'')+`\n// ${Math.random()}`;
 return (await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'))).GET;
}
test('evidence downloads recheck assessment/company/owner and do not sign foreign files',async()=>{
 let signed=0;const filters={};
 const admin={from:()=>({select(){return this;},eq(key,value){filters[key]=value;return this;},async maybeSingle(){return {data:filters.id==='owned'&&filters.assessment_id==='a'&&filters.organization_id==='c'&&filters.owner_id==='u'?{storage_path:'c/a/5_1/evidence.pdf',file_name:'evidence.pdf'}:null};}}),storage:{from:()=>({async createSignedUrl(){signed++;return {data:{signedUrl:'https://example.invalid/private-evidence'}};}})}};
 const get=await evidenceRoute(async()=>({admin,assessment:{organization_id:'c'},ownerId:'u'}));
 const denied=await get(null,{params:{id:'a',evidenceId:'foreign'}});assert.equal(denied.status,404);assert.equal(signed,0);
 const allowed=await get(null,{params:{id:'a',evidenceId:'owned'}});assert.equal(allowed.status,307);assert.equal(signed,1);assert.equal(allowed.headers.get('Cache-Control'),'private, no-store');
});
test('evidence downloads fail closed when the SoA access check fails',async()=>{
 const get=await evidenceRoute(async()=>{throw Error('Other company');});
 assert.equal((await get(null,{params:{id:'foreign-assessment',evidenceId:'file'}})).status,404);
});
