import Link from 'next/link';
import WorkplaceInspectionCalendar from './WorkplaceInspectionCalendar';
import {createAdminClient} from '../lib/supabase/admin';
import {requireOrganizationAccess} from '../lib/organization-access';
import {resolveInspectionAccess} from '../lib/workplace-inspection-access';
import {companyPersonLabel} from '../lib/workplace-inspections';
import {buildInspectionCalendarEvents} from '../lib/workplace-inspection-calendar.mjs';
import {updateInspectionDetails} from '../app/portal/health-safety/workplace-inspections/[id]/actions';
import './workplace-inspection-calendar.css';
const ROOT='/portal/health-safety/workplace-inspections';
async function readAll(admin,table,columns,organizationId){
 const rows=[];
 for(let start=0;;start+=500){
  const result=await admin.from(table).select(columns).eq('organization_id',organizationId).order('id').range(start,start+499);
  if(result.error)throw new Error(result.error.message);
  rows.push(...(result.data || []));if((result.data || []).length<500)return rows;
 }
}
export default async function WorkplaceInspectionBoardPanel({organizationId,access:providedAccess}) {
 const base=providedAccess || await requireOrganizationAccess('risk_management','view','/portal/health-safety/management-board');
 if(base.organization?.id!==organizationId)throw new Error('The calendar organisation does not match your authorised workspace.');
 const admin=createAdminClient();
 const access=await resolveInspectionAccess(admin,base);
 const [allProgrammes,inspections,allActions,people]=await Promise.all([
  readAll(admin,'hs_inspection_programmes','id,title,next_inspection_date,risk_band,status,administration_location_label,lead_inspector_person_id',organizationId),
  readAll(admin,'hs_workplace_inspections','id,programme_id,title,scope,planned_start_at,planned_end_at,status,planning_risk_band,administration_location_label,lead_inspector_person_id,accountable_person_id,reviewer_person_id,updated_at',organizationId),
  readAll(admin,'hs_workplace_inspection_actions','id,inspection_id,action_reference,action_text,priority,responsible_person_id,target_date,status',organizationId),
  readAll(admin,'organization_people','id,first_name,last_name,email,account_status',organizationId),
 ]);
 const programmes=allProgrammes.filter(p=>p.status==='active');
 const actions=allActions.filter(a=>!['closed','cancelled'].includes(a.status));
 const today=new Date().toISOString().slice(0,10);
 const overdue=inspections.filter(i=>['planned','due','in_progress'].includes(i.status)&&(i.planned_end_at || i.planned_start_at)?.slice(0,10)<today);
 const overdueActions=actions.filter(a=>a.target_date&&a.target_date<today);
 const critical=buildInspectionCalendarEvents({programmes,inspections,actions}).filter(e=>e.type!=='action'&&e.band==='critical');
 return <section className="wibPanel">
  <header className="wibHead"><div><h2>Workplace Inspection planning</h2><p>Risk-based programme dates, scheduled fieldwork and action escalation.</p></div><Link href={ROOT}>Open Workplace Inspections →</Link></header>
  <div className="wibMetrics"><div className="wibMetric"><span>Active programmes</span><strong>{programmes.length}</strong><small>Recurring controls</small></div><div className="wibMetric"><span>Overdue inspections</span><strong className={overdue.length?'wibRed':'wibGreen'}>{overdue.length}</strong><small>Past planned fieldwork date</small></div><div className="wibMetric"><span>Critical priority</span><strong className={critical.length?'wibRed':'wibGreen'}>{critical.length}</strong><small>Accelerated planning</small></div><div className="wibMetric"><span>Overdue actions</span><strong className={overdueActions.length?'wibAmber':'wibGreen'}>{overdueActions.length}</strong><small>Leadership attention</small></div></div>
  <WorkplaceInspectionCalendar programmes={programmes} inspections={inspections} actions={actions} people={people.map(p=>({id:p.id,label:companyPersonLabel(p),account_status:p.account_status}))} canAdminister={access.canAdministerInspection} updateAction={updateInspectionDetails} today={today}/>
 </section>;
}
