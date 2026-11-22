'use client';
import {useActionState,useState} from 'react';
import Link from 'next/link';
import {saveDocumentDraft} from '../app/portal/documents/actions';
import {DOCUMENT_TYPES,DOCUMENT_SERIES} from '../lib/document-form.mjs';
import { DocumentRecordPanel, RecordIcon, useDocumentRecordValidation } from './DocumentRecordTabs';
import s from '../app/portal/documents/documents.module.css';
const personName=p=>[p.first_name,p.last_name].filter(Boolean).join(' ')||'Company user';
function flip(values,id){return values.includes(id)?values.filter(x=>x!==id):[...values,id];}
function ClassificationPicker({ label, items, selected, toggle }) {
 const [search, setSearch] = useState('');
 const query = search.trim().toLowerCase();
 return <div><details className={s.recordPicker}>
   <summary>{label} · {items.filter(item => selected.includes(item.key)).length} selected</summary>
   <label>Find {label.toLowerCase()}<input type="search" value={search} onChange={event => setSearch(event.target.value)}/></label>
   <div className={s.recordPickerList}>{items.map(item =>
     <label key={item.key} className={s.check} hidden={!item.label.toLowerCase().includes(query)}>
       <input type="checkbox" name="classifications" value={item.key} checked={selected.includes(item.key)} onChange={() => toggle(item.key)}/>{item.label}
     </label>)}</div>
 </details><div className={s.recordChips}>{items.filter(item => selected.includes(item.key)).map(item => <button key={item.key} className={s.recordChip} type="button" onClick={() => toggle(item.key)} aria-label={`Remove ${item.label}`}>{item.label} ×</button>)}</div></div>;
}
export default function CompanyDocumentDraftForm({document=null,options,selected={classifications:[],sites:[],departments:[]},reviews=[],recipients=[],requestId,draftId,recordLayout=false}){
 const [state,action,pending]=useActionState(saveDocumentDraft,null);
 const revealInvalid = useDocumentRecordValidation();
 const me=options.me,active=options.people.filter(p=>p.account_status==='active'&&p.account_type==='system'&&p.user_id);
 const [owner,setOwner]=useState(document?.owner_person_id||me?.id||''),[type,setType]=useState(document?.document_type||'Procedure');
 const [classifications,setClassifications]=useState(selected.classifications||[]);
 const [scope,setScope]=useState(document?.applicability||((me?.site_id||me?.department_id)?'selected':'company'));
 const [siteIds,setSiteIds]=useState(document?selected.sites||[]:me?.site_id?[me.site_id]:[]);
 const [departmentIds,setDepartmentIds]=useState(document?selected.departments||[]:me?.department_id?[me.department_id]:[]);
 const [verifiers,setVerifiers]=useState(reviews.filter(r=>r.role==='verifier').map(r=>r.person_id));
 const [approvers,setApprovers]=useState(reviews.filter(r=>r.role==='approver').map(r=>r.person_id));
 const [distribution,setDistribution]=useState(document?.distribution||'selected');
 const [recipientIds,setRecipientIds]=useState(recipients.map(r=>r.person_id));
 const [recipientSite,setRecipientSite]=useState(''),[recipientDepartment,setRecipientDepartment]=useState(''),[recipientSearch,setRecipientSearch]=useState('');
 const candidates=active.filter(p=>p.id!==owner&&p.user_id!==(document?.author_user_id||me?.user_id));
 const shownRecipients=active.filter(p=>(!recipientSite||p.site_id===recipientSite)&&(!recipientDepartment||p.department_id===recipientDepartment)&&personName(p).toLowerCase().includes(recipientSearch.trim().toLowerCase()));
 const applicableDepartments=options.departments.filter(d=>d.status==='active'&&(scope==='company'||d.all_sites||!siteIds.length||d.site_ids.some(id=>siteIds.includes(id))));
 const changedOwner=id=>{setOwner(id);setVerifiers(v=>v.filter(x=>x!==id));setApprovers(v=>v.filter(x=>x!==id));};
 return <form id={recordLayout ? "editable-document" : undefined} action={action} className={s.form} onInvalid={revealInvalid}>
 <input type="hidden" name="document_id" value={document?.id||''}/><input type="hidden" name="expected_updated_at" value={document?.updated_at||''}/><input type="hidden" name="draft_id" value={draftId}/><input type="hidden" name="request_id" value={requestId}/>
 {state?.error?<div className={s.error} role="alert">{state.error}</div>:null}
 <DocumentRecordPanel name="details"><div className={recordLayout ? s.recordPanel : undefined}><h2>Document details</h2> <div className={s.grid}><label>Document number<input readOnly value={document?.document_number||`${options.numbering.company_code}-${DOCUMENT_SERIES[type]}-${'1'.padStart(options.numbering.padding,'0')} (example)`}/><small>Allocated on first save. Revisions retain the same number.</small></label><label>Document title *<input name="title" required maxLength={300} defaultValue={document?.title||''}/></label><label>Document type<select name="document_type" value={type} onChange={e=>setType(e.target.value)}>{DOCUMENT_TYPES.map(t=><option key={t}>{t}</option>)}</select></label><label>Revision *<input name="revision" required maxLength={30} readOnly={Boolean(document)} defaultValue={document?.revision||'1.0'}/></label><label>Document owner *<select name="owner_person_id" value={owner} required onChange={e=>changedOwner(e.target.value)}><option value="">Select linked company user</option>{active.map(p=><option key={p.id} value={p.id}>{personName(p)}</option>)}</select></label><label>Review / acknowledgement due date<input type="date" name="due_date" defaultValue={document?.due_date||''}/></label><label>Next document review<input type="date" name="review_date" defaultValue={document?.review_date||''}/></label></div>
 <label>Description<textarea name="description" defaultValue={document?.description||''}/></label>
<h3>Change control</h3><div className={s.grid}> <label>Reason for issue / controlled change *<textarea name="change_reason" required defaultValue={document?.change_reason||''}/></label><label>Impact and implementation considerations *<textarea name="change_impact" required defaultValue={document?.change_impact||''} placeholder="Affected processes, people, documents, training and implementation"/></label>
 <label>{document?.file_path?'Replace draft file (optional)':'Upload draft file'}<input type="file" name="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.png,.jpg,.jpeg"/></label><small>Supported documents, spreadsheets, presentations and images up to 3 MB. A file is required before releasing a draft for review.</small>
</div></div></DocumentRecordPanel>
 <DocumentRecordPanel name="scope"><div className={recordLayout ? s.recordPanel : undefined}> <h3>Document classification</h3><p className={s.muted}>Tick every applicable standard and family. These selections do not grant access to module records.</p>
 <div className={s.grid}>{[['standard','Standards / criteria'],['family','Operational families'],['continuity','Business Continuity elements']].map(([kind,label]) =>
  <ClassificationPicker key={kind} label={label} items={options.classifications.filter(item => item.kind === kind)} selected={classifications} toggle={key => setClassifications(previous => flip(previous, key))}/>)}</div>
 {document?.legacy_standard_text&&!selected.classifications?.length?<p className={s.notice}>Previously recorded classification: {document.legacy_standard_text}. Review and select the applicable choices above.</p>:null}
 <h3>Site and department applicability</h3><p className={s.muted}>Your linked company profile supplies initial suggestions. Applicability describes the document; the distribution list below controls recipient access.</p><label>Applies to<select name="applicability" value={scope} onChange={e=>setScope(e.target.value)}><option value="company">Whole company</option><option value="selected">Selected sites / departments</option></select></label>
 {scope==='selected'?<div className={s.grid}><fieldset className={s.recordChipGroup}><legend>Applicable sites</legend>{options.sites.filter(site=>site.status==='active').map(site=><label className={s.check} key={site.id}><input type="checkbox" name="sites" value={site.id} checked={siteIds.includes(site.id)} onChange={()=>{const next=flip(siteIds,site.id);setSiteIds(next);setDepartmentIds(v=>v.filter(id=>{const d=options.departments.find(d=>d.id===id);return d&&(d.all_sites||!next.length||d.site_ids.some(s=>next.includes(s)));}));}}/>{site.site_reference} · {site.site_name}</label>)}</fieldset><fieldset className={s.recordChipGroup}><legend>Applicable departments</legend>{applicableDepartments.map(d=><label className={s.check} key={d.id}><input type="checkbox" name="departments" value={d.id} checked={departmentIds.includes(d.id)} onChange={()=>setDepartmentIds(v=>flip(v,d.id))}/>{d.code} · {d.name}</label>)}</fieldset></div>:null}
 <p><Link href="/portal/company/setup?section=departments" target="_blank" rel="noopener noreferrer">Manage company departments and site applicability</Link></p>
</div></DocumentRecordPanel>
 <DocumentRecordPanel name="approval"><div className={recordLayout ? s.recordPanel : undefined}><p className={s.notice}><strong>Release locked.</strong> All required independent decisions must be confirmed before the authorised author or owner can publish this revision.</p> <h3>Independent verification and approval</h3><div className={s.grid}>{[['verifier','Independent verifiers',verifiers,setVerifiers],['approver','Independent approvers',approvers,setApprovers]].map(([role,label,values,set])=><fieldset key={role} className={s.recordAssignment}><legend><RecordIcon name="approval"/>{label}</legend><p className={s.muted}>{values.length ? `${values.length} assigned · Pending submission` : "No independent users assigned"}</p>{candidates.map(p=><label key={p.id} className={s.check}><input type="checkbox" name={role==='verifier'?'verifiers':'approvers'} value={p.id} checked={values.includes(p.id)} onChange={()=>{set(v=>flip(v,p.id));if(role==='verifier')setApprovers(v=>v.filter(x=>x!==p.id));else setVerifiers(v=>v.filter(x=>x!==p.id));}}/>{personName(p)}</label>)}</fieldset>)}</div>{candidates.length<2?<p className={s.notice}>Two additional active company users are needed for independent verification and approval. <Link href="/portal/company/people">Manage company users</Link>. You can save the draft before assigning them.</p>:null}<small>The verifier and approver must be different active users, independent of author and owner. Each accepts and records their own decision.</small>
</div></DocumentRecordPanel>
 <DocumentRecordPanel name="distribution"><div className={recordLayout ? s.recordPanel : undefined}> <h3>Distribution list</h3><label>Released document audience<select name="distribution" value={distribution} onChange={e=>setDistribution(e.target.value)}><option value="selected">Selected company users</option><option value="company">Whole company</option></select></label>
 {distribution==='selected'?<fieldset><legend>Choose recipients ({recipientIds.length} selected)</legend><div className={s.grid}><label>Find recipients<input type="search" value={recipientSearch} onChange={event => setRecipientSearch(event.target.value)}/></label><label>Filter by site<select value={recipientSite} onChange={e=>setRecipientSite(e.target.value)}><option value="">All sites</option>{options.sites.filter(s=>s.status==='active').map(s=><option key={s.id} value={s.id}>{s.site_name}</option>)}</select></label><label>Filter by department<select value={recipientDepartment} onChange={e=>setRecipientDepartment(e.target.value)}><option value="">All departments</option>{options.departments.filter(d=>d.status==='active').map(d=><option key={d.id} value={d.id}>{d.name}</option>)}</select></label></div><div className={s.links}><button type="button" onClick={()=>setRecipientIds(v=>[...new Set([...v,...shownRecipients.map(p=>p.id)])])}>Select all matching</button><button type="button" onClick={()=>setRecipientIds(v=>v.filter(id=>!shownRecipients.some(p=>p.id===id)))}>Clear matching</button></div>{shownRecipients.map(p=><label className={s.check} key={p.id}><input type="checkbox" checked={recipientIds.includes(p.id)} onChange={()=>setRecipientIds(v=>flip(v,p.id))}/>{personName(p)} · {options.departments.find(d=>d.id===p.department_id)?.name||'Department not assigned'} · {options.sites.find(s=>s.id===p.site_id)?.site_name||'Across locations'}</label>)}{recipientIds.map(id=><input key={id} type="hidden" name="recipients" value={id}/>)}</fieldset>:<p className={s.muted}>Release will publish to active company users and create acknowledgement tasks. Future active users can access and acknowledge the current whole-company document.</p>}
</div></DocumentRecordPanel>
 <div className={recordLayout ? s.recordActionBar : s.links}>
  {recordLayout && <strong>Draft · Independent verification and approval required before release</strong>}
  <div className={s.links}><button className={s.recordButton} name="intent" value="draft" disabled={pending}>{pending?'Saving…':'Save Draft'}</button>
  <button className={s.button} name="intent" value="submit" disabled={pending}>Submit for Review</button></div>
 </div>
 </form>;
}
