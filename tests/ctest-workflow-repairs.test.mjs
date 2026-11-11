import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {departmentsForSite,requireSiteDepartment} from "../lib/site-departments.mjs";
import {getPermitDefinitionBlockers,getIssueReadiness} from "../lib/permitLifecycle.js";
import {COMMON_CONTROLS,PERMIT_CONTROL_RULES} from "../lib/permitControlRules.js";
const source=await readFile(new URL("../lib/permitParticipants.js",import.meta.url),"utf8");
const {resolvePermitParticipants}=await import("data:text/javascript;base64,"+Buffer.from(source.replace(/^import .*;\n/m,"")).toString("base64"));
const options={people:[{id:"person-c",name:"Company C owner"}],suppliers:[{id:"supplier-c",legal_name:"Company C supplier"}],contacts:[]};
const fd=(values)=>{const result=new FormData();for(const [k,v] of Object.entries(values))result.set(k,v);return result;};
test("departments are filtered by active status and controlled site; a submitted department is rechecked",()=>{
 const departments=[{id:"shared",name:"Quality",status:"active",all_sites:true},{id:"c",name:"Test Operations",status:"active",site_ids:["site-c"]},{id:"d",status:"active",site_ids:["site-d"]},{id:"old",status:"archived",all_sites:true}];
 assert.deepEqual(departmentsForSite(departments,"site-c").map(d=>d.id),["shared","c"]);
 assert.deepEqual(departmentsForSite(departments,"") ,[]);
 assert.equal(requireSiteDepartment(departments,"site-c","c",true).name,"Test Operations");
 assert.throws(()=>requireSiteDepartment(departments,"site-c","d",true));
 assert.throws(()=>requireSiteDepartment(departments,"site-c","old",true));
});
test("incomplete draft participants can save without recording fabricated acceptance or participants",()=>{
 const result=resolvePermitParticipants(options,{name:"Company C"},fd({receiver_kind:"internal"}),{draft:true});
 assert.equal(result.issuer_person_id,null);assert.equal(result.receiver_person_id,null);assert.equal(result.receiver_name,"");
 assert.throws(()=>resolvePermitParticipants(options,{name:"Company C"},fd({receiver_kind:"internal"})));
});
test("draft mode rejects submitted people, suppliers and contacts outside company options",()=>{
 for(const fields of [{issuer_person_id:"person-other",receiver_kind:"internal"},{receiver_kind:"internal",receiver_person_id:"person-other"},{receiver_kind:"external",receiver_source:"supplier_contact",receiver_supplier_id:"supplier-other"},{receiver_kind:"external",receiver_source:"supplier_contact",receiver_supplier_id:"supplier-c",receiver_supplier_contact_id:"contact-other"}]){
   assert.throws(()=>resolvePermitParticipants(options,{name:"Company C"},fd(fields),{draft:true}));
 }
});
test("an incomplete saved draft cannot progress to verification or issue",()=>{
 const permit={permit_type:"general",status:"draft",hazards:[],precautions:[],permit_specific_controls:{}};
 const blockers=getPermitDefinitionBlockers(permit);
 assert.ok(blockers.some(s=>s.includes("risk assessment")));
 assert.ok(blockers.some(s=>s.includes("declarations")));
 assert.ok(blockers.some(s=>s.includes("hazards")));
 assert.equal(getIssueReadiness({permit,rule:PERMIT_CONTROL_RULES.general}).ready,false);
});
test("a complete general permit definition passes but missing controls or dates block it",()=>{
 const rule=PERMIT_CONTROL_RULES.general;
 const values=Object.fromEntries(rule.fields.filter(f=>f.required).map(f=>[f.key,f.type==="number"?1:f.type==="select"?f.options[0]:"Recorded test value"]));
 const permit=Object.fromEntries(["task_description","administration_location_id","work_area","scope_limits","emergency_arrangements","stop_work_conditions","asset_reference","linked_assessment_id","issuer_person_id","receiver_name"].map(k=>[k,"recorded"]));
 Object.assign(permit,{permit_type:"general",valid_from:"2030-01-01T08:00:00Z",valid_until:"2030-01-01T16:00:00Z",issuer_declaration:true,receiver_declaration:true,hazards:["Other"],precautions:COMMON_CONTROLS.filter(c=>c.critical).map(c=>c.key),permit_specific_controls:{selected:rule.controls.map(c=>c.key),values}});
 assert.deepEqual(getPermitDefinitionBlockers(permit),[]);
 assert.ok(getPermitDefinitionBlockers({...permit,valid_until:null}).length);
 assert.ok(getPermitDefinitionBlockers({...permit,precautions:[]}).length);
 assert.ok(getPermitDefinitionBlockers({...permit,issuer_declaration:false}).length);
});
