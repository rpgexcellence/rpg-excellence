import 'server-only';
import {revalidatePath} from 'next/cache';
import {UUID} from './zone-policy.mjs';
const rows=result=>{if(result.error)throw new Error(result.error.message);return result.data||[];};
export async function loadAssessmentZones(admin,organizationId,assessmentId=null) {
 const [b,z,l]=await Promise.all([
  admin.from('organization_buildings').select('id,site_id,name').eq('organization_id',organizationId).order('name'),
  admin.from('organization_zones').select('id,site_id,building_id,reference,name,status').eq('organization_id',organizationId).order('reference'),
  assessmentId?admin.from('organization_zone_assessments').select('zone_id').eq('assessment_id',assessmentId):{data:[]},
 ]);
 const buildings=rows(b),allZones=rows(z),owned=new Set(allZones.map(zone=>zone.id));
 const selectedZoneIds=rows(l).map(link=>link.zone_id).filter(id=>owned.has(id));
 return {buildings,zones:allZones.filter(zone=>zone.status!=='archived'||selectedZoneIds.includes(zone.id)),selectedZoneIds};
}
function identifiers(values) {
 if(values.length>500||values.some(value=>!UUID.test(value)))throw new Error('Select valid zones from the controlled site.');
 return [...new Set(values)].sort();
}
export function assessmentZoneSelection(formData) {
 if(formData.get('zone_scope_present')!=='1')throw new Error('Reload the assessment form before saving its workplace links.');
 let original;try{original=JSON.parse(String(formData.get('original_zone_ids')||'[]'));}catch{throw new Error('Reload the assessment form before saving its workplace links.');}
 if(!Array.isArray(original))throw new Error('Invalid original zone links. Reload the form.');
 return {zoneIds:identifiers(formData.getAll('zone_ids').map(String)),originalZoneIds:identifiers(original)};
}
export async function saveAssessmentScope(admin,access,{id=null,values,zoneIds=[],originalZoneIds=null,expectedUpdatedAt=null}) {
 const {data,error}=await admin.rpc('save_hs_assessment_scope',{
  p_org:access.organization.id,p_actor:access.user.id,p_id:id,p_values:values,
  p_zone_ids:zoneIds,p_expected_zone_ids:originalZoneIds,p_expected_updated_at:expectedUpdatedAt,
 });
 if(error)throw new Error(error.message);
 return data;
}
export function refreshAssessmentZonePages(siteId,assessmentId) {
 revalidatePath('/portal/company/sites');
 if(UUID.test(String(siteId)))revalidatePath(`/portal/company/sites/${siteId}/zones`);
 revalidatePath('/area/[token]','page');
 revalidatePath('/portal/health-safety/risk-assessment');
 if(assessmentId)revalidatePath(`/portal/health-safety/risk-assessment/${assessmentId}`);
}
