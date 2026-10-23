import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {INTEGRATION_PERMISSIONS,LEGACY_INTEGRATION_PERMISSIONS,validateIntegrationPermissions,normaliseInspectionBand,integrationDateOnly} from '../lib/integration-policy.mjs';
test('released scopes are unique and inert legacy scopes cannot be issued',()=>{
 assert.equal(new Set(INTEGRATION_PERMISSIONS).size,INTEGRATION_PERMISSIONS.length);
 for(const scope of INTEGRATION_PERMISSIONS) if(scope!=='security_incidents:detail') assert.deepEqual(validateIntegrationPermissions([scope]),[scope]);
 for(const scope of LEGACY_INTEGRATION_PERMISSIONS) assert.throws(()=>validateIntegrationPermissions([scope]),/released/);
 assert.throws(()=>validateIntegrationPermissions(['security_incidents:detail']),/summary/);
 assert.deepEqual(validateIntegrationPermissions(['security_incidents:read','security_incidents:detail']),['security_incidents:read','security_incidents:detail']);
});
test('inspection aliases preserve compatibility and impossible dates are rejected',()=>{
 assert.equal(normaliseInspectionBand('low'),'routine');assert.equal(normaliseInspectionBand('moderate'),'medium');
 assert.equal(integrationDateOnly('2028-02-29'),true);assert.equal(integrationDateOnly('2026-02-29'),false);assert.equal(integrationDateOnly('2026-02-31'),false);
});
test('database permission constraint agrees with released and retained legacy registry',()=>{
 const sql=fs.readFileSync(new URL('../supabase/migrations/20261022_integration_api_stabilisation.sql',import.meta.url),'utf8');
 const values=sql.match(/permissions <@ array\[([\s\S]*?)\]::text\[\]/)[1];
 const actual=[...values.matchAll(/'([^']+)'/g)].map(m=>m[1]);
 assert.deepEqual(actual.slice().sort(),[...INTEGRATION_PERMISSIONS,...LEGACY_INTEGRATION_PERMISSIONS].sort());
});
test('all authenticated exports are wrapped and every route has an OpenAPI path',()=>{
 const root=new URL('../app/api/v1/integration/',import.meta.url),spec=fs.readFileSync(new URL('../docs/api/rpg-integration-v1.openapi.yaml',import.meta.url),'utf8');
 const files=fs.readdirSync(root,{recursive:true}).filter(path=>path.endsWith('route.js'));
 assert.equal(files.length,12);
 for(const file of files){
  const code=fs.readFileSync(new URL(file,root),'utf8');const url='/'+file.replace(/\/route.js$/,'').replace('[id]','{id}');
  assert.ok(spec.includes('  '+url+':'),url+' documented');
  if(url!=='/openapi') assert.ok(code.includes('withIntegrationRequest(async function GET('),url+' wrapped');
  assert.ok(!code.includes('.eq("owner_id", client.owner_id)'),url+' does not use owner-only data export');
 }
});
