import { randomUUID } from 'node:crypto';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import CompanyDocumentDraftForm from '../../../../components/CompanyDocumentDraftForm';
import { DocumentRecordPanel, DocumentRecordTabButton, DocumentRecordTabs, DocumentPreview, RecordIcon } from '../../../../components/DocumentRecordTabs';
import { loadDocumentFormOptions } from '../../../../lib/company-structure';
import { companyDocumentContext, companyDocumentRows } from '../../../../lib/company-documents';
import { companyDocumentPreviewType } from '../../../../lib/company-document-preview.mjs';
import { documentCommand } from '../actions';
import { awaitingDocumentApproval } from '../DocumentHubOverview';
import s from '../documents.module.css';

export const dynamic = 'force-dynamic';

const root = '/portal/documents';
const name = person => person ? [person.first_name, person.last_name].filter(Boolean).join(' ') || 'Company user' : 'Company user unavailable';
const humanize = value => String(value || '').replaceAll('_', ' ');
const dateTimeFormat = new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Europe/London' });
const dayFormat = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Europe/London' });
const dateTime = value => value ? dateTimeFormat.format(new Date(value)) : '—';
const day = value => value ? dayFormat.format(new Date(value)) : '—';

const historyLabels = new Map([
  ['save', ['Saved', 'green']],
  ['classification_and_scope_saved', ['Classification and scope saved', 'blue']],
  ['create', ['Created', 'blue']],
  ['revise', ['Revision created', 'blue']],
  ['submit', ['Submitted for review', 'amber']],
  ['accept', ['Assignment accepted', 'blue']],
  ['changes_required', ['Changes requested', 'amber']],
  ['recall', ['Recalled to draft', 'amber']],
  ['release', ['Released', 'green']],
  ['acknowledge', ['Acknowledged', 'green']],
  ['withdraw', ['Withdrawn', 'red']],
]);

function HistoryEntry({ event, actor }) {
  const [label, tone] = event.event_type === 'confirm'
    ? [event.details?.role === 'approver' ? 'Approved' : event.details?.role === 'verifier' ? 'Verified' : 'Decision confirmed', 'green']
    : historyLabels.get(event.event_type) ?? [humanize(event.event_type) || 'Document event', 'neutral'];
  return <li>
    <div className={s.recordHistoryHeading}><strong className={s.recordEventBadge} data-tone={tone}>{label}</strong><span>{actor}</span></div>
    <time dateTime={event.created_at}>{dateTime(event.created_at)}</time>
    {event.details?.reason && <p className={s.recordProse}>{event.details.reason}</p>}
  </li>;
}

function statusLabel(document, reviews) {
  return {
    draft: 'Draft',
    in_review: awaitingDocumentApproval(document, reviews) ? 'Awaiting Approval' : 'Under Verification',
    approved: 'Approved for Release',
    current: `Current (v${document.revision})`,
    superseded: 'Superseded',
    withdrawn: 'Withdrawn',
  }[document.status] ?? humanize(document.status);
}

function decisionDate(reviews, role) {
  const assigned = reviews.filter(review => review.role === role);
  if (!assigned.length || assigned.some(review => review.decision !== 'confirmed' || !review.decided_at)) return null;
  return assigned.map(review => review.decided_at).sort().at(-1);
}

function Lifecycle({ document, reviews }) {
  const currentDecisions = document.status === 'draft' ? [] : reviews;
  const verification = decisionDate(currentDecisions, 'verifier');
  const approval = decisionDate(currentDecisions, 'approver');
  const current = document.status === 'current' && document.issued_at;
  const steps = [
    ['Draft prepared', document.created_at, document.status === 'draft' ? 'active' : document.created_at ? 'done' : '', 'Date not recorded'],
    ['Verification (Independent)', verification, verification ? 'done' : '', document.status === 'draft' ? 'Pending submission' : 'Decision not recorded'],
    ['Approval (Independent)', approval, approval ? 'done' : '', verification ? 'Decision not recorded' : 'Pending verification'],
    [current ? 'Released (Current)' : 'Released', document.issued_at, current ? 'released' : document.issued_at ? 'done' : '', 'Pending release'],
    ['Next review', document.review_date, '', 'Not scheduled'],
  ];
  return <section className={s.recordPanel}><h2>Lifecycle &amp; compliance</h2>
    <ol className={s.recordMilestones}>{steps.map(([label, value, state, fallback]) => <li key={label}
      data-state={state} aria-current={['active','released'].includes(state) ? 'step' : undefined}>
      <span className={s.recordMilestone}>{state === 'done' && <RecordIcon name="check"/>}</span>
      <strong>{label}</strong>{value ? <time dateTime={value}>{day(value)}</time> : <span>{fallback}</span>}
    </li>)}</ol>
  </section>;
}

function Operation({ id, command, label, children, danger = false }) {
  return <form action={documentCommand} className={s.form}>
    <input type="hidden" name="document_id" value={id}/><input type="hidden" name="command" value={command}/>
    {children}<button className={`${s.recordButton} ${danger ? s.danger : ''}`} style={{ justifySelf: 'start' }}>{label}</button>
  </form>;
}

function Facts({ entries }) {
  return <dl className={s.recordFacts}>{entries.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>;
}

function Chips({ values, empty }) {
  return values.length ? <div className={s.recordChips}>{values.map(value => <span className={s.recordChip} key={value}>{value}</span>)}</div> : <p className={s.muted}>{empty}</p>;
}

export default async function DocumentPage({ params, searchParams }) {
  const { id } = await params;
  const q = await searchParams;
  const context = await companyDocumentContext();
  const { client, organization, user } = context;
  const { data: d, error } = await client.from('company_documents').select('*').eq('id', id).eq('organization_id', organization.id).maybeSingle();
  if (error || !d) notFound();

  const read = (table, fields, order) => companyDocumentRows(client, table, fields, query => query.eq('document_id', id), order);
  const [reviews, recipients, events, {data: controller, error: controllerError}, options, classificationLinks, siteLinks, departmentLinks] = await Promise.all([
    read('company_document_reviews', '*', ['document_id', 'person_id', 'role']),
    read('company_document_recipients', '*', ['document_id', 'person_id']),
    read('company_document_events', '*', ['created_at', 'id']),
    client.rpc('company_document_controller', { p_org: organization.id }),
    loadDocumentFormOptions(context),
    read('company_document_classifications', 'classification_key', ['classification_key']),
    read('company_document_sites', 'site_id', ['site_id']),
    read('company_document_departments', 'department_id', ['department_id']),
  ]);
  if (controllerError) throw new Error('Document workflow could not be loaded.');

  const people = new Map(options.people.map(person => [person.id, person]));
  const byAccount = new Map(options.people.map(person => [person.user_id, person]));
  const me = options.people.find(person => person.user_id === user.id && person.account_status === 'active' && person.account_type === 'system');
  const isAuthorOwner = d.author_user_id === user.id || d.owner_person_id === me?.id;
  const canEdit = isAuthorOwner || controller;
  const editable = canEdit && d.status === 'draft';
  const mine = !isAuthorOwner && d.status === 'in_review' ? reviews.filter(review => review.person_id === me?.id && !review.decision) : [];
  const acknowledged = recipients.find(recipient => recipient.person_id === me?.id)?.acknowledged_at;
  const verificationComplete = reviews.some(review => review.role === 'verifier') && reviews.filter(review => review.role === 'verifier').every(review => review.decision === 'confirmed');
  const selection = { classifications: classificationLinks.map(row => row.classification_key), sites: siteLinks.map(row => row.site_id), departments: departmentLinks.map(row => row.department_id) };
  const linkedSites = options.sites.filter(site => selection.sites.includes(site.id));
  const linkedDepartments = options.departments.filter(department => selection.departments.includes(department.id));
  const classifications = options.classifications.filter(item => selection.classifications.includes(item.key));
  const standards = classifications.filter(item => item.kind === 'standard').map(item => item.label);
  const families = classifications.filter(item => item.kind !== 'standard').map(item => item.label);
  const file = d.file_path ? (d.file_name || 'Controlled document') : null;
  const canPreview = file && companyDocumentPreviewType(file);
  const preview = `${root}/${id}/preview`;
  const download = `${root}/${id}/download`;
  const status = statusLabel(d, reviews);
  const initial = ['accept', 'confirm', 'submit', 'submitted_for_review', 'changes_required', 'recall', 'release'].includes(q?.saved)
    ? 'approval' : q?.saved === 'acknowledge' ? 'distribution' : typeof q?.error === 'string' && d.status === 'in_review' ? 'approval' : 'overview';
  const details = [
    ['Reference', d.document_number], ['Type', d.document_type], ['Revision', d.revision],
    ['Owner', name(people.get(d.owner_person_id))], ['Next review', day(d.review_date)], ['Published', day(d.issued_at)],
  ];
  const sites = <div className={s.recordChips}>{linkedSites.map(site => <Link className={s.recordChip} key={site.id}
    href={`/portal/company/sites/${site.id}/zones`} title="Open Buildings & Zones"><RecordIcon name="scope"/>{site.site_name}</Link>)}</div>;
  const applicability = <>
    <p>{d.applicability === 'company' ? 'Whole company' : 'Selected sites or departments'}</p>
    {sites}<Chips values={linkedDepartments.map(department => department.name)} empty="No departments specified."/>
    <p className={s.muted}>Recipient access is managed separately under Distribution.</p>
  </>;

  return <main className={`${s.page} ${s.registerPage} ${s.recordPage}`}><div className={s.shell}>
    <p className={s.recordBreadcrumb}><Link href={root}>Document Control Centre</Link> / <Link href={root + '?section=register'}>Document Register</Link> / {d.document_number}</p>
    <header className={`${s.hubHero} ${s.recordHero}`}>
      <div className={s.recordTitle}><span className={s.recordTitleIcon}><RecordIcon name="overview"/></span><div>
        <small>{d.document_number} · REV {d.revision}</small><h1>{d.title}</h1><p>{name(people.get(d.owner_person_id))} · {d.document_type}</p>
      </div></div>
      <div className={s.recordHeaderActions}>
        <span className={s.recordStatus} data-status={d.status}>{d.status === 'current' && <RecordIcon name="check"/>}{status}</span>
        {editable && <><button className={s.recordButton} form="editable-document" name="intent" value="draft">Save Draft</button>
          <button className={s.recordPrimary} form="editable-document" name="intent" value="submit">Submit for Review</button></>}
        {file && <a className={s.recordButton} href={download}><RecordIcon name="download"/>{/\.pdf$/i.test(file) ? 'Download PDF' : 'Download controlled copy'}</a>}
        {canPreview && <a className={s.recordButton} href={preview} target="_blank" rel="noopener noreferrer"><RecordIcon name="open"/>Open</a>}
        <details className={s.recordMenu}><summary className={s.recordButton} aria-label="More document actions"><RecordIcon name="more"/></summary>
          <Link href="/portal/tasks?module=documents">My document tasks</Link><Link href={root + '?section=register'}>Document register</Link>
        </details>
      </div>
    </header>
    {typeof q?.error === 'string' && <div className={s.error} role="alert">{q.error}</div>}
    {typeof q?.saved === 'string' && <div className={s.success} role="status">Document workflow updated: {humanize(q.saved)}.</div>}
    <DocumentRecordTabs key={`${id}:${q?.saved || ''}:${d.updated_at}`} initial={initial}>
      <DocumentRecordPanel name="overview">
        {editable && <p className={s.notice}><strong>Independent verification and approval are required.</strong> <DocumentRecordTabButton name="approval">Review assignments →</DocumentRecordTabButton></p>}
        <div className={s.recordOverview}>
          <section className={s.recordPanel}><h2>Document preview</h2>
            <div className={s.recordFile}><div className={s.recordCover}><RecordIcon name="overview"/><b>{d.document_type}</b><small>Rev {d.revision}</small></div>
              <div><strong>{file || 'No file uploaded'}</strong>
                {canPreview ? <><p className={s.muted}>{/\.docx$/i.test(file) ? 'Text preview · Use the download for the original layout.' : 'Controlled copy · Revision ' + d.revision}</p>
                  <DocumentPreview url={preview} filename={file}/></> : file && <p className={s.muted}>Use the controlled download to read this file.</p>}
              </div>
            </div>
          </section>
          <section className={s.recordPanel}><h2>Document details</h2><Facts entries={details}/></section>
          <Lifecycle document={d} reviews={reviews}/>
        </div>
        <div className={s.recordOverview}>
          <section className={s.recordPanel}><h2>Applicable standards</h2><Chips values={standards} empty="No standards selected."/></section>
          <section className={s.recordPanel}><h2>Operational families</h2><Chips values={families} empty="No families selected."/></section>
          <section className={s.recordPanel}><h2>Applicability</h2>{applicability}</section>
        </div>
        <section className={s.recordPanel}><h2>Purpose and scope</h2><p className={s.recordProse}>{d.description || 'No description recorded.'}</p></section>
      </DocumentRecordPanel>
      {editable ? <CompanyDocumentDraftForm document={d} options={options} reviews={reviews} recipients={recipients} selected={selection}
        requestId={randomUUID()} draftId={id} recordLayout/> : <>
        <DocumentRecordPanel name="details">
          <section className={s.recordPanel}><h2>Document details</h2>
            <Facts entries={[...details, ['Author', name(byAccount.get(d.author_user_id))], ['Review / acknowledgement due', day(d.due_date)], ['File', file || '—']]}/>
          </section>
          <section className={s.recordPanel}><h2>Change control</h2><div className={s.grid}>
            <div><h3>Reason for issue / change</h3><p className={s.recordProse}>{d.change_reason || '—'}</p></div>
            <div><h3>Impact and implementation</h3><p className={s.recordProse}>{d.change_impact || '—'}</p></div>
          </div></section>
        </DocumentRecordPanel>
        <DocumentRecordPanel name="scope">
          <div className={s.grid}><section className={s.recordPanel}><h2>Applicable standards</h2><Chips values={standards} empty="No standards selected."/></section>
            <section className={s.recordPanel}><h2>Operational families</h2><Chips values={families} empty="No families selected."/></section></div>
          <section className={s.recordPanel}><h2>Site and department applicability</h2>{applicability}</section>
          {d.legacy_standard_text && !classifications.length && <p className={s.notice}>Previously recorded classification: {d.legacy_standard_text}</p>}
        </DocumentRecordPanel>
        <DocumentRecordPanel name="approval">
          <div className={s.grid}>{[['verifier','Independent verification'], ['approver','Independent approval']].map(([role, title]) => {
            const assigned = reviews.filter(review => review.role === role);
            return <section className={s.recordPanel} key={role}><h2><RecordIcon name="approval"/> {title}</h2>
              {assigned.length ? <ul className={s.recordDecisions}>{assigned.map(review => <li key={review.person_id}>
                <strong>{name(people.get(review.person_id))}</strong><span>{review.decision ? humanize(review.decision) : review.accepted_at ? 'Accepted · Decision pending' : 'Awaiting acceptance'}</span>
                <small>{review.decided_at ? dateTime(review.decided_at) : review.accepted_at ? 'Accepted ' + dateTime(review.accepted_at) : ''}</small>
                {review.comments && <p className={s.recordProse}>{review.comments}</p>}
              </li>)}</ul> : <p className={s.muted}>No assignments recorded.</p>}
            </section>;
          })}</div>
          {mine.map(review => <section className={s.recordPanel} key={review.role}>
            <h2>Your {review.role} assignment</h2>
            {!review.accepted_at ? <Operation id={id} command="accept" label="Accept this assignment"><input type="hidden" name="role" value={review.role}/></Operation> : <>
              {review.role === 'verifier' || verificationComplete
                ? <Operation id={id} command="confirm" label={review.role === 'verifier' ? 'Confirm verification' : 'Approve this revision'}>
                    <input type="hidden" name="role" value={review.role}/><label>Decision comments *<textarea name="comments" required/></label>
                  </Operation>
                : <p className={s.notice}>All required verifiers must confirm before approval.</p>}
              <details><summary>Return draft for changes</summary><Operation id={id} command="changes_required" label="Return draft for changes" danger>
                <input type="hidden" name="role" value={review.role}/><label>Required changes *<textarea name="comments" required/></label>
              </Operation></details>
            </>}
          </section>)}
          {canEdit && ['in_review', 'approved'].includes(d.status) && <details className={s.recordPanel}><summary>Recall this submission for changes</summary>
            <p className={s.muted}>Recalling returns the revision to Draft and clears its review decisions.</p>
            <Operation id={id} command="recall" label="Recall to Draft" danger><label>Recall reason *<textarea name="comments" required/></label></Operation>
          </details>}
          {d.status === 'approved' && isAuthorOwner
            ? <section className={s.recordPanel}><h2>Release and communicate</h2><p>Release publishes this revision to the selected audience and creates acknowledgement tasks.</p>
                <Operation id={id} command="release" label="Release approved document"/></section>
            : ['draft', 'in_review'].includes(d.status) && <p className={s.notice}>Release is locked until the required independent decisions are recorded.</p>}
        </DocumentRecordPanel>
        <DocumentRecordPanel name="distribution">
          <section className={s.recordPanel}><h2>Distribution and acknowledgement</h2>
            <p>{d.distribution === 'company' ? 'Whole company' : 'Selected company users'}</p>
            {d.status === 'current' && (acknowledged ? <p className={s.success}>You acknowledged this revision on {dateTime(acknowledged)}.</p>
              : d.distribution === 'company' || recipients.some(recipient => recipient.person_id === me?.id)
                ? <Operation id={id} command="acknowledge" label="I have read and understood this revision"><p>Read the released document before confirming your acknowledgement.</p></Operation>
                : <p className={s.muted}>You are not on the acknowledgement distribution list.</p>)}
            {canEdit && recipients.length > 0 && <><h3>Distribution record</h3><ul className={s.recordDecisions}>{recipients.map(recipient => <li key={recipient.person_id}>
              <strong>{name(people.get(recipient.person_id))}</strong><span>{recipient.acknowledged_at ? 'Acknowledged ' + dateTime(recipient.acknowledged_at) : d.status === 'current' ? 'Awaiting acknowledgement' : 'Selected for release'}</span>
            </li>)}</ul></>}
          </section>
        </DocumentRecordPanel>
      </>}
      <DocumentRecordPanel name="history">
        <section className={s.recordPanel}><h2>Revision History</h2>
          {d.previous_document_id && <p><Link href={`${root}/${d.previous_document_id}`}>Open previous revision →</Link></p>}
          <ol className={s.recordHistory}>{events.map(event => <HistoryEntry key={event.id} event={event} actor={name(byAccount.get(event.actor_user_id))}/>)}</ol>
          {!events.length && <p className={s.muted}>No revision events are visible for this record.</p>}
          {d.file_sha256 && <p className={s.recordFingerprint}>Controlled file SHA-256 <code>{d.file_sha256}</code></p>}
        </section>
        {d.status === 'current' && canEdit && <section className={s.recordPanel}><h2>Create a new controlled revision</h2>
          <p>The current document remains published until its replacement completes verification, approval and release.</p>
          <Operation id={id} command="revise" label="Create new revision draft">
            <label>New revision *<input name="revision" required/></label><label>Reason for change *<textarea name="change_reason" required/></label>
            <label>Impact / implementation considerations *<textarea name="change_impact" required/></label>
          </Operation>
        </section>}
        {canEdit && ['draft', 'approved', 'current'].includes(d.status) && <details className={s.recordPanel}><summary>Withdraw document</summary>
          <Operation id={id} command="withdraw" label="Withdraw this revision" danger><label>Withdrawal reason *<textarea name="comments" required/></label></Operation>
        </details>}
      </DocumentRecordPanel>
    </DocumentRecordTabs>
  </div></main>;
}
