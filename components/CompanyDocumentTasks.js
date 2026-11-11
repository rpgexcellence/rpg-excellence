import Link from 'next/link';
import { companyDocumentTasks } from '../lib/company-documents';
import { createAdminClient } from '../lib/supabase/admin';
import { getOrganizationAccess } from '../lib/organization-access';
export default async function CompanyDocumentTasks({context=null}) {
 const access=context||await getOrganizationAccess();
 if(!access.organization||!access.user)return null;
 let person=access.person;
 if(!person){const {data}=await createAdminClient().from('organization_people').select('id').eq('organization_id',access.organization.id).eq('user_id',access.user.id).eq('account_status','active').maybeSingle();person=data;}
 const {tasks,error}=await companyDocumentTasks({...access,person});
 const mine=tasks.filter(t=>(person?.id&&t.assignee===person.id)||t.assigneeUserId===access.user.id);
 return <section style={{padding:22,margin:'18px 0',border:'1px solid #d5e1ec',borderRadius:14,background:'#fff',color:'#0b2c50'}}><div style={{display:'flex',justifyContent:'space-between',gap:14,flexWrap:'wrap'}}><h2 style={{margin:0,fontSize:21}}>My document tasks</h2><Link href="/portal/tasks?module=documents">View all document tasks →</Link></div>{error?<p>Document tasks could not be loaded. Open Document Management to check your assignments.</p>:mine.length?<ul style={{lineHeight:1.8,paddingLeft:20}}>{mine.slice(0,5).map(t=><li key={t.id}><Link href={t.href}>{t.title}</Link>{t.due?` · Due ${t.due}`:''}</li>)}</ul>:<p style={{color:'#657b91'}}>No document reviews, releases or acknowledgements are currently assigned to you.</p>}<Link href="/portal/documents">Open company Document Management</Link></section>;
}
