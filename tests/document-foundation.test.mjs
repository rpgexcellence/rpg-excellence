import test from 'node:test';
import assert from 'node:assert/strict';
import {documentDraftValues,DOCUMENT_TYPES} from '../lib/document-form.mjs';
import {resolveCompanyPersonDepartment,departmentApplies,LEGACY_DEPARTMENT} from '../lib/company-person-department.mjs';
import {readBusinessDetails} from '../lib/businessProfileDetails.js';
const U=n=>'60000000-0000-4000-8000-'+String(n).padStart(12,'0');
const make=()=>{const f=new FormData();for(const [k,v]of Object.entries({title:'Policy',document_type:'Policy',revision:'1.0',owner_person_id:U(1),change_reason:'New controlled issue',change_impact:'Communicate requirements',distribution:'selected',applicability:'selected'}))f.set(k,v);f.append('classifications','iso9001_2026');f.append('classifications','risk_assessments');f.append('sites',U(2));f.append('departments',U(3));f.append('verifiers',U(4));f.append('approvers',U(5));f.append('recipients',U(6));return f;};
test('initial draft form supports policy, multi-classifications, scoped departments, reviewer assignments and recipients',()=>{
 const v=documentDraftValues(make());assert.ok(DOCUMENT_TYPES.includes('Policy'));assert.deepEqual(v.classifications,['iso9001_2026','risk_assessments']);assert.deepEqual(v.sites,[U(2)]);assert.deepEqual(v.departments,[U(3)]);assert.deepEqual(v.reviews,[{person_id:U(4),role:'verifier'},{person_id:U(5),role:'approver'}]);assert.deepEqual(v.recipients,[U(6)]);
});
test('draft parser rejects invalid person IDs, unknown types and malformed classifications',()=>{
 let f=make();f.append('recipients','not-a-uuid');assert.throws(()=>documentDraftValues(f),/valid recipients/);
 f=make();f.set('document_type','Made up');assert.throws(()=>documentDraftValues(f),/document type/);
 f=make();f.append('classifications','../fake');assert.throws(()=>documentDraftValues(f),/valid classifications/);
});
test('company profile save no longer writes or resets POWRA numbering settings',()=>{
 const f=new FormData();f.set('name','Company');f.set('powra_reference_prefix','CHANGED');f.set('powra_reference_padding','1');
 const result=readBusinessDetails(f);assert.equal(result.error,undefined);assert.ok(!Object.hasOwn(result.details,'powra_reference_prefix'));assert.ok(!Object.hasOwn(result.details,'powra_reference_padding'));
});
const adminFor=(department,siteLink)=>({from(table){return{select(){return this},eq(){return this},maybeSingle:async()=>({data:table==='organization_departments'?department:siteLink,error:null})}}});
test('department eligibility uses company-wide or matching site applicability',()=>{
 assert.ok(departmentApplies({all_sites:true},null));assert.ok(departmentApplies({all_sites:false,site_ids:[U(2)]},U(2)));assert.equal(departmentApplies({all_sites:false,site_ids:[U(2)]},U(7)),false);
});
test('person department resolution preserves old clients and unmatched legacy text',async()=>{
 const form=new FormData(),person={department_id:U(1),department:'Quality',site_id:U(2)};
 assert.deepEqual(await resolveCompanyPersonDepartment({},U(8),form,person),{});
 form.set('department_id',LEGACY_DEPARTMENT);assert.deepEqual(await resolveCompanyPersonDepartment({},U(8),form,{department:'Previously typed'}),{});
});
test('person department resolution rejects wrong-company, inactive and inapplicable new assignments',async()=>{
 const form=new FormData();form.set('department_id',U(1));
 await assert.rejects(resolveCompanyPersonDepartment(adminFor(null,null),U(8),form),/belonging/);
 await assert.rejects(resolveCompanyPersonDepartment(adminFor({id:U(1),name:'Lab',status:'inactive',all_sites:true},null),U(8),form),/active/);
 await assert.rejects(resolveCompanyPersonDepartment(adminFor({id:U(1),name:'Lab',status:'active',all_sites:false},null),U(8),form,null,{site_id:U(2)}),/applicable/);
 const value=await resolveCompanyPersonDepartment(adminFor({id:U(1),name:'Quality',status:'active',all_sites:false},{department_id:U(1)}),U(8),form,null,{site_id:U(2)});assert.deepEqual(value,{department_id:U(1),department:'Quality'});
});
