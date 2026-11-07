// Pure read model. Workflow decisions remain in their originating modules.
const CLOSED = new Set(['closed','cancelled','rejected','verified']);
export const assuranceOpen = row => !CLOSED.has(row.status) && !row.closed_at && row.capa_current_stage!=='closed';
const day = value => typeof value==='string' && /^\d{4}-\d{2}-\d{2}/.test(value) ? value.slice(0,10) : '';
export function assetAssurance(d, source) {
 const assets = new Map(d.filtered.map(a=>[a.id,a]));
 const visible = rows => rows.filter(r=>assets.has(r.asset_id));
 const findings=visible(source.findings || []), cases=visible(source.cases || []), mocs=visible(source.mocs || []);
 const openFindings=findings.filter(assuranceOpen), openCases=cases.filter(assuranceOpen), openMocs=mocs.filter(assuranceOpen);
 const actions=visible(source.actions || []).filter(r=>!['verified','cancelled'].includes(r.status));
 const overdueActions=actions.filter(r=>day(r.due_date) && day(r.due_date)<d.today);
 const overdue = rows => rows.filter(r=>day(r.due) && day(r.due)<d.today);
 const awaitingApproval=openMocs.filter(r=>r.status==='approval');
 const awaitingVerification=openCases.filter(r=>r.status==='effectiveness_review' || r.capa_current_stage==='effectiveness_review' || (r.case_type!=='capa' && r.current_discipline===6));
 const mocVerification=openMocs.filter(r=>r.status==='verification');
 const records=d.records || source.maintenance.filter(r=>assets.has(r.asset_id));
 const openWork=records.filter(r=>!['completed','cancelled'].includes(r.status));
 const typeRows = types => openWork.filter(r=>types.includes(r.maintenance_type));
 const calibration=typeRows(['calibration']);
 const inspections=typeRows(['inspection','statutory']);
 const defects=typeRows(['repair','breakdown']);
 const workOverdue=rows=>rows.filter(r=>day(r.scheduled_date) && day(r.scheduled_date)<d.today);
 const upcoming=rows=>rows.filter(r=>day(r.scheduled_date)>=d.today && day(r.scheduled_date)<=d.end);
 const interventions=new Map();
 const add=(assetId, reason, overdue=false, href=null)=>{
  if(!assets.has(assetId))return;
  const item=interventions.get(assetId)||{asset:assets.get(assetId),reasons:[],overdue:false,links:[]};
  if(!item.reasons.includes(reason))item.reasons.push(reason);
  item.overdue ||= overdue;
  if(href && !item.links.some(x=>x.href===href))item.links.push({reason,href});
  interventions.set(assetId,item);
 };
 d.out.forEach(a=>add(a.id,'Out of service'));
 d.maintenanceAttention.filter(i=>['Overdue','Date missing'].includes(i.status)).forEach(i=>add(i.asset.id,i.status==='Overdue'?'Maintenance overdue':'PPM date missing',i.status==='Overdue'));
 openFindings.forEach(r=>add(r.asset_id,`${r.finding_type==='major_nc'?'Major':'Minor'} NC open`,!!day(r.due)&&r.due<d.today,r.href));
 openCases.forEach(r=>add(r.asset_id,'CAPA / 8D open',!!day(r.due)&&r.due<d.today,r.href));
 openMocs.forEach(r=>add(r.asset_id,`MOC: ${r.status.replaceAll('_',' ')}`,!!day(r.due)&&r.due<d.today,r.href));
 overdueActions.forEach(r=>add(r.asset_id,'Corrective action overdue',true,r.href));
 d.filtered.filter(a=>a.calibration_required&&(!a.last_calibration_date||a.calibration_result==='not_assessed')).forEach(a=>add(a.id,'Calibration evidence / result requires review'));
 d.filtered.filter(a=>['out_of_tolerance','conditional'].includes(a.calibration_result)).forEach(a=>add(a.id,'Calibration result requires review',true));
 defects.forEach(r=>add(r.asset_id,'Open repair / breakdown',!!day(r.scheduled_date)&&r.scheduled_date<d.today));
 workOverdue(calibration).forEach(r=>add(r.asset_id,'Calibration job overdue',true));
 workOverdue(inspections).forEach(r=>add(r.asset_id,'Inspection / examination job overdue',true));
 const critical=d.filtered.filter(a=>['critical','high'].includes(a.criticality));
 const criticalAttention=critical.filter(a=>interventions.has(a.id));
 const controlRows=[...calibration,...inspections,...defects].filter(r=>!day(r.scheduled_date)||day(r.scheduled_date)<=d.end).sort((a,b)=>String(a.scheduled_date||'9999').localeCompare(String(b.scheduled_date||'9999')));
 const linkedRows=[...findings,...cases,...mocs].sort((a,b)=>Number(assuranceOpen(b))-Number(assuranceOpen(a)) || String(a.due||'9999').localeCompare(String(b.due||'9999')));
 return {actions,overdueActions,assets,findings,cases,mocs,openFindings,openCases,openMocs,overdueFindings:overdue(openFindings),overdueCases:overdue(openCases),overdueMocs:overdue(openMocs),awaitingApproval,awaitingVerification,mocVerification,calibration,inspections,defects,overdueCalibration:workOverdue(calibration),overdueInspections:workOverdue(inspections),upcomingCalibration:upcoming(calibration),upcomingInspections:upcoming(inspections),critical,criticalAttention,controlRows,linkedRows,interventions:[...interventions.values()].sort((a,b)=>Number(b.overdue)-Number(a.overdue)||Number(['critical','high'].includes(b.asset.criticality))-Number(['critical','high'].includes(a.asset.criticality))||a.asset.asset_reference.localeCompare(b.asset.asset_reference))};
}
