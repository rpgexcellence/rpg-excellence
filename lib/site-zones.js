import 'server-only';
import { notFound, redirect } from 'next/navigation';
import { createAdminClient } from './supabase/admin';
import { getOrganizationAccess } from './organization-access';
import { businessProfileContext } from './businessProfileAccess';
import { UUID, canReadZone, readableAssessment, openAction } from './zone-policy.mjs';

export const ZONES_ROOT = '/portal/company/sites';
export const zoneRoot = siteId => `${ZONES_ROOT}/${siteId}/zones`;
export const personName = p => [p?.first_name,p?.last_name].filter(Boolean).join(' ') || 'Company area owner';
export const displayDate = value => value ? new Intl.DateTimeFormat('en-GB',{dateStyle:'medium',timeZone:'UTC'}).format(new Date(value)) : 'Not recorded';
export function unwrap(result) { if(result.error) throw new Error(result.error.message); return result.data || []; }
export async function siteZoneContext(siteId) {
 const access = await businessProfileContext();
 if (!access.organization || !UUID.test(siteId)) notFound();
 const admin = createAdminClient();
 const sites = unwrap(await admin.from('organization_sites').select('*').eq('id',siteId).eq('organization_id',access.organization.id));
 if (!sites[0]) notFound();
 return {access,admin,site:sites[0]};
}
export async function loadZoneEditor(siteId, zoneId) {
 const context = await siteZoneContext(siteId);
 const {admin,access} = context, org=access.organization.id;
 const results = await Promise.all([
  admin.from('organization_buildings').select('*').eq('organization_id',org).eq('site_id',siteId).order('name'),
  admin.from('organization_people').select('id,first_name,last_name').eq('organization_id',org).eq('account_status','active').order('first_name'),
  admin.from('hs_inspection_programmes').select('id,title,programme_reference,zone_id,status').eq('organization_id',org).eq('administration_location_id',siteId).neq('status','archived'),
  admin.from('hs_workplace_inspections').select('id,title,inspection_reference,zone_id,status').eq('organization_id',org).eq('administration_location_id',siteId).order('created_at',{ascending:false}),
  admin.from('hs_risk_assessments').select('id,title,assessment_reference,status,review_date,version').eq('organization_id',org).eq('administration_location_id',siteId).not('status','in','(archived,superseded)'),
  zoneId ? admin.from('organization_zones').select('*').eq('id',zoneId).eq('organization_id',org).eq('site_id',siteId) : Promise.resolve({data:[]}),
  zoneId ? admin.from('organization_zone_assessments').select('assessment_id').eq('zone_id',zoneId) : Promise.resolve({data:[]}),
 ]);
 const [buildings,people,programmes,inspections,assessments,zones,links]=results.map(unwrap);
 if(zoneId && !zones[0]) notFound();
 return {...context, buildings,people,programmes,inspections,assessments,zone:zones[0]||null,assessmentIds:links.map(x=>x.assessment_id)};
}
export async function requireZonePage(token, preview = false) {
 if(!UUID.test(token)) notFound();
 const admin=createAdminClient();
 const rows=unwrap(await admin.from('organization_zones').select('*').eq('public_token',token));
 const zone=rows[0]; if(!zone) notFound();
 const sites=unwrap(await admin.from('organization_sites').select('site_name,status,timezone').eq('id',zone.site_id).eq('organization_id',zone.organization_id));
 const site=sites[0]; if(!site) notFound();
 const access=await getOrganizationAccess();
 if(!canReadZone({...zone,site_status:site.status},access,preview)) {
  if(zone.status==='published' && site.status==='active' && zone.access_mode==='company' && !access.user) redirect('/portal/login?next='+encodeURIComponent('/area/'+token));
  notFound();
 }
 const building=zone.building_id ? unwrap(await admin.from('organization_buildings').select('name').eq('id',zone.building_id).eq('organization_id',zone.organization_id).eq('site_id',zone.site_id))[0] : null;
 return {admin,zone,site,building,access,preview:preview && zone.status!=='archived' && access.organization?.id===zone.organization_id && (access.isOwner||access.isCompanyAdministrator)};
}
export async function loadZoneSafety(admin, zone) {
 const org=zone.organization_id;
 const [p,i,l] = await Promise.all([
  zone.show_inspections ? admin.from('hs_inspection_programmes').select('id,title,next_inspection_date,status').eq('organization_id',org).eq('zone_id',zone.id).eq('status','active') : {data:[]},
  zone.show_inspections ? admin.from('hs_workplace_inspections').select('id,inspection_reference,title,status,completed_at,planned_start_at,created_at').eq('organization_id',org).eq('zone_id',zone.id).order('created_at',{ascending:false}) : {data:[]},
  zone.show_assessments ? admin.from('organization_zone_assessments').select('assessment_id').eq('zone_id',zone.id) : {data:[]},
 ]);
 const programmes=unwrap(p), inspections=unwrap(i), ids=unwrap(l).map(x=>x.assessment_id);
 const [a,actions] = await Promise.all([
  ids.length ? admin.from('hs_risk_assessments').select('id,title,assessment_reference,status,review_date,version').eq('organization_id',org).eq('administration_location_id',zone.site_id).in('id',ids) : {data:[]},
  inspections.length ? admin.from('hs_workplace_inspection_actions').select('id,inspection_id,target_date,status,priority').eq('organization_id',org).in('inspection_id',inspections.map(x=>x.id)) : {data:[]},
 ]);
 return {programmes,inspections,assessments:unwrap(a).filter(readableAssessment),actions:unwrap(actions).filter(openAction)};
}
export function zoneUrl(token) {
 const origin=process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL;
 if(!origin) throw new Error('Set NEXT_PUBLIC_SITE_URL to your deployed HTTPS website address before generating posters.');
 const url=new URL(origin);
 if(url.protocol!=='https:') throw new Error('The poster website address must use HTTPS.');
 return new URL('/area/'+token,url.origin).href;
}
