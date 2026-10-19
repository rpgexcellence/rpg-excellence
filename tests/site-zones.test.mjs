import test from 'node:test';
import assert from 'node:assert/strict';
import {SAFETY_SIGNS,validateSafetySigns,signsNeedReview,signScopeText} from '../lib/safety-signs.mjs';
const a={id:'assessment-a',status:'approved',version:2};
const ppe={code:'M009',scope:'task',applies_to:'Handling hot trays',instruction:'Use the heat-protective gloves specified in RA-01.',assessment_id:a.id};
test('PPE requires a linked approved assessment and exact task scope',()=>{
 assert.throws(()=>validateSafetySigns([ppe],[],true),/linked approved/);
 assert.throws(()=>validateSafetySigns([{...ppe,applies_to:''}],[a],true),/task or sub-area/);
 const [result]=validateSafetySigns([ppe],[a],true);assert.equal(result.assessment_version,2);assert.equal(signScopeText(result),'Task: Handling hot trays');
});
test('unknown, duplicate and excessive signs are rejected',()=>{
 assert.throws(()=>validateSafetySigns([{...ppe,code:'FAKE'}],[a]),/Unknown/);
 assert.throws(()=>validateSafetySigns([ppe,ppe],[a]),/duplicate/);
 assert.throws(()=>validateSafetySigns(Array(13).fill(ppe),[a]),/12 signs/);
});
test('published signs require an instruction; facility signs do not require an assessment',()=>{
 assert.throws(()=>validateSafetySigns([{...ppe,instruction:''}],[a],true),/specific instruction/);
 assert.equal(validateSafetySigns([{code:'F016',scope:'zone',instruction:'Fire blanket beside the kitchen exit.'}],[],true)[0].assessment_id,null);
});
test('approval expiry, source supersession and version changes require review',()=>{
 const signs=validateSafetySigns([ppe],[a],true),zone={safety_signs:signs,signs_reviewed_by:'reviewer',signs_review_date:'2027-01-01'};
 assert.equal(signsNeedReview(zone,[a],'2026-10-19'),false);
 assert.equal(signsNeedReview(zone,[{...a,status:'superseded'}],'2026-10-19'),true);
 assert.equal(signsNeedReview(zone,[{...a,version:3}],'2026-10-19'),true);
 assert.equal(signsNeedReview(zone,[a],'2027-01-01'),true);
});
test('sign artwork is bundled with provenance and permissive licences',()=>{
 assert.equal(SAFETY_SIGNS.length,26);
 for(const s of SAFETY_SIGNS){assert(s.png.startsWith('iVBOR'));assert(s.source.startsWith('https://commons.wikimedia.org/wiki/'));assert(['Public domain','CC0'].includes(s.license));}
});
