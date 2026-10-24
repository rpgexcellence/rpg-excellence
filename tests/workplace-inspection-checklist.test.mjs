import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectionPackCodes,compileInspectionChecklist,requireInspectionChecklist} from '../lib/workplace-inspection-checklist.mjs';
const template={id:'template',organization_id:null,status:'active'};
const core={id:'core',organization_id:null,pack_code:'CORE_WORKPLACE',title:'Core',active:true};
const bio={id:'bio',organization_id:null,pack_code:'BIOLOGICAL',title:'Biological',active:true};
const q=(id,extra={})=>({id,template_id:'template',question_code:id,question_text:'Question '+id,active:true,display_order:10,...extra});
const fixture=extra=>({organizationId:'org',templateId:'template',templates:[template],packs:[core,bio],packCodes:['BIOLOGICAL'],memberships:[{pack_id:'core',question:q('shared')},{pack_id:'bio',question:q('shared')},{pack_id:'bio',question:q('bio1')},{pack_id:'bio',question:q('bio2')}],...extra});
test('hazard selections always include core and do not treat false strings as selected',()=>{
  assert.deepEqual(inspectionPackCodes({biological_hazards:true,machinery:'false',work_at_height:'true'},['BIOLOGICAL','UNKNOWN']),['CORE_WORKPLACE','BIOLOGICAL','WORK_AT_HEIGHT']);
});
test('specialist questions appear with transparent overlap and a deduplicated combined checklist',()=>{
  const input=fixture();const before=JSON.stringify(input);const result=compileInspectionChecklist(input);
  assert.equal(result.ready,true);assert.equal(result.questionCount,3);assert.equal(result.sharedQuestionCount,1);
  assert.equal(result.packs.find(p=>p.id==='bio').additionalQuestionCount,2);
  assert.equal(result.packs.find(p=>p.id==='bio').questionCount,3);
  assert.equal(result.questions.find(q=>q.id==='shared').packs.length,2);
  assert.equal(JSON.stringify(input),before);
  assert.equal(requireInspectionChecklist(result),result);
});
test('a selected empty, inactive, missing or wrong-template pack cannot silently disappear',()=>{
  for(const extra of [
    {memberships:[{pack_id:'core',question:q('core1')}]},
    {packs:[core,{...bio,active:false}]},
    {packs:[core]},
    {memberships:[{pack_id:'core',question:q('core1')},{pack_id:'bio',question:q('wrong',{template_id:'other'})}]},
  ]){
    const result=compileInspectionChecklist(fixture(extra));assert.equal(result.ready,false);assert.ok(result.blockers.some(b=>b.packCode==='BIOLOGICAL'));assert.throws(()=>requireInspectionChecklist(result));
  }
});
test('foreign organisation packs and templates are excluded before compiling any question text',()=>{
  const result=compileInspectionChecklist(fixture({packs:[core,{...bio,organization_id:'foreign'}]}));
  assert.equal(result.ready,false);assert.equal(result.questions.some(q=>q.id==='bio1'),false);
  const foreign=compileInspectionChecklist(fixture({templates:[{...template,organization_id:'foreign'}]}));
  assert.equal(foreign.ready,false);assert.equal(foreign.questions.length,0);
});
test('unique organisation packs override system defaults only for unsaved selections',()=>{
  const local={...bio,id:'local',organization_id:'org'};
  const data=fixture({packs:[core,bio,local],memberships:[{pack_id:'core',question:q('core1')},{pack_id:'bio',question:q('bio1')},{pack_id:'local',question:q('local1')}]});
  assert.equal(compileInspectionChecklist(data).packs.find(p=>p.pack_code==='BIOLOGICAL').id,'local');
  const saved=compileInspectionChecklist({...data,selectedPackIds:['core','bio']});
  assert.equal(saved.ready,true);assert.equal(saved.packs.find(p=>p.pack_code==='BIOLOGICAL').id,'bio');
  assert.equal(compileInspectionChecklist({...data,selectedPackIds:['core','bio','local']}).ready,false);
  assert.equal(compileInspectionChecklist({...data,selectedPackIds:['core','foreign-id']}).ready,false);
});
test('ambiguous codes and incompatible response types block scheduling',()=>{
  const ambiguous=compileInspectionChecklist(fixture({packs:[core,bio,{...bio,id:'duplicate'}]}));assert.equal(ambiguous.ready,false);
  const duplicate=compileInspectionChecklist(fixture({memberships:[{pack_id:'core',question:q('one',{question_code:'SAME'})},{pack_id:'bio',question:q('two',{question_code:'SAME'})}]}));
  assert.ok(duplicate.blockers.some(b=>b.code==='duplicate_question_code'));
  const unsupported=compileInspectionChecklist(fixture({memberships:[{pack_id:'core',question:q('one')},{pack_id:'bio',question:q('text',{response_type:'text'})}]}));
  assert.ok(unsupported.blockers.some(b=>b.code==='unsupported_response_type'));
});
