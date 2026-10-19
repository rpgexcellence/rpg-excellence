import test from 'node:test';
import assert from 'node:assert/strict';
import {canReadZone,readableAssessment,assessmentDue,siteToday} from '../lib/zone-policy.mjs';
const zone={organization_id:'company-a',site_status:'active',status:'published',access_mode:'company'};
const member={user:{id:'employee'},organization:{id:'company-a'}};
const other={user:{id:'employee'},organization:{id:'company-b'}};
test('private zone requires membership in its organisation',()=>{
 assert.equal(canReadZone(zone,null),false);assert.equal(canReadZone(zone,member),true);assert.equal(canReadZone(zone,other),false);
});
test('public link publishes only the published active zone',()=>{
 assert.equal(canReadZone({...zone,access_mode:'link'},null),true);
 for(const status of ['draft','archived'])assert.equal(canReadZone({...zone,access_mode:'link',status},null),false);
 assert.equal(canReadZone({...zone,access_mode:'link',site_status:'inactive'},null),false);
});
test('preview cannot bypass organisation or administrator checks',()=>{
 const draft={...zone,status:'draft'};
 assert.equal(canReadZone(draft,member,true),false);
 assert.equal(canReadZone(draft,{...other,isOwner:true},true),false);
 assert.equal(canReadZone(draft,{...member,isCompanyAdministrator:true},true),true);
 assert.equal(canReadZone({...draft,status:'archived'},{...member,isOwner:true},true),false);
});
test('only approved and communicated assessments can be read',()=>{
 for(const status of ['draft','in_review','superseded','archived','review_due','changes_required'])assert.equal(readableAssessment({status}),false);
 for(const status of ['approved','communicated'])assert.equal(readableAssessment({status}),true);
});
test('due assessments and local dates respect the site calendar',()=>{
 assert.equal(assessmentDue({review_date:'2026-10-19'},'2026-10-19'),true);
 assert.equal(assessmentDue({},'2026-10-19'),false);
 assert.equal(siteToday('Europe/London',new Date('2026-10-19T23:30:00Z')),'2026-10-20');
 assert.equal(siteToday('invalid-zone',new Date('2026-10-19T23:30:00Z')),'2026-10-19');
});
