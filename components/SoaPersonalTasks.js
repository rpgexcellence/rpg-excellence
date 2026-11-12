import Link from "next/link";
import {getOrganizationAccess} from "../lib/organization-access";
import {getPortalAccess} from "../lib/portal-access";
import {createAdminClient} from "../lib/supabase/admin";
import {soaTasks} from "../lib/soa-workflow.mjs";
export default async function SoaPersonalTasks(){
 const ctx=await getOrganizationAccess("information_security","view");
 if(!ctx.allowed||!ctx.organization||!ctx.user)return null;
 const portal=await getPortalAccess(ctx.user);
 if(!portal.workspaceGroups?.includes("isms"))return null;
 const admin=createAdminClient();
 const read=async(makeQuery)=>{const all=[];for(let start=0;;start+=500){const {data,error}=await makeQuery().order("id").range(start,start+499);if(error)throw error;all.push(...data);if(data.length<500)return all;}};
 let tasks=[];
 try{
  const assessments=await read(()=>admin.from("assessments").select("id").eq("organization_id",ctx.organization.id));
  const people=await read(()=>admin.from("organization_people").select("id,user_id").eq("organization_id",ctx.organization.id).eq("account_status","active"));
  const me=people.find(p=>p.user_id===ctx.user.id);
  if(!me)return null;
  const entries=[];
  for(let i=0;i<assessments.length;i+=100)entries.push(...await read(()=>admin.from("assessment_soa_entries").select("*").in("assessment_id",assessments.slice(i,i+100).map(a=>a.id)).eq("organization_id",ctx.organization.id)));
  tasks=soaTasks(entries).filter(t=>(t.assignee===me.id||t.assigneeUserId===ctx.user.id)&&!['verified','cancelled'].includes(t.status));
 }catch{return <section className="soaPersonalTasks"><p role="status">SoA task visibility could not be refreshed. <Link href="/portal/tasks?module=isms">Check My Tasks &amp; Approvals</Link>.</p></section>;}
 return <section className="soaPersonalTasks"><style>{`.soaPersonalTasks{margin:20px 0;padding:22px;background:#fff;border:1px solid #d0deeb;border-radius:13px;color:#143652}.soaPersonalTasks header{display:flex;gap:15px;justify-content:space-between;align-items:center;flex-wrap:wrap}.soaPersonalTasks h2{margin:0;font-size:20px}.soaPersonalTasks ul{list-style:none;padding:0;margin:15px 0 0;display:grid;gap:10px}.soaPersonalTasks li a{display:flex;gap:16px;justify-content:space-between;padding:13px;background:#f2f6fb;border-radius:8px;color:#163c60;text-decoration:none}.soaPersonalTasks small{white-space:nowrap}.soaPersonalTasks p{color:#5a7188}`}</style><header><h2>My SoA actions and reviews · {tasks.length}</h2><Link href="/portal/tasks?module=isms">View in My Tasks &amp; Approvals →</Link></header>{tasks.length?<ul>{tasks.slice(0,5).map(t=><li key={t.id}><Link href={t.href}><span>{t.title}</span><small>{t.due||"No due date"} · {t.status.replaceAll('_',' ')}</small></Link></li>)}</ul>:<p>No outstanding SoA actions or reviews are assigned to you.</p>}</section>;
}
