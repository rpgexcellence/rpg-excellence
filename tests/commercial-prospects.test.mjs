import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeProspect,normalizeImport,companyKey,webUrl} from '../lib/commercial-prospects.mjs';

test('structured company records retain multiple sourced professional contacts and a single primary',()=>{
 const result=normalizeProspect({company:'Example Ltd',website:'https://www.example.com',contacts:[{id:'a',name:'Alex',email:'alex@example.com',is_primary:true,source_url:'https://example.com/team'},{id:'b',name:'Sam',telephone:'01234 000000',is_primary:true}],standards:['ISO 9001'],source_url:'https://example.com/quality',signal_summary:'Publishes a quality system.'});
 assert.equal(result.contacts.length,2);assert.equal(result.contacts.filter(c=>c.is_primary).length,1);assert.equal(result.email,'alex@example.com');assert.equal(result.research_sources[0].url,'https://example.com/quality');assert.equal(result.stage,'Researched');assert.equal(result.requirement_status,'Potential fit');assert.equal(result.value,0);assert.equal(companyKey(result),'example.com');
});
test('import validates the whole file, detects aliases by website and never invents business contacts',()=>{
 const rows=normalizeImport([{company:'Example',website:'https://example.com',signal_summary:'Known ISO system'}]);assert.equal(rows[0].record.email,'');assert.deepEqual(rows[0].record.contacts,[]);
 assert.throws(()=>normalizeImport([{company:'Example',website:'https://example.com'},{company:'Alias',website:'https://www.example.com/other'}]),/Duplicate/);
 assert.throws(()=>normalizeImport([{company:'First'},{company:'Second',email:'invalid-email'}]),/Company 2/);
 assert.throws(()=>normalizeImport([]));
});
test('links reject executable protocols and credentials; email headers and invalid source records fail validation',()=>{
 for(const value of ['javascript:alert(1)','data:text/html,x','https://user:password@example.com'])assert.throws(()=>webUrl(value));
 assert.throws(()=>normalizeProspect({company:'Example',email:'hello@example.com\r\nBcc:other@example.com'}));
 assert.throws(()=>normalizeProspect({company:''}));
 assert.equal(normalizeProspect({company:'Example',do_not_contact:true}).do_not_contact,true);
});
