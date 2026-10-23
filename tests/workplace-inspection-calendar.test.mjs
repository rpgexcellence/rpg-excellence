import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectionCalendarDays,moveCalendarMonth,calendarMonth,buildInspectionCalendarEvents,eventsForMonth,nextCalendarEvent} from '../lib/workplace-inspection-calendar.mjs';
test('calendar navigation crosses years and renders complete Monday-first months',()=>{
 assert.equal(moveCalendarMonth('2026-12',1),'2027-01');assert.equal(moveCalendarMonth('2027-01',-1),'2026-12');
 const days=inspectionCalendarDays('2026-10');assert.equal(days.length,42);assert.equal(days[0].key,'2026-09-28');assert.equal(days.filter(d=>d.current).length,31);
 assert.equal(inspectionCalendarDays('2028-02').filter(d=>d.current).length,29);
 for(const invalid of ['2026-13','not-a-month','1800-01','2200-01'])assert.throws(()=>calendarMonth(invalid));
});
test('planned and review records are highlighted in their own month without duplicate programme markers',()=>{
 const programmes=[{id:'p',title:'Programme',status:'active',next_inspection_date:'2027-01-19'}];
 const inspections=[{id:'i',programme_id:'p',title:'Actual inspection',status:'planned',planned_start_at:'2027-01-19T09:00:00Z',lead_inspector_person_id:'igor'},{id:'review',title:'Review due',status:'awaiting_review',planned_start_at:'2026-11-19T09:00:00Z'},{id:'closed',title:'Closed',status:'completed',planned_start_at:'2026-10-01'}];
 const events=buildInspectionCalendarEvents({programmes,inspections});
 assert.equal(events.length,2);assert.equal(eventsForMonth(events,'2027-01')[0].leadId,'igor');assert.equal(eventsForMonth(events,'2026-10').length,0);assert.equal(nextCalendarEvent(events,'2026-10-23').recordId,'review');
 const updated=buildInspectionCalendarEvents({inspections:[{...inspections[0],planned_start_at:'2027-02-20T09:00:00Z'}]});assert.equal(eventsForMonth(updated,'2027-01').length,0);assert.equal(eventsForMonth(updated,'2027-02').length,1);
});
test('action deadlines retain their parent record and cancelled work is excluded',()=>{
 const events=buildInspectionCalendarEvents({inspections:[{id:'i',status:'actions_open',planned_start_at:'2026-11-01'},{id:'cancelled',status:'cancelled'}],actions:[{id:'a',inspection_id:'i',status:'open',target_date:'2026-11-05',action_text:'Repair guard',responsible_person_id:'igor'},{id:'b',inspection_id:'cancelled',status:'open',target_date:'2026-11-05'},{id:'c',inspection_id:'i',status:'closed',target_date:'2026-11-06'}]});
 assert.equal(events.length,2);assert.equal(events[1].type,'action');assert.equal(events[1].recordId,'i');assert.equal(events[1].leadId,'igor');
});
