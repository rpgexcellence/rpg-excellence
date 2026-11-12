import test from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {microsoftConfiguration,sealMicrosoft,unsealMicrosoft} from '../lib/commercial-microsoft.mjs';
test('Microsoft token key tolerates clipboard whitespace without accepting invalid keys',()=>{
 const key=randomBytes(32).toString('base64'),env={RPG_MS_CLIENT_ID:'10000000-0000-4000-8000-000000000001',RPG_MS_TENANT_ID:'10000000-0000-4000-8000-000000000002',RPG_MS_CLIENT_SECRET:'test-client-secret'};
 for(const value of [key,' '+key+' ','\r\n'+key+'\r\n']){const c=microsoftConfiguration({...env,RPG_MS_TOKEN_KEY:value});assert.equal(c.configured,true);assert.equal(c.key,key);assert.equal(unsealMicrosoft(sealMicrosoft({value:'test'},c.key,'tokens'),key,'tokens').value,'test');}
 for(const value of ['', 'weak',key.slice(1),key.slice(0,20)+' '+key.slice(20)])assert.equal(microsoftConfiguration({...env,RPG_MS_TOKEN_KEY:value}).configured,false);
});
