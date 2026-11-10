import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import {LEGACY_PERSON_SITE,personSiteLabel,resolveCompanyPersonSite} from '../lib/company-person-site.mjs';
const require=createRequire(import.meta.url),a='50000000-0000-4000-8000-000000000001',b='50000000-0000-4000-8000-000000000002',id='50000000-0000-4000-8000-000000000003',old='50000000-0000-4000-8000-000000000004';
const rows=[{id,organization_id:a,site_reference:'SITE-001',site_name:'Workshop',status:'active'},{id:old,organization_id:a,site_reference:'SITE-002',site_name:'Old lab',status:'inactive'}];
const form=value=>{const f=new FormData();if(value!==undefined)f.set('site_id',value);return f;};
function admin(data=rows,error=null){return {from(table){assert.equal(table,'organization_sites');const filters=[];const q={select(){return q},eq(k,v){filters.push([k,v]);return q},async maybeSingle(){assert(filters.some(([k,v])=>k==='organization_id'&&v));return {data:data.find(row=>filters.every(([k,v])=>row[k]===v))||null,error}}};return q}};}
test('controlled person site resolves only within the signed-in company',async()=>{
 assert.deepEqual(await resolveCompanyPersonSite(admin(),a,form(id)),{site_id:id,site:'SITE-001 · Workshop'});
 await assert.rejects(()=>resolveCompanyPersonSite(admin(),b,form(id)),/your company/);
 await assert.rejects(()=>resolveCompanyPersonSite(admin(),a,form('not-a-uuid')),/valid company/);
 await assert.rejects(()=>resolveCompanyPersonSite(admin(rows,{code:'down'}),a,form(id)),/could not be checked/);
});
test('inactive locations may be retained but cannot be newly assigned',async()=>{
 await assert.rejects(()=>resolveCompanyPersonSite(admin(),a,form(old)),/active location/);
 assert.deepEqual(await resolveCompanyPersonSite(admin(),a,form(old),{site_id:old}),{site_id:old,site:'SITE-002 · Old lab'});
});
test('legacy clients and unresolved text cannot erase a profile assignment',async()=>{
 assert.deepEqual(await resolveCompanyPersonSite(admin(),a,form(),{site_id:id,site:'Original'}),{});
 assert.deepEqual(await resolveCompanyPersonSite(admin(),a,form(LEGACY_PERSON_SITE),{site:'Old free text'}),{});
 await assert.rejects(()=>resolveCompanyPersonSite(admin(),a,form(LEGACY_PERSON_SITE)),/company location/);
 assert.deepEqual(await resolveCompanyPersonSite(admin(),a,form(''),{site_id:id}),{site_id:null,site:null});
});
test('person site dropdown renders only eligible locations and preserves historical selection',async()=>{
 const Module=require('node:module'),swc=require('next/dist/build/swc');await swc.loadBindings();
 const React=require('react'),{renderToStaticMarkup}=require('react-dom/server');const original=Module._load;
 Module._load=function(name,parent,...rest){if(name==='next/link')return function Link(props){return React.createElement('a',props,props.children)};return original.call(this,name,parent,...rest);};
 try{
  const path=new URL('../components/CompanyPersonSiteField.js',import.meta.url).pathname;
  const m=new Module(path);m.filename=path;m.paths=Module._nodeModulePaths(require('node:path').dirname(path));
  m._compile(swc.transformSync(readFileSync(path,'utf8'),{jsc:{parser:{syntax:'ecmascript',jsx:true},transform:{react:{runtime:'automatic'}}},module:{type:'commonjs'}}).code,path);
  const html=renderToStaticMarkup(React.createElement(m.exports.default,{sites:rows}));
  assert(html.includes('name="site_id"'));assert(html.includes('Workshop'));assert(!html.includes('Old lab'));assert(!html.includes('<input'));assert(html.includes('target="_blank"'));
  const history=renderToStaticMarkup(React.createElement(m.exports.default,{sites:rows,person:{site_id:old,site:'History'}}));assert(history.includes('Old lab (inactive)'));assert.match(history,new RegExp('<option(?=[^>]*value="'+old+'")(?=[^>]*selected="")[^>]*>'));
  const legacy=renderToStaticMarkup(React.createElement(m.exports.default,{sites:[],person:{site:'Unmatched old text'}}));assert(legacy.includes('Unmatched old text'));assert(legacy.includes('No active locations'));
 }finally{Module._load=original;}
});
