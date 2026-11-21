import {randomUUID} from "node:crypto";
import CompanyDocumentDraftForm from "../../../components/CompanyDocumentDraftForm";
import {loadDocumentFormOptions} from "../../../lib/company-structure";
import Link from 'next/link';
import { companyDocumentContext, companyDocumentRows } from '../../../lib/company-documents';
import { createAdminClient } from '../../../lib/supabase/admin';
import { resolvePortalAdminAccess } from '../../../lib/portal-admin-access';
import s from './documents.module.css';
import DocumentRegisterFilter from './DocumentRegisterFilter';
export const metadata={title:'Document Management | RPG Excellence'};
export const dynamic='force-dynamic';

const normalizeName = value => value.trim().replace(/\s+/g, ' ').toLocaleLowerCase('en-GB');
const values = value => new Set((Array.isArray(value) ? value : [value]).filter(Boolean));
const statuses = ['current', 'draft', 'in_review', 'approved', 'superseded', 'withdrawn'].map(value => ({
  value, label: value === 'approved' ? 'Approved for release' : value[0].toUpperCase() + value.slice(1).replaceAll('_', ' '),
}));
const personName = person => [person.first_name, person.last_name].map(name => name?.trim()).filter(Boolean).join(' ');

export default async function DocumentsPage({searchParams}) {
 const q=await searchParams;
 const context=await companyDocumentContext();const {client,organization,user}=context;
 const options=await loadDocumentFormOptions(context);
 const tagLinks=await companyDocumentRows(client,'company_document_classifications','document_id,classification_key',q=>q,['document_id','classification_key']);
 const documents=await companyDocumentRows(client,'company_documents','id,document_number,title,document_type,standard,revision,status,review_date,owner_person_id',q=>q.eq('organization_id',organization.id),['document_number','created_at','id']);
 const {access:rpg}=await resolvePortalAdminAccess({admin:createAdminClient(),user,allowedRoles:['admin','document_controller']});
 const all=documents||[];
 const documentChoices = all.map(d => ({ value: d.id, label: `${d.document_number} · ${d.title} · Rev ${d.revision}` }));
 const accessibleOwners = new Set(all.map(d => d.owner_person_id));
 const ownerChoices = options.people.filter(person => accessibleOwners.has(person.id)).map(person => ({
   value: person.id, label: personName(person),
 })).filter(choice => choice.label).sort((a, b) => a.label.localeCompare(b.label, 'en-GB'));
 const familyLabels = new Map(options.classifications.map(family => [family.key, family.label]));
 for (const d of all) if (d.standard && !familyLabels.has(d.standard)) familyLabels.set(d.standard, d.standard);
 const familyChoices = [...familyLabels].map(([value, label]) => ({ value, label }));
 const selectedDocuments = values(q?.document);
 const selectedOwners = values(q?.owner_id);
 const selectedFamilies = values(q?.family);
 const selectedStatuses = values(q?.status);
 const documentInput = typeof q?.q === 'string' ? q.q.slice(0, 150).trim() : '';
 const ownerInput = typeof q?.owner === 'string' ? q.owner.slice(0, 150).trim() : '';
 const ownerQuery = normalizeName(ownerInput);
 const documentQuery = normalizeName(documentInput);
 const matchingOwners = new Set(ownerQuery ? ownerChoices
   .filter(choice => normalizeName(choice.label).includes(ownerQuery)).map(choice => choice.value) : []);
 const matchingFamilyDocuments = new Set(tagLinks.filter(tag => selectedFamilies.has(tag.classification_key)).map(tag => tag.document_id));
 const visible = all.filter(d =>
   (!selectedDocuments.size || selectedDocuments.has(d.id)) &&
   (!selectedOwners.size || selectedOwners.has(d.owner_person_id)) &&
   (!selectedFamilies.size || selectedFamilies.has(d.standard) || matchingFamilyDocuments.has(d.id)) &&
   (!selectedStatuses.size || selectedStatuses.has(d.status)) &&
   (!documentQuery || normalizeName(`${d.document_number} ${d.title}`).includes(documentQuery)) &&
   (!ownerQuery || matchingOwners.has(d.owner_person_id))
 );
 const hasFilters = Boolean(selectedDocuments.size || selectedOwners.size || selectedFamilies.size || selectedStatuses.size || documentQuery || ownerQuery);
 return <main className={`${s.page} ${s.registerPage}`}><div className={s.shell}>
  <header className={s.header}><div><small className={s.eyebrow}>COMPANY DOCUMENT MANAGEMENT</small><h1>Document Management</h1><p>{organization.name||organization.legal_name||'Your company'} · Controlled documents, independent review and traceable distribution.</p></div><nav className={s.links}>{options.settingsAdmin?<Link href="/portal/documents/settings">Numbering settings</Link>:null}<Link href="/portal/tasks?module=documents">My document tasks</Link>{rpg?<Link href="/portal/rpg-documents/admin">RPG private document administration</Link>:null}<Link href="/portal">Dashboard</Link></nav></header>
  <div className={s.notice}>Standard access for active company users. Drafts are visible to their author, owner, assigned reviewers and document controllers. Released documents follow their distribution scope.</div>
  {q?.error?<div role="alert" className={s.error}>{q.error}</div>:null}
  <section className={s.metrics}>{[['Current',all.filter(d=>d.status==='current').length],['Drafts',all.filter(d=>d.status==='draft').length],['In review',all.filter(d=>d.status==='in_review').length],['Approved for release',all.filter(d=>d.status==='approved').length]].map(([label,count])=><div key={label} className={s.metric}><small>{label}</small><strong>{count}</strong></div>)}</section>
  <section className={s.panel}>
   <h2>Your company document register</h2>
   <form key={JSON.stringify([documentInput, ownerInput, ...[selectedDocuments, selectedOwners, selectedFamilies, selectedStatuses].map(selected => [...selected])])}
     method="get" className={`${s.form} ${s.inline}`}>
    <DocumentRegisterFilter label="Search" name="document" choices={documentChoices} selected={[...selectedDocuments]}
      emptyLabel="All documents" search={{ name: 'q', value: documentInput, placeholder: 'Document number or title' }}/>
    <DocumentRegisterFilter label="Owner" name="owner_id" choices={ownerChoices} selected={[...selectedOwners]}
      emptyLabel="All owners" search={{ name: 'owner', value: ownerInput, placeholder: 'First or last name' }}/>
    <DocumentRegisterFilter label="Family" name="family" choices={familyChoices} selected={[...selectedFamilies]} emptyLabel="All families"/>
    <DocumentRegisterFilter label="Status" name="status" choices={statuses} selected={[...selectedStatuses]} emptyLabel="All accessible records"/>
    <button className={s.button}>Apply</button>
    {hasFilters && <Link className={s.resetFilters} href="/portal/documents">Clear filters</Link>}
   </form>
   {!visible.length?<p className={s.muted}>{hasFilters ? 'No accessible documents match these filters.' : 'No documents available in this view. Create your first company draft below.'}</p>:visible.map(d=><article key={d.id} className={s.row}><div><small>{d.document_number} · Rev {d.revision} · {d.document_type}</small><h3><Link href={`/portal/documents/${d.id}`}>{d.title}</Link></h3><span className={s.muted}>{d.standard||'Company documents'}</span></div><span className={`${s.badge} ${d.status==='current'?s.current:''}`}>{d.status.replaceAll('_',' ')}</span></article>)}
  </section>
  <section className={s.panel}><h2>Create a controlled document</h2><p className={s.muted}>Start a draft. The document change process here is separate from HSE Management of Change. A verifier and an approver must independently confirm before the author or owner can release it.</p><CompanyDocumentDraftForm options={options} requestId={randomUUID()} draftId={randomUUID()}/></section>
 </div></main>;
}
