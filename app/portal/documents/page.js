import Link from 'next/link';
import { companyDocumentContext, companyDocumentRows } from '../../../lib/company-documents';
import { createAdminClient } from '../../../lib/supabase/admin';
import { resolvePortalAdminAccess } from '../../../lib/portal-admin-access';
import { documentCommand } from './actions';
import s from './documents.module.css';
export const metadata={title:'Document Management | RPG Excellence'};
export const dynamic='force-dynamic';
export default async function DocumentsPage({searchParams}) {
 const q=await searchParams;
 const {client,organization,user}=await companyDocumentContext();
 const documents=await companyDocumentRows(client,'company_documents','id,document_number,title,document_type,standard,revision,status,review_date',q=>q.eq('organization_id',organization.id),['document_number','created_at','id']);
 const {access:rpg}=await resolvePortalAdminAccess({admin:createAdminClient(),user,allowedRoles:['admin','document_controller']});
 const all=documents||[];
 const families=[...new Set(all.map(d=>d.standard).filter(Boolean))];
 const visible=all.filter(d=>(!q?.family||d.standard===q.family)&&(!q?.status||d.status===q.status)&&(!q?.q||`${d.document_number} ${d.title}`.toLowerCase().includes(String(q.q).toLowerCase())));
 return <main className={s.page}><div className={s.shell}>
  <header className={s.header}><div><small className={s.eyebrow}>COMPANY DOCUMENT MANAGEMENT</small><h1>Document Management</h1><p>{organization.name||organization.legal_name||'Your company'} · Controlled documents, independent review and traceable distribution.</p></div><nav className={s.links}><Link href="/portal/tasks?module=documents">My document tasks</Link>{rpg?<Link href="/portal/rpg-documents/admin">RPG private document administration</Link>:null}<Link href="/portal">Dashboard</Link></nav></header>
  <div className={s.notice}>Standard access for active company users. Drafts are visible to their author, owner, assigned reviewers and document controllers. Released documents follow their distribution scope.</div>
  {q?.error?<div role="alert" className={s.error}>{q.error}</div>:null}
  <section className={s.metrics}>{[['Current',all.filter(d=>d.status==='current').length],['Drafts',all.filter(d=>d.status==='draft').length],['In review',all.filter(d=>d.status==='in_review').length],['Approved for release',all.filter(d=>d.status==='approved').length]].map(([label,count])=><div key={label} className={s.metric}><small>{label}</small><strong>{count}</strong></div>)}</section>
  <section className={s.panel}><h2>Your company document register</h2><form method="get" className={`${s.form} ${s.inline}`}><label>Search<input name="q" defaultValue={q?.q} placeholder="Document number or title"/></label><label>Family<select name="family" defaultValue={q?.family||''}><option value="">All families</option>{families.map(f=><option key={f}>{f}</option>)}</select></label><label>Status<select name="status" defaultValue={q?.status||''}><option value="">All accessible records</option>{['current','draft','in_review','approved','superseded','withdrawn'].map(x=><option key={x} value={x}>{x.replaceAll('_',' ')}</option>)}</select></label><button className={s.button}>Apply</button></form>
   {!visible.length?<p className={s.muted}>No documents available in this view. Create your first company draft below.</p>:visible.map(d=><article key={d.id} className={s.row}><div><small>{d.document_number} · Rev {d.revision} · {d.document_type}</small><h3><Link href={`/portal/documents/${d.id}`}>{d.title}</Link></h3><span className={s.muted}>{d.standard||'Company documents'}</span></div><span className={`${s.badge} ${d.status==='current'?s.current:''}`}>{d.status.replaceAll('_',' ')}</span></article>)}
  </section>
  <section className={s.panel}><h2>Create a controlled document</h2><p className={s.muted}>Start a draft. The document change process here is separate from HSE Management of Change. A verifier and an approver must independently confirm before the author or owner can release it.</p><form action={documentCommand} className={s.form}><input type="hidden" name="command" value="create"/><div className={s.grid}><label>Document number *<input name="document_number" required maxLength={100}/></label><label>Document title *<input name="title" required maxLength={300}/></label><label>Document type<select name="document_type">{['Procedure','Policy','Form','Guidance','Template','Report','Other'].map(t=><option key={t}>{t}</option>)}</select></label><label>Standard / family<input name="standard" maxLength={150}/></label><label>Revision *<input name="revision" defaultValue="1.0" required maxLength={30}/></label></div><label>Description<textarea name="description"/></label><label>Reason for issue / controlled change *<textarea name="change_reason" required/></label><label>Impact and implementation considerations *<textarea name="change_impact" required placeholder="Affected processes, users, related documents, training and implementation requirements"/></label><button className={s.button} style={{justifySelf:'start'}}>Create draft</button></form></section>
 </div></main>;
}
