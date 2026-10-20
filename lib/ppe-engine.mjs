import {SAFETY_SIGNS} from './safety-signs.mjs';
export const PPE_TYPES=SAFETY_SIGNS.filter(sign=>sign.category==='mandatory');
const suggestions={Physical:['M004','M008','M009','M014'],Mechanical:['M004','M008','M014'],Chemical:['M004','M009','M010','M017'],Environmental:['M008','M015'],Biological:['M009','M010','M017'],Electrical:['M004','M009','M010','M014'],'Fire / Explosion':['M004','M010','M013'],Radiation:['M004','M010','M019'],'Work at Height':['M014','M008'],'Noise / Vibration':['M003'],Temperature:['M009','M010','M013','M008'],'Confined Space':['M017','M014']};
export const suggestedPPE=category=>suggestions[category]||[];
export function validatePPE(input,{required=false,zoneIds=[]}={}) {
 if(!Array.isArray(input)||input.length>16)throw Error('Select no more than 16 PPE requirements per hazard.');
 if(required&&!input.length)throw Error('Select and specify at least one PPE type, or remove PPE from the control hierarchy.');
 if(!required&&input.length)throw Error('Select PPE in the control hierarchy before adding PPE requirements.');
 return input.map(item=>{
  if(!item||!PPE_TYPES.some(type=>type.code===item.code))throw Error('Select a recognised PPE type.');
  if(!['zone','task','sub_area'].includes(item.scope))throw Error('Specify where the PPE applies.');
  const text=(key,min,max)=>{const value=String(item[key]||'').trim();if(value.length<min||value.length>max)throw Error(`Complete the PPE ${key.replaceAll('_',' ')} (${min}-${max} characters).`);return value;};
  const specification=text('specification',5,160),instruction=text('instruction',5,240),limitations=text('limitations',0,160),applies_to=text('applies_to',item.scope==='zone'?0:3,120);
  if(!Array.isArray(item.zone_ids)||item.zone_ids.some(id=>!zoneIds.includes(id)))throw Error('PPE can only apply to zones linked to this assessment.');
  return {code:item.code,specification,instruction,limitations,scope:item.scope,applies_to,zone_ids:[...new Set(item.zone_ids)].sort()};
 });
}
export function hazardPPEFailures(hazards,zoneIds=null) {
 const failures=[];
 for(const hazard of hazards){try{validatePPE(hazard.ppe_requirements||[],{required:(hazard.control_hierarchy||[]).includes('PPE'),zoneIds:zoneIds||[...new Set((hazard.ppe_requirements||[]).flatMap(item=>item.zone_ids||[]))]});}catch(error){failures.push(`${hazard.hazard_description||'Hazard'}: ${error.message}`);}}
 return failures;
}
export const canonical=value=>JSON.stringify(value,(_key,item)=>item&&typeof item==='object'&&!Array.isArray(item)?Object.fromEntries(Object.keys(item).sort().map(key=>[key,item[key]])):item);
export function ppeNeedsReview(zone,candidate,today) {
 return zone.ppe_source_mode==='assessment'&&(!zone.signs_reviewed_by||!zone.signs_review_date||zone.signs_review_date<=today||(candidate.issues||[]).length>0||canonical(zone.ppe_snapshot||{})!==canonical(candidate));
}
export function ppeScopeText(item){return item.scope==='zone'?'Required throughout this zone':`${item.scope==='task'?'Task':'Sub-area'}: ${item.applies_to}`;}
