import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import Module,{createRequire} from 'node:module';
import {canStartInspection,assertInspectionFieldwork,EDITABLE_APPOINTMENTS,inspectionTimestamp,validateAppointmentIndependence} from '../lib/workplace-inspection-policy.mjs';
const require=createRequire(import.meta.url),root=path.resolve(import.meta.dirname,'..'),swc=require('next/dist/build/swc');
await swc.loadBindings();
const originalLoad=Module._load,originalExtension=Module._extensions['.js'];
let access,data,queries,paths,checklistFailure;
const org='org',uid='rafal-user';
function reset(){
 checklistFailure=false;
 access={user:{id:uid,email:'owner@example.test'},organization:{id:org,owner_id:uid},isOwner:true,person:{id:'rafal'},level:'owner',canAdministerInspection:true};
 data={hs_inspection_programmes:[{id:'programme',organization_id:org,status:'active',lead_inspector_person_id:'igor',accountable_person_id:'igor',reviewer_person_id:'rafal',next_inspection_date:'2027-01-19',template_id:'template'}],hs_inspection_programme_packs:[{organization_id:org,programme_id:'programme',pack:{pack_code:'CORE_WORKPLACE'}}],hs_workplace_inspections:[{id:'inspection',organization_id:org,programme_id:'programme',status:'planned',lead_inspector_person_id:'igor',accountable_person_id:'igor',reviewer_person_id:'rafal',updated_at:'v1',title:'Original'}],organization_people:[{id:'igor',organization_id:org,user_id:'igor-user',account_status:'active'},{id:'rafal',organization_id:org,user_id:uid,account_status:'active'}],hs_workplace_inspection_responses:[{id:'response',organization_id:org,inspection_id:'inspection',response:'yes',assessed_by_person_id:'igor'}]};queries=[];paths=[];
}
function builder(table){let filters=[],update,insert,single=false;
 const q=new Proxy({},{get(_,key){if(key==='then')return(resolve,reject)=>Promise.resolve().then(()=>{
  queries.push({table,filters,update,insert});
  const rows=(data[table]||[]).filter(row=>filters.every(([op,k,v])=>op==='eq'?row[k]===v:op==='in'?v.includes(row[k]):op==='neq'?row[k]!==v:true));
  if(insert){const created=(Array.isArray(insert)?insert:[insert]).map(row=>({id:table==='hs_workplace_inspections'?'new-inspection':'new',...row}));(data[table] ||= []).push(...created);return {data:single?created[0]:created,error:null};}
  if(update)rows.forEach(row=>Object.assign(row,update));
  return {data:single?rows[0] || null:rows.map(row=>({...row})),error:null};
 }).then(resolve,reject);
 return(...args)=>{if(['eq','in','neq'].includes(key))filters.push([key,...args]);if(key==='update')update=args[0];if(key==='insert')insert=args[0];if(['single','maybeSingle'].includes(key))single=true;return q;};}});return q;
}
const admin={from:builder};
const actionFile=path.join(root,'app/portal/health-safety/workplace-inspections/[id]/actions.js'),scheduleFile=path.join(root,'app/portal/health-safety/workplace-inspections/actions.js');
Module._extensions['.js']=(m,f)=>[actionFile,scheduleFile].includes(f)?m._compile(swc.transformSync(fs.readFileSync(f,'utf8'),{filename:f,jsc:{parser:{syntax:'ecmascript'}},module:{type:'commonjs'}}).code,f):originalExtension(m,f);
Module._load=function(request,parent,...rest){
 if([actionFile,scheduleFile].includes(parent?.filename)){
  if(request==='next/cache')return {revalidatePath:p=>paths.push(p)};
  if(request==='next/navigation')return {redirect:p=>{throw Object.assign(Error(p),{digest:'NEXT_REDIRECT'})}};
  if(request.endsWith('/organization-access'))return {requireOrganizationAccess:async()=>access};
  if(request.endsWith('/plan-access'))return {requirePlanAccess:async()=>{}};
  if(request.endsWith('/supabase/admin'))return {createAdminClient:()=>admin};
  if(request.endsWith('/workplace-inspection-access'))return {resolveInspectionAccess:async()=>access};
  if(request.endsWith('/workplace-inspection-checklist.mjs'))return {requireInspectionChecklist:c=>{if(!c?.ready)throw Error('Checklist unavailable');return c;}};
  if(request.endsWith('/workplace-inspection-policy.mjs'))return {canStartInspection,assertInspectionFieldwork,EDITABLE_APPOINTMENTS,inspectionTimestamp,validateAppointmentIndependence};
  if(request.endsWith('/workplace-inspections'))return {validateCompanyPeople:async(_,ids)=>{if(ids.some(id=>!data.organization_people.some(p=>p.id===id&&p.account_status==='active')))throw Error('Invalid Company User');},validateAdministrationSite:async()=>{},loadProgrammeInspectionChecklist:async()=>{if(checklistFailure)throw Error('BIOLOGICAL has no active questions for this template');return {ready:true,questionCount:1,packs:[{pack_code:'CORE_WORKPLACE'}],questions:[{id:'question',question_code:'A1',question_text:'Check',display_order:1}]};}};
  if(request.endsWith('/workplace-inspection-signal-sync'))return {};
 }
 return originalLoad.call(this,request,parent,...rest);
};
const actions=require(actionFile),schedule=require(scheduleFile);
Module._load=originalLoad;Module._extensions['.js']=originalExtension;
const form=values=>{const result=new FormData();for(const [k,v]of Object.entries(values))result.set(k,v);return result;};
const edit=extra=>form({inspection_id:'inspection',expected_updated_at:'v1',lead_inspector_person_id:'igor',accountable_person_id:'rafal',reviewer_person_id:'rafal',planned_start:'2027-01-19T09:00',planned_end:'2027-01-19T11:00',title:'Updated',scope:'New scope',change_reason:'Allocate resources',...extra});
test('scheduling creates a planned Igor assignment and returns to programme',async()=>{
 reset();await assert.rejects(schedule.generateScheduledInspection(null,form({programme_id:'programme',title:'Scheduled',planned_date:'2027-01-19',planned_start_time:'09:00'})),e=>e.message==='/portal/health-safety/workplace-inspections/programmes/programme?scheduled=new-inspection#inspection-history');
 const created=data.hs_workplace_inspections.find(r=>r.id==='new-inspection');assert.equal(created.status,'planned');assert.equal(created.lead_inspector_person_id,'igor');assert.equal(created.created_by_user_id,uid);assert.equal(created.started_at,undefined);assert.ok(paths.includes('/portal/tasks'));assert.ok(paths.includes('/portal/health-safety'));
});
test('administrator cannot start or save Igor fieldwork',async()=>{
 reset();assert.match((await actions.startInspection(null,form({inspection_id:'inspection'}))).error,/assigned/);
 assert.match((await actions.saveInspectionFieldwork(null,form({inspection_id:'inspection',responses_json:'[]'}))).error,/assigned/);
 assert.equal(queries.some(q=>q.update),false);
});
test('assigned inspector explicitly starts once',async()=>{
 reset();access={...access,user:{id:'igor-user'},person:{id:'igor'},isOwner:false,level:'contribute',canAdministerInspection:false};
 assert.ok((await actions.startInspection(null,form({inspection_id:'inspection'}))).success);
 assert.equal(data.hs_workplace_inspections[0].status,'in_progress');
 assert.ok(data.hs_workplace_inspections[0].started_at);
 assert.ok((await actions.startInspection(null,form({inspection_id:'inspection'}))).error);
});
test('administrator edits metadata without changing responses and rejects stale versions',async()=>{
 reset();const before=JSON.stringify(data.hs_workplace_inspection_responses);assert.ok((await actions.updateInspectionDetails(null,edit({}))).success);
 assert.equal(data.hs_workplace_inspections[0].lead_inspector_person_id,'igor');assert.equal(data.hs_workplace_inspections[0].accountable_person_id,'rafal');assert.equal(JSON.stringify(data.hs_workplace_inspection_responses),before);
 assert.match((await actions.updateInspectionDetails(null,edit({}))).error,/changed/);
 const write=queries.find(q=>q.update);assert.ok(write.filters.some(f=>f[1]==='organization_id'&&f[2]===org));assert.ok(write.filters.some(f=>f[1]==='updated_at'));
});
test('editing an inspection awaiting review requires fresh fieldwork submission',async()=>{
 reset();data.hs_workplace_inspections[0].status='awaiting_review';assert.ok((await actions.updateInspectionDetails(null,edit({}))).success);assert.equal(data.hs_workplace_inspections[0].status,'in_progress');assert.equal(data.hs_workplace_inspections[0].completed_at,null);
});
test('non-administrators, foreign records, self-review and approved records fail closed',async()=>{
 reset();access.canAdministerInspection=false;assert.match((await actions.updateInspectionDetails(null,edit({}))).error,/administrator/);
 reset();data.hs_workplace_inspections[0].organization_id='other';assert.match((await actions.updateInspectionDetails(null,edit({}))).error,/not found/);
 reset();assert.match((await actions.updateInspectionDetails(null,edit({reviewer_person_id:'igor'}))).error,/independent/);
 reset();data.hs_workplace_inspections[0].status='completed';assert.match((await actions.updateInspectionDetails(null,edit({}))).error,/locked/);
});

test('an incomplete selected pack blocks scheduling before any record is inserted',async()=>{
 reset();checklistFailure=true;const before=JSON.stringify(data.hs_workplace_inspection_responses);
 const result=await schedule.generateScheduledInspection(null,form({programme_id:'programme',title:'Scheduled',planned_date:'2027-01-19'}));
 assert.match(result.error,/BIOLOGICAL/);assert.equal(queries.some(q=>q.insert),false);assert.equal(JSON.stringify(data.hs_workplace_inspection_responses),before);
});
