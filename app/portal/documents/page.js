import { randomUUID } from 'node:crypto';
import CompanyDocumentDraftForm from "../../../components/CompanyDocumentDraftForm";
import {loadDocumentFormOptions} from "../../../lib/company-structure";
import Link from 'next/link';
import { companyDocumentContext, companyDocumentRows } from '../../../lib/company-documents';
import { createAdminClient } from '../../../lib/supabase/admin';
import { resolvePortalAdminAccess } from '../../../lib/portal-admin-access';
import s from './documents.module.css';
import DocumentRegisterFilter from './DocumentRegisterFilter';
import DocumentHubLinks from './DocumentHubLinks';
import DocumentHubOverview, { awaitingDocumentApproval, documentReviewDates, reviewAttention } from './DocumentHubOverview';
export const metadata = { title: 'Document Control Centre | RPG Excellence' };
export const dynamic='force-dynamic';

const normalizeName = value => value.trim().replace(/\s+/g, ' ').toLocaleLowerCase('en-GB');
const values = value => new Set((Array.isArray(value) ? value : [value]).filter(Boolean));
const statuses = ['current', 'draft', 'in_review', 'approved', 'superseded', 'withdrawn'].map(value => ({
  value, label: value === 'approved' ? 'Approved for release' : value[0].toUpperCase() + value.slice(1).replaceAll('_', ' '),
}));
const statusChoices = [...statuses, { value: 'awaiting-approval', label: 'Awaiting approval' }];
const personName = person => [person.first_name, person.last_name].map(name => name?.trim()).filter(Boolean).join(' ');

const root = '/portal/documents';
const sectionTitles = {
  register: 'Company document register',
  approvals: 'Approvals',
  reviews: 'Review Schedule',
  obsolete: 'Obsolete Documents',
  reports: 'Reports & KPIs',
  create: 'Create Document',
  links: 'Document Links',
};
const groupings = [['', 'Document register'], ['family', 'By family'], ['standard', 'By standard'], ['department', 'By department'], ['site', 'By site']];
const attentionLabels = { overdue: 'Overdue reviews', undated: 'Current documents without a review date', upcoming: 'Reviews due within 30 days' };
const reviewDateFormat = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

function indexLinks(links, value) {
  const result = new Map();
  for (const link of links) {
    if (!result.has(link.document_id)) result.set(link.document_id, []);
    result.get(link.document_id).push(value ? link[value] : link);
  }
  return result;
}

function DocumentTable({ documents, grouping, groupLabels, ownerLabels, standards, reviewDates, awaitingApproval }) {
  const sections = new Map();
  for (const document of documents) {
    for (const label of grouping ? groupLabels(document) : ['']) {
      if (!sections.has(label)) sections.set(label, []);
      sections.get(label).push(document);
    }
  }
  const groups = [...sections].sort(([a], [b]) => a.localeCompare(b, 'en-GB'));
  return <div className={s.hubTableWrap} role="region" aria-label="Document register records" tabIndex={0}>
    <table className={s.hubTable}>
      <thead><tr>{['Reference', 'Title', 'Category', 'Standard(s)', 'Owner', 'Rev.', 'Status', 'Next review', 'Actions'].map(label =>
        <th scope="col" key={label}>{label}</th>
      )}</tr></thead>
      {groups.map(([group, rows]) => <tbody key={group}>
        {group && <tr className={s.hubGroup}><th scope="rowgroup" colSpan={9}>{group} · {rows.length}</th></tr>}
        {rows.map(document => {
          const href = root + '/' + document.id;
          const overdue = reviewAttention(document, reviewDates) === 'overdue';
          const pendingApproval = awaitingApproval.has(document.id);
          const status = pendingApproval ? 'Awaiting approval' : statuses.find(item => item.value === document.status)?.label ?? document.status;
          return <tr key={document.id}>
            <th scope="row"><Link href={href}>{document.document_number}</Link></th>
            <td>{document.title}</td>
            <td>{document.document_type}</td>
            <td>{standards(document).join(', ') || '—'}</td>
            <td>{ownerLabels.get(document.owner_person_id) ?? '—'}</td>
            <td>{document.revision}</td>
            <td><span className={s.hubStatusBadge} data-status={pendingApproval ? 'awaiting-approval' : document.status}>{status}</span></td>
            <td className={overdue ? s.hubOverdue : undefined}>{document.review_date
              ? <time dateTime={document.review_date}>{reviewDateFormat.format(new Date(document.review_date + 'T00:00:00Z'))}</time>
              : '—'}</td>
            <td><Link href={href} aria-label={`Open ${document.document_number} revision ${document.revision}`}>Open →</Link></td>
          </tr>;
        })}
      </tbody>)}
    </table>
  </div>;
}

export default async function DocumentsPage({ searchParams }) {
  const q = await searchParams;
  const section = typeof q?.section === 'string' && Object.hasOwn(sectionTitles, q.section) ? q.section : '';
  const context = await companyDocumentContext();
  const { client, organization, user } = context;
  const documentLinks = (table, key) => companyDocumentRows(client, table, 'document_id,' + key, query => query, ['document_id', key]);
  const [options, tagLinks, siteLinks, departmentLinks, all, reviewRows, { access: rpg }] = await Promise.all([
    loadDocumentFormOptions(context),
    documentLinks('company_document_classifications', 'classification_key'),
    documentLinks('company_document_sites', 'site_id'),
    documentLinks('company_document_departments', 'department_id'),
    companyDocumentRows(client, 'company_documents', 'id,series_id,document_number,title,document_type,standard,legacy_standard_text,revision,status,review_date,owner_person_id,applicability', query => query.eq('organization_id', organization.id), ['document_number', 'created_at', 'id']),
    companyDocumentRows(client, 'company_document_reviews', 'document_id,role,decision,accepted_at', query => query, ['document_id', 'person_id', 'role']),
    resolvePortalAdminAccess({ admin: createAdminClient(), user, allowedRoles: ['admin', 'document_controller'] }),
  ]);
  const assignments = indexLinks(reviewRows);
  const awaitingApproval = new Set(all.filter(document => awaitingDocumentApproval(document, assignments.get(document.id) ?? [])).map(document => document.id));
  const tags = indexLinks(tagLinks, 'classification_key');
  const sites = indexLinks(siteLinks, 'site_id');
  const departments = indexLinks(departmentLinks, 'department_id');
  const siteLabels = new Map(options.sites.map(site => [site.id, site.site_name]));
  const departmentLabels = new Map(options.departments.map(department => [department.id, department.name]));
  const catalogue = new Map(options.classifications.map(item => [item.key, item]));
  const documentChoices = all.map(document => ({ value: document.id, label: `${document.document_number} · ${document.title} · Rev ${document.revision}` }));
  const accessibleOwners = new Set(all.map(document => document.owner_person_id));
  const ownerChoices = options.people.filter(person => accessibleOwners.has(person.id)).map(person => ({
    value: person.id, label: personName(person),
  })).filter(choice => choice.label).sort((a, b) => a.label.localeCompare(b.label, 'en-GB'));
  const ownerLabels = new Map(ownerChoices.map(({ value, label }) => [value, label]));
  const familyLabels = new Map(options.classifications.map(family => [family.key, family.label]));
  for (const document of all) if (document.standard && !familyLabels.has(document.standard)) familyLabels.set(document.standard, document.standard);
  const familyChoices = [...familyLabels].map(([value, label]) => ({ value, label }));
  const standardLabels = document => {
    const known = (tags.get(document.id) ?? []).map(key => catalogue.get(key)).filter(tag => tag?.kind === 'standard').map(tag => tag.label);
    if (known.length) return known;
    const legacy = document.legacy_standard_text || document.standard;
    return legacy?.match(/\b(?:ISO|AS\s?9100|EN\s?9100)\b/i) ? [legacy] : [];
  };
  const grouping = groupings.some(([value]) => value === q?.group) ? q.group : '';
  const view = q?.view === 'operational' || section === 'register' ? 'operational' : 'management';
  const showOverview = section === 'reports' || (!section && view === 'management');
  const showRegister = !['create', 'links', 'reports'].includes(section);
  const groupLabels = document => {
    const keys = tags.get(document.id) ?? [];
    const scopeFallback = dimension => document.applicability === 'company' ? 'Company-wide' : 'No ' + dimension + ' specified';
    const fallback = document.standard && !standardLabels(document).length ? document.standard : 'No family assigned';
    const labels = {
      family: keys.map(key => catalogue.get(key)).filter(tag => tag && tag.kind !== 'standard').map(tag => tag.label),
      standard: standardLabels(document),
      site: (sites.get(document.id) ?? []).map(id => siteLabels.get(id) ?? 'Site name unavailable'),
      department: (departments.get(document.id) ?? []).map(id => departmentLabels.get(id) ?? 'Department name unavailable'),
    }[grouping];
    const empty = { family: fallback, standard: 'No standard assigned', site: scopeFallback('site'), department: scopeFallback('department') };
    return labels.length ? [...new Set(labels)] : [empty[grouping]];
  };
  const attention = typeof q?.attention === 'string' && Object.hasOwn(attentionLabels, q.attention) ? q.attention : '';
  const stage = q?.stage === 'awaiting-approval' ? q.stage : '';
  const inSection = document => {
    if (section === 'approvals') return ['in_review', 'approved'].includes(document.status);
    if (section === 'reviews') return document.status === 'current';
    if (section === 'obsolete') return ['superseded', 'withdrawn'].includes(document.status);
    return true;
  };
  const records = all.filter(inSection);
  const selectedDocuments = values(q?.document);
  const selectedOwners = values(q?.owner_id);
  const selectedFamilies = values(q?.family);
  const selectedStatuses = values(q?.status);
  const documentInput = typeof q?.q === 'string' ? q.q.slice(0, 150).trim() : '';
  const ownerInput = typeof q?.owner === 'string' ? q.owner.slice(0, 150).trim() : '';
  const ownerQuery = normalizeName(ownerInput);
  const documentQuery = normalizeName(documentInput);
  const reviewDates = documentReviewDates();
  const visible = records.filter(document =>
    (!selectedDocuments.size || selectedDocuments.has(document.id)) &&
    (!selectedOwners.size || selectedOwners.has(document.owner_person_id)) &&
    (!selectedFamilies.size || selectedFamilies.has(document.standard) || tags.get(document.id)?.some(key => selectedFamilies.has(key))) &&
    (!selectedStatuses.size || selectedStatuses.has(document.status) || (selectedStatuses.has('awaiting-approval') && awaitingApproval.has(document.id))) &&
    (!documentQuery || normalizeName(`${document.document_number} ${document.title}`).includes(documentQuery)) &&
    (!ownerQuery || normalizeName(ownerLabels.get(document.owner_person_id) ?? '').includes(ownerQuery)) &&
    (!attention || reviewAttention(document, reviewDates) === attention) &&
    (!stage || awaitingApproval.has(document.id))
  );
  const filters = { q: documentInput, owner: ownerInput, document: [...selectedDocuments], owner_id: [...selectedOwners],
    family: [...selectedFamilies], status: [...selectedStatuses], attention, stage };
  const hasFilters = Object.values(filters).some(value => value.length);
  function registerHref(overrides = {}, keepFilters = false) {
    const query = new URLSearchParams();
    for (const [name, entry] of Object.entries({ section: section === 'reports' ? 'register' : section, view: view === 'management' || section ? '' : view, group: grouping, ...(keepFilters ? filters : {}), ...overrides })) {
      for (const value of Array.isArray(entry) ? entry : [entry]) if (value) query.append(name, value);
    }
    return root + (query.size ? '?' + query : '') + '#register';
  }

  return <main className={`${s.page} ${s.registerPage} ${s.hubPage}`}><div className={s.shell}>
    <header className={s.hubHero}>
      <div><small>RPG EXCELLENCE / DOCUMENT MANAGEMENT</small><h1>{sectionTitles[section] || 'Document Control Centre'}</h1>
        <p>Create, review, approve and release controlled documents.</p></div>
      <nav className={s.hubHeroLinks} aria-label="Document management shortcuts">
        <Link href="/portal/tasks?module=documents">My document tasks</Link>
        {options.settingsAdmin && <Link href={root + '/settings'}>Numbering settings</Link>}
        {rpg && <Link href="/portal/rpg-documents/admin">RPG private document administration</Link>}
        <Link href="/portal">Dashboard</Link>
      </nav>
    </header>
    {typeof q?.error === 'string' && <div role="alert" className={s.error}>{q.error}</div>}
    {showOverview && <DocumentHubOverview documents={all} reviewDates={reviewDates} registerHref={registerHref} awaitingApproval={awaitingApproval}/>}
    {section === 'links' && <DocumentHubLinks sites={options.sites} departments={options.departments}/>}
    {showRegister &&
    <section className={s.hubRegister} id="register" aria-labelledby="register-title">
      <header className={s.hubRegisterHead}>
        <h2 id="register-title">{sectionTitles[section] || 'Company document register'}</h2>
        {section === 'approvals' && <Link className={s.hubCreate} href="/portal/tasks?module=documents&status=verification">My document approvals →</Link>}
        {['', 'register'].includes(section) && <nav className={s.hubTabs} aria-label="Document Hub view">
          <Link href={registerHref({ section: 'register', view: '' }, true)} aria-current={view === 'operational' ? 'page' : undefined}>Operational view</Link>
          <Link href={registerHref({ section: '', view: '' }, true)} aria-current={view === 'management' ? 'page' : undefined}>Management view</Link>
        </nav>}
      </header>
      {section === 'reviews' && <nav className={s.hubTabs} aria-label="Review schedule filters">
        {[['', 'All current'], ['overdue', 'Overdue'], ['upcoming', 'Due within 30 days'], ['undated', 'No review date']].map(([value, label]) =>
          <Link key={value} aria-current={attention === value ? 'page' : undefined} href={registerHref({ attention: value }, true)}>{label}</Link>)}
      </nav>}
      {section === 'approvals' && <nav className={s.hubTabs} aria-label="Approval filters">
        {[['', 'All reviews and approvals'], ['awaiting-approval', 'Awaiting approval']].map(([value, label]) =>
          <Link key={value} aria-current={stage === value ? 'page' : undefined} href={registerHref({ stage: value }, true)}>{label}</Link>)}
      </nav>}
      <nav className={s.hubTabs} aria-label="Register grouping">
        {groupings.map(([value, label]) => <Link key={value} aria-current={grouping === value ? 'page' : undefined} href={registerHref({ group: value }, true)}>{label}</Link>)}
      </nav>
      <form key={JSON.stringify(filters)} method="get" action={root + '#register'} className={`${s.form} ${s.inline} ${s.hubFilters}`}>
        {section && <input type="hidden" name="section" value={section}/>}
        {stage && <input type="hidden" name="stage" value={stage}/>}
        {!section && view === 'operational' && <input type="hidden" name="view" value={view}/>}
        {grouping && <input type="hidden" name="group" value={grouping}/>}
        {attention && <input type="hidden" name="attention" value={attention}/>}
        <DocumentRegisterFilter label="Search" name="document" choices={documentChoices} selected={filters.document}
          emptyLabel="Document number or title" search={{ name: 'q', value: documentInput, placeholder: 'Document number or title' }}/>
        <DocumentRegisterFilter label="Owner" name="owner_id" choices={ownerChoices} selected={filters.owner_id}
          emptyLabel="All owners" search={{ name: 'owner', value: ownerInput, placeholder: 'First or last name' }}/>
        <DocumentRegisterFilter label="Family" name="family" choices={familyChoices} selected={filters.family} emptyLabel="All families"/>
        <DocumentRegisterFilter label="Status" name="status" choices={statusChoices} selected={filters.status} emptyLabel="All accessible records"/>
        <div className={s.hubFilterActions}><button className={s.hubApply}>Apply</button><Link className={s.hubCreate} href={root + '?section=create#create-document'}>+ Create document</Link></div>
      </form>
      <div className={s.hubScope}><span>{visible.length} of {records.length} accessible revisions{attention ? ' · ' + attentionLabels[attention] : ''}{stage ? ' · Awaiting approval' : ''}</span>
        {hasFilters && <Link href={registerHref()}>Clear filters</Link>}</div>
      {visible.length
        ? <DocumentTable documents={visible} grouping={grouping} groupLabels={groupLabels} ownerLabels={ownerLabels} standards={standardLabels} reviewDates={reviewDates} awaitingApproval={awaitingApproval}/>
        : <p className={s.muted}>{hasFilters ? 'No accessible documents match these filters.' : 'No documents available in this view.'}</p>}
    </section>}
    {section === 'create' && <section className={s.panel} id="create-document"><h2>Create a controlled document</h2>
      <p className={s.muted}>Start a draft. A verifier and an approver must independently confirm before the author or owner can release it.</p>
      <CompanyDocumentDraftForm options={options} requestId={randomUUID()} draftId={randomUUID()}/>
    </section>}
  </div></main>;
}
