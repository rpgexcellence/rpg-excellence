import {assetCategories,categoryLabel,CATEGORY_BY_ID} from "./asset-catalog";
// Pure calculations shared by the dashboard and its register drill-downs.
// Commercial and company permissions remain enforced by requireAssetAccess.
const first = value => String(Array.isArray(value) ? value[0] || "" : value || "").trim().slice(0,180);
const asDay = value => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : "";
const dayOffset = (day, offset) => new Date(Date.parse(`${day}T12:00:00Z`) + offset*86400000).toISOString().slice(0,10);
export const assetName = person => person ? [person.first_name,person.last_name].filter(Boolean).join(" ") || person.email || "Unassigned" : "Unassigned";
export const assetWords = value => CATEGORY_BY_ID.has(value) ? categoryLabel(value) : String(value || "Unspecified").replaceAll("_"," ").replace(/\b\w/g,letter=>letter.toUpperCase());
export function assetFilters(query = {}) {
 const days = [7,30,90].includes(Number(first(query.days))) ? Number(first(query.days)) : 30;
 return {site:first(query.site),type:first(query.type),owner:first(query.owner),days};
}
export function filterCompanyAssets(assets, query = {}, now = new Date()) {
 const f = assetFilters(query), today = now.toISOString().slice(0,10), end = dayOffset(today,f.days);
 const q=first(query.q).toLowerCase(), status=first(query.status), focus=first(query.focus);
 return assets.filter(a=>{
  if(f.site && (a.site_location_id || "unassigned")!==f.site)return false;
  if(f.type && (a.asset_type || "other")!==f.type && !assetCategories(a).includes(f.type))return false;
  if(f.owner && (a.asset_owner_person_id || "unassigned")!==f.owner)return false;
  if(status && a.operational_status!==status)return false;
  if(q && ![a.asset_reference,a.asset_name,a.site_location_label,a.serial_number].some(v=>String(v||"").toLowerCase().includes(q)))return false;
  const active=a.operational_status==='active', due=asDay(a.next_maintenance_date);
  if(focus==='overdue')return active && a.ppm_required && !!due && due<today;
  if(focus==='due')return active && a.ppm_required && !!due && due>=today && due<=end;
  if(focus==='missing')return active && a.ppm_required && !due;
  if(focus==='calibration_overdue')return a.operational_status!=='retired' && a.calibration_required && !!asDay(a.next_calibration_date) && a.next_calibration_date<today;
  if(focus==='calibration_due')return a.operational_status!=='retired' && a.calibration_required && !!asDay(a.next_calibration_date) && a.next_calibration_date>=today && a.next_calibration_date<=end;
  if(focus==='calibration_missing')return a.operational_status!=='retired' && a.calibration_required && !asDay(a.next_calibration_date);
  if(focus==='active')return active;
  if(focus==='out_of_service')return a.operational_status==='out_of_service';
  return true;
 });
}
export function assetDashboard(assets, maintenance, people, query = {}, now = new Date()) {
 const filters=assetFilters(query), today=now.toISOString().slice(0,10);
 const end=dayOffset(today,filters.days), start=dayOffset(today,-filters.days);
 // KPI and portfolio filters concern the asset population, not only its maintenance date.
 const filtered=filterCompanyAssets(assets,{...filters},now), ids=new Set(filtered.map(a=>a.id));
 const active=filtered.filter(a=>a.operational_status==='active');
 const overdue=filterCompanyAssets(filtered,{focus:'overdue',days:filters.days},now);
 const due=filterCompanyAssets(filtered,{focus:'due',days:filters.days},now);
 const missing=filterCompanyAssets(filtered,{focus:'missing'},now);
 const calibrationOverdue=filterCompanyAssets(filtered,{focus:'calibration_overdue',days:filters.days},now);
 const calibrationDue=filterCompanyAssets(filtered,{focus:'calibration_due',days:filters.days},now);
 const calibrationMissing=filterCompanyAssets(filtered,{focus:'calibration_missing'},now);
 const out=filtered.filter(a=>a.operational_status==='out_of_service');
 const records=maintenance.filter(r=>ids.has(r.asset_id));
 const completed=records.filter(r=>r.status==='completed' && asDay(r.completed_date)>=start && asDay(r.completed_date)<=today);
 const planned=records.filter(r=>r.status==='planned' && asDay(r.scheduled_date)>=today && asDay(r.scheduled_date)<=end);
 const overdueRecords=records.filter(r=>r.status==='planned' && asDay(r.scheduled_date) && asDay(r.scheduled_date)<today);
 const portfolio=Object.entries(filtered.reduce((counts,a)=>{const type=a.asset_type||'other';counts[type]=(counts[type]||0)+1;return counts},{})).sort((a,b)=>b[1]-a[1]);
 const peopleById=new Map(people.map(p=>[p.id,p]));
 const attention=[...overdue,...due,...missing].sort((a,b)=>String(a.next_maintenance_date||'9999').localeCompare(String(b.next_maintenance_date||'9999')));
  // Scheduled work is independent of the recurring PPM frequency on an asset.
 const assetsById=new Map(filtered.map(a=>[a.id,a]));
 const openScheduled=records.filter(r=>r.status==='planned' && asDay(r.scheduled_date) && asDay(r.scheduled_date)<=end);
 const scheduledKeys=new Set(openScheduled.map(r=>`${r.asset_id}:${r.scheduled_date}`));
 const calibrationScheduled=new Set(openScheduled.filter(r=>r.maintenance_type==='calibration').map(r=>`${r.asset_id}:${r.scheduled_date}`));
 const maintenanceAttention=[
  ...[...calibrationOverdue,...calibrationDue,...calibrationMissing].filter(a=>!a.next_calibration_date||!calibrationScheduled.has(`${a.id}:${a.next_calibration_date}`)).map(asset=>({key:`calibration:${asset.id}`,asset,record:null,due:asset.next_calibration_date||null,kind:'Calibration schedule',status:!asset.next_calibration_date?'Date missing':asset.next_calibration_date<today?'Overdue':'Due soon',ownerId:asset.maintenance_owner_person_id||asset.asset_owner_person_id})),
  ...openScheduled.map(record=>({key:`record:${record.id}`,asset:assetsById.get(record.asset_id),record,due:record.scheduled_date,kind:'Scheduled maintenance',status:record.scheduled_date<today?'Overdue':'Planned',ownerId:record.responsible_person_id || assetsById.get(record.asset_id)?.maintenance_owner_person_id || assetsById.get(record.asset_id)?.asset_owner_person_id})),
  ...attention.filter(a=>!a.next_maintenance_date || !scheduledKeys.has(`${a.id}:${a.next_maintenance_date}`)).map(asset=>({key:`ppm:${asset.id}`,asset,record:null,due:asset.next_maintenance_date||null,kind:'Recurring PPM',status:!asset.next_maintenance_date?'Date missing':asset.next_maintenance_date<today?'Overdue':'Due soon',ownerId:asset.maintenance_owner_person_id || asset.asset_owner_person_id})),
 ].sort((a,b)=>String(a.due||'9999').localeCompare(String(b.due||'9999')));
 const siteMap=new Map(assets.map(a=>[a.site_location_id||'unassigned',a.site_location_label||'Unassigned site']));
 const ownerIds=[...new Set(assets.map(a=>a.asset_owner_person_id||'unassigned'))];
 return {filters,today,start,end,filtered,active,overdue,due,missing,calibrationOverdue,calibrationDue,calibrationMissing,out,completed,planned,overdueRecords,portfolio,peopleById,attention,maintenanceAttention,
  sites:[...siteMap].sort((a,b)=>a[1].localeCompare(b[1])),
  types:[...new Set(assets.flatMap(a=>[a.asset_type||'other',...assetCategories(a)]))].sort(),
  owners:ownerIds.map(id=>[id,assetName(peopleById.get(id))]).sort((a,b)=>a[1].localeCompare(b[1]))};
}
export function assetLink(path, filters = {}, extra = {}) {
 const query=new URLSearchParams();
 for(const [key,value] of Object.entries({...assetFilters(filters),...extra}))if(value!=='' && value!=null)query.set(key,String(value));
 return `${path}?${query.toString()}`;
}
