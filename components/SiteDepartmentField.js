"use client";
import {useState} from "react";
import {departmentsForSite} from "../lib/site-departments.mjs";
export default function SiteDepartmentField({departments=[],siteId,name="department_id",initialName="",required=false}) {
 const options=departmentsForSite(departments,siteId);
 const [selection,setSelection]=useState(()=>({siteId,id:options.find(d=>d.name===initialName)?.id||""}));
 const id=selection.siteId===siteId && options.some(d=>d.id===selection.id)?selection.id:"";
 return <label className="azs-label mcField">Department{required?" *":""}<select name={name} required={required} disabled={!siteId} value={id} onChange={e=>setSelection({siteId,id:e.target.value})}><option value="">{!siteId?"Select a site first":options.length?"Select controlled department":"No active departments assigned to this site"}</option>{options.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}</select><small>Managed under <a href="/portal/company/departments">Administration → Departments</a>.</small></label>;
}
