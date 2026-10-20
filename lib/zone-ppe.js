import 'server-only';
import {siteToday} from './zone-policy.mjs';
import {ppeNeedsReview} from './ppe-engine.mjs';
export async function loadPPECandidate(admin,{organizationId,siteId,zoneId=null,assessmentIds,today}) {
 let ids=assessmentIds;
 if(!ids){const result=await admin.from('organization_zone_assessments').select('assessment_id').eq('zone_id',zoneId);if(result.error)throw Error(result.error.message);ids=(result.data||[]).map(row=>row.assessment_id);}
 const {data,error}=await admin.rpc('zone_ppe_candidate',{p_org:organizationId,p_site:siteId,p_zone:zoneId,p_assessments:ids,p_today:today});
 if(error)throw Error(error.message);
 return data;
}
export async function loadZonePPE(admin,zone,site) {
 if(zone.ppe_source_mode!=='assessment')return {candidate:null,needsReview:false};
 const today=siteToday(site.timezone),candidate=await loadPPECandidate(admin,{organizationId:zone.organization_id,siteId:zone.site_id,zoneId:zone.id,today});
 return {candidate,needsReview:ppeNeedsReview(zone,candidate,today)};
}
