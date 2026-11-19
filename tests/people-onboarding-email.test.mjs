import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';

const require=createRequire(import.meta.url);
const source=readFileSync(new URL('../lib/people-onboarding-email.js',import.meta.url),'utf8')
  .replace('import QRCode from "qrcode";',`import QRCode from ${JSON.stringify(pathToFileURL(require.resolve('qrcode')).href)};`);
const {sendQrInvitation,sendWelcomeEmail}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));

test('onboarding messages use the delivery transport without exposing access details',async t=>{
  const keys=['RESEND_API_KEY','NEXT_PUBLIC_SITE_URL'];
  const saved=Object.fromEntries(keys.map(k=>[k,process.env[k]]));
  const originalFetch=globalThis.fetch;
  const deliveries=[];
  process.env.RESEND_API_KEY='test-only-key';
  process.env.NEXT_PUBLIC_SITE_URL='https://www.rpgexcellence.com/';
  globalThis.fetch=async(url,options)=>{
    assert.equal(url,'https://api.resend.com/emails');
    assert.equal(options.method,'POST');
    assert.equal(options.headers.Authorization,'Bearer test-only-key');
    const payload=JSON.parse(options.body);deliveries.push(payload);
    return {ok:true};
  };
  const input={person:{first_name:'Demo',email:'demo@example.com',position:'Private position'},organisation:{name:'Example Company'},manager:{first_name:'Private',last_name:'Manager'},functions:[{function_key:'viewer',status:'authorised'}],permissions:[{module_key:'asset_management',access_level:'admin'}]};
  try{
    await t.test('account-ready email has matching HTML and plain-text sign-in links and no permissions',async()=>{
      await sendWelcomeEmail(input);const p=deliveries.at(-1);
      assert.deepEqual(p.to,['demo@example.com']);
      assert.equal(p.subject,'Your RPG Excellence access is ready');
      assert.match(p.html,/href="https:\/\/www\.rpgexcellence\.com\/portal\/my-access"/);
      assert.match(p.text,/https:\/\/www\.rpgexcellence\.com\/portal\/my-access/);
      assert.match(p.html,/Example Company/);assert.match(p.text,/Example Company/);
      assert.doesNotMatch(p.html+p.text,/Full administrative rights|Private Manager|Private position|Platform access:|Authorised functions:/);
      assert.equal(p.attachments,undefined);
    });
    await t.test('first invitation retains the personal QR and offers the same setup URL in both formats',async()=>{
      const invitationUrl='https://www.rpgexcellence.com/join/demo-token?source=invite&test=1';
      await sendQrInvitation({...input,invitationUrl,expiresAt:'2026-11-22T14:30:00Z'});const p=deliveries.at(-1);
      assert.equal(p.subject,'Set up your RPG Excellence account');
      assert.match(p.html,/href="https:\/\/www\.rpgexcellence\.com\/join\/demo-token\?source=invite&amp;test=1"/);
      assert(p.text.includes(invitationUrl));assert.match(p.html,/22 Nov 2026, 14:30 UTC/);assert.match(p.text,/22 Nov 2026, 14:30 UTC/);
      assert.match(p.html,/single-use/);assert.match(p.text,/Do not forward/);
      assert.equal(p.attachments.length,1);
      assert.deepEqual(Buffer.from(p.attachments[0].content,'base64').subarray(0,8),Buffer.from([137,80,78,71,13,10,26,10]));
      assert.doesNotMatch(p.html+p.text,/Full administrative rights|Private Manager|Private position|account is active/);
    });
    await t.test('names and company names cannot inject HTML into either template',async()=>{
      const unsafe={...input,person:{...input.person,first_name:'<img src=x onerror=alert(1)>'},organisation:{name:'A & B <script>bad</script>'}};
      await sendWelcomeEmail(unsafe);
      assert.doesNotMatch(deliveries.at(-1).html,/<img|<script>/);
      assert.match(deliveries.at(-1).html,/A &amp; B &lt;script&gt;/);
      await sendQrInvitation({...unsafe,invitationUrl:'https://www.rpgexcellence.com/join/test',expiresAt:'2026-11-22T14:30:00Z'});
      assert.doesNotMatch(deliveries.at(-1).html,/<img|<script>/);
    });
    await t.test('default production access URL works when the site environment is absent',async()=>{
      delete process.env.NEXT_PUBLIC_SITE_URL;await sendWelcomeEmail(input);
      assert.match(deliveries.at(-1).text,/https:\/\/www\.rpgexcellence\.com\/portal\/my-access/);
    });
    await t.test('missing delivery credentials fail before making a request',async()=>{
      const count=deliveries.length;delete process.env.RESEND_API_KEY;
      await assert.rejects(()=>sendWelcomeEmail(input),/RESEND_API_KEY is not configured/);
      assert.equal(deliveries.length,count);process.env.RESEND_API_KEY='test-only-key';
    });
    await t.test('provider rejection propagates so callers can record a delivery failure',async()=>{
      globalThis.fetch=async()=>({ok:false,status:429,text:async()=>'rate limited'});
      await assert.rejects(()=>sendWelcomeEmail(input),/Resend 429: rate limited/);
    });
  }finally{
    globalThis.fetch=originalFetch;
    for(const k of keys){if(saved[k]===undefined)delete process.env[k];else process.env[k]=saved[k];}
  }
});
