import 'server-only';
import {validatePPE} from './ppe-engine.mjs';
export async function readHazardPPE(admin,organizationId,assessmentId,formData,controls) {
 const {data,error}=await admin.from('organization_zone_assessments').select('zone_id').eq('assessment_id',assessmentId);
 if(error)throw Error(error.message);
 let input;try{const raw=String(formData.get('ppe_requirements')||'[]');if(raw.length>100000)throw Error();input=JSON.parse(raw);}catch{throw Error('Invalid PPE requirements. Reload the editor.');}
 return validatePPE(input,{required:controls.includes('PPE'),zoneIds:(data||[]).map(row=>row.zone_id)});
}
