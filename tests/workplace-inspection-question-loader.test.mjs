import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import Module,{createRequire} from 'node:module';
import * as checklistPolicy from '../lib/workplace-inspection-checklist.mjs';
const require=createRequire(import.meta.url),root=path.resolve(import.meta.dirname,'..');
const swc=require('next/dist/build/swc');await swc.loadBindings();
let tables,queries,omitCount,truncate;
function reset(){
  tables={hs_inspection_templates:[{id:'t',organization_id:null,status:'active'},{id:'foreign-t',organization_id:'other',status:'active'}],hs_inspection_question_packs:[{id:'p',organization_id:null,pack_code:'CORE_WORKPLACE',active:true},{id:'foreign-p',organization_id:'other',pack_code:'CORE_WORKPLACE',active:true}],hs_inspection_pack_questions:[{pack_id:'p',question_id:'q',question:{id:'q',template_id:'t',active:true,question_code:'Q',question_text:'Question'}},{pack_id:'p',question_id:'foreign-q',question:{id:'foreign-q',template_id:'foreign-t',active:true,question_code:'PRIVATE',question_text:'Foreign question'}}],hs_inspection_programme_packs:[{organization_id:'org',programme_id:'pr',pack_id:'p',pack:{pack_code:'CORE_WORKPLACE'}}]};queries=[];omitCount=false;truncate=false;
}
function from(table){
  let filters=[],start=0,end=499,scope;
  const query={
    select(){return query},order(){return query},
    or(value){scope=value;return query},
    eq(key,value){filters.push(row=>row[key]===value);return query},
    in(key,values){filters.push(row=>values.includes(row[key]));return query},
    range(first,last){start=first;end=last;return query},
    then(resolve,reject){return Promise.resolve().then(()=>{
      queries.push({table,start,end,scope});
      let rows=(tables[table] || []).filter(row=>filters.every(fn=>fn(row)));
      if(scope)rows=rows.filter(row=>row.organization_id===null||row.organization_id==='org');
      const count=rows.length;const data=truncate?[]:rows.slice(start,Math.min(end+1,start+1));
      return {data,count:omitCount?null:count,error:null};
    }).then(resolve,reject)},
  };return query;
}
const file=path.join(root,'lib/workplace-inspections.js'),originalLoad=Module._load,originalExtension=Module._extensions['.js'];
Module._extensions['.js']=(m,f)=>f===file?m._compile(swc.transformSync(fs.readFileSync(f,'utf8'),{filename:f,jsc:{parser:{syntax:'ecmascript'}},module:{type:'commonjs'}}).code,f):originalExtension(m,f);
Module._load=function(request,parent,...rest){
  if(parent?.filename===file&&request==='./supabase/admin')return {createAdminClient:()=>({from})};
  if(parent?.filename===file&&request==='./workplace-inspection-checklist.mjs')return checklistPolicy;
  return originalLoad.call(this,request,parent,...rest);
};
const loaders=require(file);Module._load=originalLoad;Module._extensions['.js']=originalExtension;
test('catalogue follows configured small page limits and excludes foreign questions',async()=>{
  reset();const bank=await loaders.loadInspectionQuestionCatalog('org');
  assert.equal(bank.templates.length,1);assert.equal(bank.packs.length,1);assert.equal(bank.memberships.length,1);assert.equal(bank.memberships[0].question.question_code,'Q');
  assert.ok(queries.some(row=>row.table==='hs_inspection_pack_questions'&&row.start===1));
  assert.ok(queries.filter(row=>['hs_inspection_templates','hs_inspection_question_packs'].includes(row.table)).every(row=>row.scope.includes('organization_id.eq.org')));
});
test('unverifiable or truncated banks fail instead of returning a partial checklist',async()=>{
  reset();omitCount=true;await assert.rejects(loaders.loadInspectionQuestionCatalog('org'),/count could not be verified/);
  reset();truncate=true;await assert.rejects(loaders.loadInspectionQuestionCatalog('org'),/truncated/);
});
test('saved programme identity and newly selected hazards are validated together',async()=>{
  reset();const programme={id:'pr',organization_id:'org',template_id:'t',area_profile:{}};
  assert.equal((await loaders.loadProgrammeInspectionChecklist('org',programme)).ready,true);
  const missing=await loaders.loadProgrammeInspectionChecklist('org',{...programme,area_profile:{biological_hazards:true}});
  assert.equal(missing.ready,false);assert.ok(missing.blockers.some(b=>b.packCode==='BIOLOGICAL'));
  await assert.rejects(loaders.loadProgrammeInspectionChecklist('org',{...programme,organization_id:'other'}),/outside/);
});
test('a catalogue from another workspace cannot be reused for scheduling',async()=>{
  reset();await assert.rejects(loaders.loadChecklistForPacks('org',[],{templateId:'t',catalog:{organizationId:'other'}}),/different organisation/);
});
