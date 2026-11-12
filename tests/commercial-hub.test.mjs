import test from 'node:test';
import assert from 'node:assert/strict';
import {commercialAccess} from '../lib/commercial-access.mjs';
import {navigationForAccess} from '../lib/portalNavigation.js';
import {draftProposal,proposalEmailHtml,SAMPLE_PROSPECTS} from '../lib/commercial-design.mjs';

test('commercial access requires a verified identity from exactly the two permitted accounts',()=>{
 for(const email of ['r.pereszczako@sky.com','info@rpgexcellence.com',' INFO@RPGEXCELLENCE.COM '])assert.equal(commercialAccess({id:'user',email,email_confirmed_at:'2026-11-12'}),true);
 for(const user of [null,{id:'user',email:'info@rpgexcellence.com'},{email:'info@rpgexcellence.com',email_confirmed_at:'2026-11-12'},{id:'other',email:'other@example.com',email_confirmed_at:'2026-11-12',role:'admin',user_metadata:{email:'info@rpgexcellence.com'}}])assert.equal(commercialAccess(user),false);
});
test('commercial navigation is absent by default and only appears for an authorised group',()=>{
 assert.equal(navigationForAccess(null).some(g=>g.id==='commercial'),false);
 assert.equal(navigationForAccess({groups:['dashboard'],platformAdministrator:true}).some(g=>g.id==='commercial'),false);
 assert.equal(navigationForAccess({groups:['commercial']}).some(g=>g.href==='/portal/marketing'),true);
});
test('service draft generation uses provided context without claiming established customer facts',()=>{
 const draft=draftProposal({company:'Example Company',contact:'Alex Morgan',serviceId:'qhse',need:'Whether inspection support could help.'});
 assert.match(draft.subject,/Example Company/);
 assert.match(draft.body,/Hello Alex/);
 assert.match(draft.body,/Whether inspection support could help/);
 assert.match(draft.body,/Risk assessments/);
 assert.doesNotMatch(draft.body,/as agreed|your audit failed/i);
});
test('branded HTML escapes untrusted draft content and preserves readable paragraphs',()=>{
 const html=proposalEmailHtml({body:'Hello <script>alert(1)</script>\nNew line\n\nNext paragraph'});
 assert.doesNotMatch(html,/<script>/);
 assert.match(html,/&lt;script&gt;/);
 assert.match(html,/<br>New line/);
 assert.match(html,/role="presentation"/);
 assert.match(html,/rpg-report-logo.png/);
 assert.ok(SAMPLE_PROSPECTS.every(p=>p.email.endsWith('.example')&&p.source==='Fictional design example'));
});
