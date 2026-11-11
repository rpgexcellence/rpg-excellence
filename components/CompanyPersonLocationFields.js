'use client';
import {useState} from 'react';
import Link from 'next/link';
import {LEGACY_PERSON_SITE,personSiteLabel} from '../lib/company-person-site.mjs';
import {LEGACY_DEPARTMENT,departmentApplies} from '../lib/company-person-department.mjs';
export default function CompanyPersonLocationFields({sites=[],departments=[],person=null}) {
 const initialSite=person?.site_id||(!person?.site_id&&person?.site?LEGACY_PERSON_SITE:'');
 const initialDepartment=person?.department_id||(!person?.department_id&&person?.department?LEGACY_DEPARTMENT:'');
 const [site,setSite]=useState(initialSite),[department,setDepartment]=useState(initialDepartment);
 const options=departments.filter(d=>(d.status==='active'&&departmentApplies(d,site))||(d.id===person?.department_id&&site===initialSite));
 return <>
 <label><span>Site / location</span><select name="site_id" value={site} onChange={e=>{const value=e.target.value;setSite(value);const d=departments.find(d=>d.id===department);if(department===LEGACY_DEPARTMENT||(d&&!departmentApplies(d,value)))setDepartment('');}}><option value="">Not assigned / works across locations</option>{initialSite===LEGACY_PERSON_SITE?<option value={LEGACY_PERSON_SITE}>Previously recorded: {person.site}</option>:null}{sites.filter(s=>s.status==='active'||s.id===person?.site_id).map(s=><option key={s.id} value={s.id}>{personSiteLabel(s)}{s.status!=='active'?' (inactive)':''}</option>)}</select><small><Link href="/portal/company/setup?section=locations" target="_blank" rel="noopener noreferrer">Manage company locations</Link></small></label>
 <label><span>Applicable department</span><select name="department_id" value={department} onChange={e=>setDepartment(e.target.value)}><option value="">Not assigned</option>{initialDepartment===LEGACY_DEPARTMENT?<option value={LEGACY_DEPARTMENT}>Previously recorded: {person.department} - review link</option>:null}{options.map(d=><option key={d.id} value={d.id}>{d.code} · {d.name}{d.status!=='active'?' (inactive)':''}</option>)}</select><small>{site?'Departments applicable to this site.':'Choose a company-wide department, or select a site first.'} <Link href="/portal/company/setup?section=departments" target="_blank" rel="noopener noreferrer">Manage departments</Link>. Location and department do not grant module permissions.</small></label>
 </>;
}
