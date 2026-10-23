export const CALENDAR_OPEN_STATES=Object.freeze(['draft','planned','due','in_progress','awaiting_review','actions_open','awaiting_verification']);
export function calendarDate(value) {
 if(!value)return null;
 const date=new Date(value);
 return Number.isFinite(date.getTime())?date.toISOString().slice(0,10):null;
}
export function calendarMonth(value) {
 const month=String(value || '').slice(0,7);
 if(!/^(19|20|21)\d{2}-(0[1-9]|1[0-2])$/.test(month))throw new Error('Choose a month between 1900 and 2199.');
 return month;
}
export function moveCalendarMonth(value,offset) {
 const month=calendarMonth(value), date=new Date(month+'-01T00:00:00Z');
 date.setUTCMonth(date.getUTCMonth()+offset);
 return calendarMonth(date.toISOString());
}
export function inspectionCalendarDays(month) {
 const first=new Date(calendarMonth(month)+'-01T00:00:00Z');
 const start=new Date(first);start.setUTCDate(1-(first.getUTCDay()+6)%7);
 return Array.from({length:42},(_,index)=>{const date=new Date(start);date.setUTCDate(start.getUTCDate()+index);const key=date.toISOString().slice(0,10);return {key,day:date.getUTCDate(),current:key.startsWith(month)};});
}
export function buildInspectionCalendarEvents({programmes=[],inspections=[],actions=[]}={}) {
 const live=inspections.filter(row=>CALENDAR_OPEN_STATES.includes(row.status));
 const records=new Map(inspections.map(row=>[row.id,row]));
 const events=[
  ...live.map(row=>({id:'i-'+row.id,recordId:row.id,type:'inspection',title:row.title,date:calendarDate(row.planned_start_at),band:row.planning_risk_band || 'routine',status:row.status,location:row.administration_location_label,leadId:row.lead_inspector_person_id})),
  ...programmes.filter(row=>row.status==='active'&&!live.some(i=>i.programme_id===row.id&&calendarDate(i.planned_start_at)===calendarDate(row.next_inspection_date))).map(row=>({id:'p-'+row.id,recordId:row.id,type:'programme',title:row.title,date:calendarDate(row.next_inspection_date),band:row.risk_band || 'routine',status:'programme_due',location:row.administration_location_label,leadId:row.lead_inspector_person_id})),
  ...actions.filter(row=>!['closed','cancelled'].includes(row.status)&&records.has(row.inspection_id)&&records.get(row.inspection_id).status!=='cancelled').map(row=>({id:'a-'+row.id,recordId:row.inspection_id,type:'action',title:row.action_text || row.action_reference || 'Inspection action',date:calendarDate(row.target_date),band:row.priority || 'medium',status:row.status,location:records.get(row.inspection_id).administration_location_label,leadId:row.responsible_person_id})),
 ];
 return events.filter(e=>e.date).sort((a,b)=>a.date.localeCompare(b.date)||a.type.localeCompare(b.type)||a.id.localeCompare(b.id));
}
export function eventsForMonth(events,month){return events.filter(e=>e.date.startsWith(calendarMonth(month)));}
export function nextCalendarEvent(events,date){return events.find(e=>e.date>=date)||null;}
