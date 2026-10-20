'use server';
import {loadPPECandidate,loadZonePPE} from '../../../../lib/zone-ppe';
import {siteToday} from '../../../../lib/zone-policy.mjs';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { siteZoneContext, zoneRoot, unwrap } from '../../../../lib/site-zones';
import {validateSafetySigns} from '../../../../lib/safety-signs.mjs';
import { UUID } from '../../../../lib/zone-policy.mjs';
const text=(fd,key,max=3000)=>{const value=String(fd.get(key)||'').trim();if(value.length>max)throw new Error(`${key.replaceAll('_',' ')} is too long.`);return value;};
const identifier=(fd,key)=>{const value=text(fd,key,80);if(!UUID.test(value))throw new Error('Invalid location or person identifier.');return value;};
const selections=(fd,key)=>{const ids=[...new Set(fd.getAll(key).map(String))];if(ids.some(id=>!UUID.test(id)))throw new Error('Invalid linked record.');return ids;};
export async function createBuilding(_state,fd) {
 try {
  const siteId=identifier(fd,'site_id'); const {admin,access,site}=await siteZoneContext(siteId);
  if(site.status!=='active')throw new Error('Activate the site before adding buildings.');
  const name=text(fd,'name',120);if(!name)throw new Error('Enter a building name.');
  const result=await admin.from('organization_buildings').insert({organization_id:access.organization.id,site_id:siteId,name});
  if(result.error)throw new Error(result.error.code==='23505'?'This building already exists.':result.error.message);
  revalidatePath(zoneRoot(siteId));return {success:'Building created.'};
 }catch(error){if(error.digest)throw error;return {error:error.message};}
}
export async function saveZone(_state,fd) {
 let destination;
 try {
  const siteId=identifier(fd,'site_id'), id=text(fd,'id',80)||null;
  if(id&&!UUID.test(id))throw new Error('Invalid zone.');
  const {admin,access}=await siteZoneContext(siteId);
  const name=text(fd,'name',160), reference=text(fd,'reference',40).toUpperCase();
  if(!name||!reference)throw new Error('Enter a zone name and reference.');
  const values={name,reference,building_id:text(fd,'building_id',80),owner_person_id:identifier(fd,'owner_person_id'),deputy_person_id:text(fd,'deputy_person_id',80),floor_level:text(fd,'floor_level',120),description:text(fd,'description'),restriction:text(fd,'restriction'),key_controls:text(fd,'key_controls'),emergency_information:text(fd,'emergency_information'),access_mode:text(fd,'access_mode',20),status:text(fd,'status',20),show_owner:fd.get('show_owner')==='on',show_inspections:fd.get('show_inspections')==='on',show_assessments:fd.get('show_assessments')==='on'};
  if(!['company','link'].includes(values.access_mode)||!['draft','published','archived'].includes(values.status))throw new Error('Choose a valid access mode and publication status.');
  if(values.access_mode==='link'&&values.status==='published'&&fd.get('confirm_public')!=='on')throw new Error('Confirm the selected information can be published to anyone with the link.');
  const assessmentIds=selections(fd,'assessment_ids');
  if(fd.has('ppe_source_mode'))values.ppe_source_mode=text(fd,'ppe_source_mode',20);
  if(values.ppe_source_mode==='assessment'&&values.status==='published'){try{const raw=String(fd.get('ppe_expected')||'null');if(raw.length>500000)throw Error();values.ppe_expected=JSON.parse(raw);}catch{throw Error('Refresh the PPE preview before publishing.');}}
  if(fd.has('safety_signs')) {
  let input;try{const raw=String(fd.get('safety_signs')||'[]');if(raw.length>16000)throw new Error();input=JSON.parse(raw);}catch{throw new Error('Invalid safety-sign selection.');}
  const sourceRows=assessmentIds.length?unwrap(await admin.from('hs_risk_assessments').select('id,status,version').eq('organization_id',access.organization.id).eq('administration_location_id',siteId).in('id',assessmentIds)):[];
  values.safety_signs=validateSafetySigns(input,sourceRows,values.status==='published');
  values.signs_review_date=text(fd,'signs_review_date',10)||null;
  values.confirm_signs=fd.get('confirm_signs')==='on';
  }
  const {data,error}=await admin.rpc('save_organization_zone',{p_org:access.organization.id,p_actor:access.user.id,p_site:siteId,p_id:id,p_version:Number(fd.get('version'))||0,p_values:values,p_assessments:assessmentIds,p_programmes:selections(fd,'programme_ids'),p_inspections:selections(fd,'inspection_ids')});
  if(error)throw new Error(error.code==='23505'?'That zone reference already exists at this site.':error.message);
  revalidatePath(zoneRoot(siteId),'layout'); revalidatePath('/area','layout');
  revalidatePath('/portal/health-safety/workplace-inspections','layout');
  destination=`${zoneRoot(siteId)}/${data}?saved=1`;
 } catch(error) {if(error.digest)throw error;return {error:error.message};}
 redirect(destination);
}
export async function updateZoneConcern(_state,fd) {
 try {
  const siteId=identifier(fd,'site_id'),zoneId=identifier(fd,'zone_id'),id=identifier(fd,'concern_id');
  const {admin,access}=await siteZoneContext(siteId);
  const zones=unwrap(await admin.from('organization_zones').select('id').eq('id',zoneId).eq('organization_id',access.organization.id).eq('site_id',siteId));
  if(!zones.length)throw new Error('Zone not found.');
  const status=text(fd,'status',20),resolution=text(fd,'resolution');
  if(!['open','in_progress','closed'].includes(status))throw new Error('Invalid status.');
  if(status==='closed'&&resolution.length<10)throw new Error('Record how the concern was addressed before closing it.');
  const rows=unwrap(await admin.from('organization_zone_concerns').update({status,resolution,updated_at:new Date().toISOString(),updated_by:access.user.id}).eq('id',id).eq('zone_id',zoneId).eq('organization_id',access.organization.id).select('id'));
  if(!rows.length)throw new Error('Concern not found.');
  revalidatePath(`${zoneRoot(siteId)}/${zoneId}`);return {success:'Concern updated.'};
 }catch(error){if(error.digest)throw error;return {error:error.message};}
}

export async function confirmZonePosterDisplayed(_state,fd) {
 try {
  const siteId=identifier(fd,'site_id'),zoneId=identifier(fd,'zone_id');
  const {admin,access,site}=await siteZoneContext(siteId);
  const zone=unwrap(await admin.from('organization_zones').select('*').eq('id',zoneId).eq('organization_id',access.organization.id).eq('site_id',siteId))[0];
  if(!zone||site.status!=='active')throw Error('Zone unavailable.');
  if((await loadZonePPE(admin,zone,site)).needsReview)throw Error('Review the assessment-derived PPE before confirming a poster revision.');
  if(fd.get('confirm_displayed')!=='on')throw new Error('Confirm that current physical posters have been displayed.');
  const revision=Number(fd.get('poster_revision'));
  if(!Number.isInteger(revision)||revision<1)throw new Error('Invalid poster revision.');
  const rows=unwrap(await admin.from('organization_zones').update({poster_displayed_revision:revision,poster_displayed_at:new Date().toISOString(),poster_displayed_by:access.user.id}).eq('id',zoneId).eq('organization_id',access.organization.id).eq('site_id',siteId).eq('status','published').eq('poster_revision',revision).select('id'));
  if(!rows.length)throw new Error('The zone changed. Reload and display the current revision before confirming.');
  revalidatePath(`${zoneRoot(siteId)}/${zoneId}`);return {success:`Poster revision ${revision} recorded as displayed.`};
 }catch(error){if(error.digest)throw error;return {error:error.message};}
}

export async function previewZonePPE(siteId,zoneId,assessmentIds) {
 try {
  const {admin,access,site}=await siteZoneContext(siteId);
  if(zoneId&&!UUID.test(zoneId))throw Error('Invalid zone.');
  if(!Array.isArray(assessmentIds)||assessmentIds.length>500||assessmentIds.some(id=>!UUID.test(id)))throw Error('Invalid assessment links.');
  return {candidate:await loadPPECandidate(admin,{organizationId:access.organization.id,siteId,zoneId:zoneId||null,assessmentIds,today:siteToday(site.timezone)})};
 }catch(error){if(error.digest)throw error;return {error:error.message};}
}
