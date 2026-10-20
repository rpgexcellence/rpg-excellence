import catalog from './safety-sign-catalog.json' with {type:'json'};
export const SAFETY_SIGNS=catalog;
export const SIGN_GROUPS=[['warning','Hazard warnings'],['mandatory','Mandatory PPE'],['prohibition','Prohibitions'],['emergency','Emergency facilities'],['fire','Fire equipment']];
export const signDefinition=code=>SAFETY_SIGNS.find(s=>s.code===code);
export function validateSafetySigns(input,assessments=[],published=false) {
 if(!Array.isArray(input)||input.length>12)throw new Error('Choose no more than 12 signs per zone.');
 const codes=new Set();
 return input.map(item=>{
  if(!item||typeof item!=='object'||!signDefinition(item.code)||codes.has(item.code))throw new Error('Unknown or duplicate safety sign.');
  codes.add(item.code);
  if(!['zone','task','sub_area'].includes(item.scope))throw new Error('Choose where each sign applies.');
  const instruction=String(item.instruction||'').trim(),applies_to=String(item.applies_to||'').trim();
  if(instruction.length>240||applies_to.length>120)throw new Error('Safety sign instructions are too long.');
  if(published&&item.scope!=='zone'&&applies_to.length<3)throw new Error('Specify the task or sub-area for each conditional sign.');
  if(published&&instruction.length<5)throw new Error('Give each published sign a specific instruction.');
  const source=assessments.find(a=>a.id===item.assessment_id);
  const approved=source&&['approved','communicated'].includes(source.status);
  if(published&&item.code.startsWith('M')&&!approved)throw new Error('Publishing PPE requirements needs a linked approved risk assessment. Save the zone as a draft first, then create and link the assessment.');
  if(item.assessment_id&&!source)throw new Error('Choose an assessment linked to this zone and controlled site.');
  if(published&&item.assessment_id&&!approved)throw new Error('Choose a linked approved assessment before publishing this sign.');
  return {code:item.code,scope:item.scope,instruction,applies_to,assessment_id:source?.id||null,assessment_version:source?.version||null};
 }).sort((a,b)=>a.code.localeCompare(b.code));
}
export function signScopeText(sign) {return sign.scope==='zone'?'Whole zone':`${sign.scope==='task'?'Task':'Sub-area'}: ${sign.applies_to}`;}
export function signsNeedReview(zone,assessments,today) {
 const signs=zone.safety_signs||[];if(!signs.length)return false;
 return !zone.signs_reviewed_by||!zone.signs_review_date||zone.signs_review_date<=today||signs.some(s=>s.assessment_id&&!assessments.some(a=>a.id===s.assessment_id&&['approved','communicated'].includes(a.status)&&a.version===s.assessment_version));
}
