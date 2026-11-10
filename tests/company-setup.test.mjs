import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import {locationDraft,legacyLocationCandidates,sameAddress,locationSetupPath} from '../lib/company-setup.mjs';
const require=createRequire(import.meta.url);
const org={name:'Company B',address_line_1:'1 High Street',city:'Corby',postal_code:'NN1 1AA',country:'United Kingdom',business_site_mode:'multiple',business_additional_sites:[{site_name:'Workshop',address_line_1:'2 Road',city:'Corby',country:'United Kingdom'}]};
test('registered and legacy addresses become unsaved drafts without changing company records',()=>{
 const before=JSON.stringify(org);const draft=locationDraft(org,'registered',[]);
 assert.equal(draft.id,undefined);assert.equal(draft.site_type,'operational_site');assert.equal(draft.is_primary,true);
 assert.equal(draft.address_line_1,'1 High Street');assert.equal(locationDraft(org,'legacy:0',[]).site_name,'Workshop');
 assert.equal(JSON.stringify(org),before);assert.equal(locationDraft(org,'legacy:100',[]),null);
 assert.equal(locationDraft(org,'https://outside.test',[]),null);
 assert.equal(locationDraft(org,'registered',[{...org,status:'active'}]),null);
 assert.equal(locationDraft(org,'legacy:0',[{...org,is_primary:true,status:'active'}]).is_primary,false);
});
test('existing locations are linked rather than imported twice, including inactive sites',()=>{
 const site={...org.business_additional_sites[0],id:'existing',status:'inactive'};
 assert.equal(legacyLocationCandidates(org,[site])[0].existing.id,'existing');
 assert(sameAddress(site,{...site,address_line_1:'  2 ROAD '}));assert(!sameAddress({country:'UK'},{country:'UK'}));
 assert.equal(locationDraft(org,'legacy:0',[site]),null);
});
test('old site query redirects retain local editing intent and discard unrelated parameters',()=>{
 const path=locationSetupPath({edit:'site-1',source:'registered',next:'https://outside.test'});
 assert.equal(path,'/portal/company/setup?section=locations&edit=site-1&source=registered');
});
test('saving legal company details omits legacy address-list fields, even from an old form',async()=>{
 const src=readFileSync(new URL('../lib/businessProfileDetails.js',import.meta.url),'utf8');
 const {readBusinessDetails}=await import('data:text/javascript;base64,'+Buffer.from(src).toString('base64'));
 const form=new FormData();form.set('business_site_mode','single');form.set('business_additional_sites','[]');
 const result=readBusinessDetails(form);assert(!result.error);assert(!('business_site_mode' in result.details));assert(!('business_additional_sites' in result.details));
});
test('company and copied-site forms render without competing site editor or existing record ID',async()=>{
 const Module=require('node:module'),swc=require('next/dist/build/swc');await swc.loadBindings();
 const React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
 const original=Module._load;
 Module._load=function(id,parent,...rest){
  if(id==='react')return {...React,useState:value=>[typeof value==='function'?value():value,()=>{}],useActionState:()=>[null,()=>{},false]};
  if(id==='next/link')return function Link(props){return React.createElement('a',props,props.children)};
  if(parent?.filename?.endsWith('BusinessProfileForm.js')&&id.includes('businessProfile')){
   const filename=require('node:path').resolve(require('node:path').dirname(parent.filename),id)+'.js';
   const m=new Module(filename,parent);m.filename=filename;m.paths=parent.paths;
   m._compile(swc.transformSync(readFileSync(filename,'utf8'),{jsc:{parser:{syntax:'ecmascript'}},module:{type:'commonjs'}}).code,filename);return m.exports;
  }
  return original.call(this,id,parent,...rest);
 };
 try{
  function load(relative){const filename=new URL(relative,import.meta.url).pathname;const m=new Module(filename);m.filename=filename;m.paths=Module._nodeModulePaths(require('node:path').dirname(filename));m._compile(swc.transformSync(readFileSync(filename,'utf8'),{jsc:{parser:{syntax:'ecmascript',jsx:true},transform:{react:{runtime:'automatic'}}},module:{type:'commonjs'}}).code,filename);return m.exports.default;}
  const Details=load('../app/portal/company/business-profile/BusinessProfileForm.js');
  const html=renderToStaticMarkup(React.createElement(Details,{organization:org,action:()=>{}}));
  assert(html.includes('Registered business address'));assert(!html.includes('business_site_mode'));assert(!html.includes('business_additional_sites'));assert(!html.includes('Site 1'));
  const Site=load('../app/portal/company/sites/SiteProfileForm.js');
  const draft=locationDraft(org,'registered',[]);const siteHtml=renderToStaticMarkup(React.createElement(Site,{site:null,draft,action:()=>{}}));
  assert(siteHtml.includes('name="id" value=""'));assert(siteHtml.includes('value="1 High Street"'));assert(siteHtml.includes('name="address_source" value="registered"'));
 }finally{Module._load=original;}
});
