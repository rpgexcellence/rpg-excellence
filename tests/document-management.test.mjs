import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {allowedTaskSources} from '../lib/task-module-access.mjs';
import {loadAssuranceTaskSources} from '../lib/assurance-task-sources.js';

test('a documents-only user receives no CAPA, asset, HSE or audit source access',()=>{
 assert.deepEqual([...allowedTaskSources({workspaceGroups:['dashboard','evidence']})],['documents']);
 // A training-only navigation group cannot grant operational access.
 assert.deepEqual([...allowedTaskSources({groups:['capa','evidence'],workspaceGroups:['evidence']})],['documents']);
 assert.ok(allowedTaskSources({workspaceGroups:['capa','evidence']}).has('rca'));
});
test('disabled task modules are never queried, including child task tables',async()=>{
 const called=[];
 const admin={from(table){called.push(table);throw new Error('A disabled source must not be queried');}};
 const result=await loadAssuranceTaskSources(admin,'company',new Set(['documents']));
 assert.equal(called.length,0);assert.equal(result.sourceErrors.length,0);
 assert.deepEqual(result.rcaActions,[]);assert.deepEqual(result.internalAudits,[]);
});
test('only enabled source tables and their scoped children are loaded',async()=>{
 const calls=[];
 const admin={from(table){calls.push(table);return{select(){return this},eq(){return this},order(){return this},range(){return Promise.resolve({data:[],error:null})}}}};
 const result=await loadAssuranceTaskSources(admin,'company',new Set(['audit']));
 assert.deepEqual(calls,['internal_audits']);assert.equal(result.sourceErrors.length,0);
});
const source=fs.readFileSync(new URL('../app/portal/documents/[id]/download/route.js',import.meta.url),'utf8');
const compile=(client,admin)=>new Function('createClient','createAdminClient','COMPANY_DOCUMENT_BUCKET',source.replace(/^import .*;\n/gm,'').replace(/^export const dynamic=.*;\n/gm,'').replace('export async function GET','async function GET')+'\nreturn GET;')(()=>client,admin,'company-controlled-documents');
const clientFor=(user,record,error=null)=>({auth:{getUser:async()=>({data:{user}})},from(){return{select(){return this},eq(){return this},maybeSingle:async()=>({data:record,error})}}});
test('download denies anonymous, inaccessible and foreign-path records before privileged storage',async()=>{
 const admin=()=>{throw new Error('Privileged storage must not be called');};
 for(const [user,record,status]of [[null,null,401],[{id:'a'},null,404],[{id:'a'},{id:'document',organization_id:'company',file_path:'other/document/file.pdf'},404]]){
  const res=await compile(clientFor(user,record),admin)(null,{params:Promise.resolve({id:'document'})});
  assert.equal(res.status,status);assert.match(res.headers.get('Cache-Control'),/no-store/);
 }
});
test('authorised file downloads are attachments with no public URL and no caching',async()=>{
 const record={id:'document',organization_id:'company',file_path:'company/document/token/file.pdf',file_name:'file.pdf'};
 const admin=()=>({storage:{from(bucket){assert.equal(bucket,'company-controlled-documents');return{download:async(path)=>{assert.equal(path,record.file_path);return{data:new Blob(['private bytes']),error:null}}}}}});
 const res=await compile(clientFor({id:'a'},record),admin)(null,{params:{id:'document'}});
 assert.equal(res.status,200);assert.equal(await res.text(),'private bytes');assert.match(res.headers.get('Content-Disposition'),/^attachment/);assert.match(res.headers.get('Cache-Control'),/no-store/);assert.equal(res.headers.get('X-Content-Type-Options'),'nosniff');
});

test('RPG private download refuses company users before reading metadata or storage',async()=>{
 const code=fs.readFileSync(new URL('../app/portal/rpg-documents/[id]/download/route.js',import.meta.url),'utf8');
 const make=new Function('createClient','createAdminClient','resolvePortalAdminAccess',code.replace(/^import .*;\n/gm,'').replace(/^export const dynamic=.*;\n/gm,'').replace('export async function GET','async function GET')+'\nreturn GET;');
 const GET=make(()=>clientFor({id:'customer'},null),()=>({from(){throw new Error('Private metadata must not be queried');}}),async()=>({access:null,error:null}));
 const res=await GET(null,{params:{id:'private-rpg-document'}});
 assert.equal(res.status,404);assert.match(res.headers.get('Cache-Control'),/no-store/);
});
test('document change control has no HSE MOC table or workflow dependency',()=>{
 const sql=fs.readFileSync(new URL('../supabase/migrations/20261110_company_document_management.sql',import.meta.url),'utf8');
 assert.doesNotMatch(sql,/hs_moc|linked_moc_id/);
});
