"use client";
import Link from 'next/link';
import {useActionState,useEffect,useMemo,useState} from 'react';
import {useRouter} from 'next/navigation';
import {buildInspectionCalendarEvents,inspectionCalendarDays,calendarMonth,moveCalendarMonth,eventsForMonth,nextCalendarEvent} from '../lib/workplace-inspection-calendar.mjs';
import {EDITABLE_APPOINTMENTS} from '../lib/workplace-inspection-policy.mjs';
const ROOT='/portal/health-safety/workplace-inspections';
const kind={inspection:'Inspection',programme:'Programme due',action:'Action due'};
const words=value=>String(value || '').replaceAll('_',' ');
const dateLabel=value=>new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'}).format(new Date(value+'T00:00:00Z'));
const monthLabel=value=>new Intl.DateTimeFormat('en-GB',{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(value+'-01T00:00:00Z'));
function PersonOptions({people,current}) {
 return <>{!people.some(p=>p.id===current&&p.account_status==='active')?<option value={current} disabled>Current appointment — select active user</option>:null}{people.filter(p=>p.account_status==='active').map(p=><option key={p.id} value={p.id}>{p.label}</option>)}</>;
}
function InspectionEditor({inspection,people,action,onSaved}) {
 const [state,formAction,pending]=useActionState(action,null);
 const [start,setStart]=useState(inspection.planned_start_at?.slice(0,16)||'');
 const [end,setEnd]=useState(inspection.planned_end_at?.slice(0,16)||'');
 useEffect(()=>{if(state?.success)onSaved(state.success,start.slice(0,10));},[state]);
 function changeStart(value){
  const duration=new Date(end+':00Z')-new Date(start+':00Z');
  if(value&&Number.isFinite(duration)&&duration>0){const next=new Date(new Date(value+':00Z').getTime()+duration);if(Number.isFinite(next.getTime()))setEnd(next.toISOString().slice(0,16));}
  setStart(value);
 }
 return <form action={formAction} className="wibEditForm" aria-label="Edit scheduled inspection">
  <h4>Edit inspection details</h4><p>Changes apply to this record. Existing answers and evidence are retained.</p>
  <input type="hidden" name="inspection_id" value={inspection.id}/><input type="hidden" name="expected_updated_at" value={inspection.updated_at}/>
  <label>Inspection title<input name="title" defaultValue={inspection.title} required maxLength={180}/></label>
  <div className="wibEditPair"><label>Planned start (UTC)<input name="planned_start" type="datetime-local" required value={start} onChange={e=>changeStart(e.target.value)}/></label><label>Planned end (UTC)<input name="planned_end" type="datetime-local" required value={end} onChange={e=>setEnd(e.target.value)}/></label></div>
  {[['lead_inspector_person_id','Lead inspector / assessor'],['accountable_person_id','Accountable owner'],['reviewer_person_id','Independent reviewer']].map(([key,label])=><label key={key}>{label}<select name={key} required defaultValue={inspection[key]}><PersonOptions people={people} current={inspection[key]}/></select></label>)}
  <label>Inspection scope<textarea name="scope" rows={3} defaultValue={inspection.scope || ''} maxLength={3000}/></label>
  <label>Reason for change<textarea name="change_reason" rows={2} required maxLength={2000} placeholder="Explain the scheduling or appointment change."/></label>
  <p>The reviewer must remain independent. Changes while awaiting review require fieldwork resubmission.</p>
  {state?.error?<div className="wibNotice error" role="alert">{state.error}</div>:null}
  <button type="submit" className="wibSave" disabled={pending}>{pending?'Saving…':'Save inspection changes'}</button>
 </form>;
}
export default function WorkplaceInspectionCalendar({programmes=[],inspections=[],actions=[],people=[],canAdminister=false,updateAction,today}) {
 const router=useRouter();
 const [month,setMonth]=useState(today.slice(0,7)),[selectedDate,setSelectedDate]=useState(null),[selectedId,setSelectedId]=useState(null),[filter,setFilter]=useState('all'),[notice,setNotice]=useState('');
 const events=useMemo(()=>buildInspectionCalendarEvents({programmes,inspections,actions}),[programmes,inspections,actions]);
 const filtered=events.filter(e=>filter==='all'||e.type===filter);
 const days=inspectionCalendarDays(month),monthEvents=eventsForMonth(filtered,month),next=nextCalendarEvent(filtered,today);
 const dayEvents=filtered.filter(e=>e.date===selectedDate);
 const priorities=filtered.filter(e=>e.date>=today).slice(0,8);
 const selected=events.find(e=>e.id===selectedId);
 const record=selected?.type==='inspection'?inspections.find(i=>i.id===selected.recordId):null;
 function changeMonth(value){try{setMonth(calendarMonth(value));setSelectedDate(null);setSelectedId(null);setNotice('');}catch{}}
 function chooseEvent(event){setMonth(event.date.slice(0,7));setSelectedDate(event.date);setSelectedId(event.id);setNotice('');}
 function saved(message,date){setNotice(message);setMonth(date.slice(0,7));setSelectedDate(date);router.refresh();}
 const leadName=id=>people.find(p=>p.id===id)?.label||'Company User unavailable';
 const recordLink=e=>e.type==='programme'?ROOT+'/programmes/'+e.recordId:ROOT+'/'+e.recordId+(e.type==='action'?'#inspection-review-actions':'');
 return <>
 <div className="wibCalendarTools"><div className="wibLegend"><span><i className="inspection"/>Scheduled record</span><span><i className="programme"/>Programme due</span><span><i className="action"/>Action deadline</span></div><label className="wibFilter">Show<select aria-label="Calendar event type" value={filter} onChange={e=>{setFilter(e.target.value);setSelectedId(null);}}><option value="all">All inspection activity</option><option value="inspection">Scheduled records</option><option value="programme">Programme dates</option><option value="action">Action deadlines</option></select></label></div>
 {notice?<div className="wibNotice" role="status">{notice}</div>:null}
 <div className="wibLayout">
 <div className="wibCalendar">
  <div className="wibMonth"><div className="wibMonthTitle" aria-live="polite">{monthLabel(month)}</div><div className="wibMonthNav"><button type="button" aria-label="Previous month" disabled={month==='1900-01'} onClick={()=>changeMonth(moveCalendarMonth(month,-1))}>‹</button><button type="button" onClick={()=>changeMonth(today.slice(0,7))}>Today</button><button type="button" aria-label="Next month" disabled={month==='2199-12'} onClick={()=>changeMonth(moveCalendarMonth(month,1))}>›</button></div></div>
  <div className="wibJump"><label>Go to month<input type="month" aria-label="Go to month" min="1900-01" max="2199-12" value={month} onChange={e=>changeMonth(e.target.value)}/></label>{next?<button type="button" onClick={()=>chooseEvent(next)}>Next scheduled: {dateLabel(next.date)} →</button>:null}</div>
  <div className="wibWeek">{['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(day=><span key={day}>{day}</span>)}</div>
  <div className="wibDays">{days.map(day=>{const items=filtered.filter(e=>e.date===day.key);return <div className={'wibDay '+(!day.current?'muted ':'')+(items.length?'hasEvents ':'')+(day.key===selectedDate?'selected ':'')+(day.key===today?'today':'')} key={day.key}>
   <button type="button" className="wibDayNumber" aria-label={dateLabel(day.key)+', '+items.length+' scheduled items'} aria-pressed={selectedDate===day.key} aria-current={day.key===today?'date':undefined} onClick={()=>{setSelectedDate(day.key);setSelectedId(null);}}>{day.day}{items.length?<b>{items.length}</b>:null}</button>
   {items.slice(0,3).map(event=><button type="button" title={kind[event.type]+': '+event.title+' — '+words(event.status)} aria-label={kind[event.type]+': '+event.title} onClick={()=>chooseEvent(event)} className={'wibDot '+event.type+' '+event.band} key={event.id}>{event.title}</button>)}
   {items.length>3?<button className="wibMore" type="button" onClick={()=>{setSelectedDate(day.key);setSelectedId(null);}}>+{items.length-3} more</button>:null}
  </div>;})}</div>
  <div className="wibCalendarFoot"><span>{monthEvents.length} {monthEvents.length===1?'item':'items'} in {monthLabel(month)} · all times UTC</span>{!monthEvents.length&&next?<button type="button" onClick={()=>chooseEvent(next)}>Show next scheduled work →</button>:null}</div>
 </div>
 <aside className="wibPriorities"><h3>{selectedDate?'Schedule — '+dateLabel(selectedDate):'Next priorities'}</h3>
  {selectedDate?<button type="button" className="wibClear" onClick={()=>{setSelectedDate(null);setSelectedId(null);}}>Show next priorities</button>:null}
  <div className="wibList">{(selectedDate?dayEvents:priorities).map(event=><button type="button" className={'wibItem '+(event.id===selectedId?'active':'')} key={event.id} onClick={()=>chooseEvent(event)}><div><strong>{event.title}</strong><small>{kind[event.type]} · {dateLabel(event.date)} · {words(event.status)}</small><small>{leadName(event.leadId)} · {event.location}</small></div><span className={'wibTag '+(event.date<today?'red':'')}>{event.date<today?'overdue':event.band}</span></button>)}</div>
  {!(selectedDate?dayEvents:priorities).length?<div className="wibEmpty">{selectedDate?'No inspection activity on this date.':'No upcoming inspection activity.'}</div>:null}
  {selected?<section className="wibSelection" aria-label="Selected calendar item"><h4>{selected.title}</h4><p>{kind[selected.type]} · {dateLabel(selected.date)} · {words(selected.status)}</p><p>Lead / owner: {leadName(selected.leadId)} · Priority: {selected.band}</p><Link className="wibRecordLink" href={recordLink(selected)}>Open controlled record →</Link>
   {selected.type==='programme'?<Link className="wibRecordLink" href={recordLink(selected)+'/edit'}>Edit programme defaults →</Link>:null}
   {record&&canAdminister&&EDITABLE_APPOINTMENTS.includes(record.status)?<InspectionEditor key={record.id+record.updated_at} inspection={record} people={people} action={updateAction} onSaved={saved}/>:null}
   {record&&!canAdminister?<p>View-only scheduling. An authorised administrator can amend appointments and dates.</p>:null}
   {record&&canAdminister&&!EDITABLE_APPOINTMENTS.includes(record.status)?<p>Approved or closed record: scheduling details are locked.</p>:null}
  </section>:null}
 </aside>
 </div>
 </>;
}
