import Link from 'next/link';
import s from './documents.module.css';

const moduleLinks = [
  ['Risk assessments', '/portal/health-safety/risk-assessment'],
  ['Training Academy', '/portal/health-safety/training'],
  ['Internal Audit', '/portal/internal-audits'],
  ['Findings & Actions', '/portal/internal-audit-actions'],
  ['CAPA-8D', '/portal/rca'],
  ['Asset Management', '/portal/asset-management'],
  ['Supplier Assurance', '/portal/suppliers'],
  ['Business Continuity', '/portal/business-continuity'],
  ['Information Security', '/portal/information-security'],
];

export default function DocumentHubLinks({ sites, departments }) {
  return <section className={s.hubRegister} id="register" aria-labelledby="document-links">
    <h2 id="document-links">Document Links</h2>
    <div className={s.hubSummary}>
      <section className={s.hubPanel}>
        <h2>Sites &amp; zones</h2>
        {sites.length ? <ul className={s.hubAttention}>{sites.map(site => <li key={site.id}>
          <Link href={`/portal/company/sites/${site.id}/zones`}><span>{site.site_name}</span><b>Buildings &amp; Zones →</b></Link>
        </li>)}</ul> : <p>No sites are available in this workspace.</p>}
      </section>
      <section className={s.hubPanel}>
        <h2>Company structure &amp; people</h2>
        <ul className={s.hubAttention}>
          <li><Link href="/portal/company/people">People, Roles &amp; Access →</Link></li>
          <li><Link href="/portal/tasks?module=documents">My document tasks →</Link></li>
          <li><Link href="/portal/documents?section=register&group=department">Documents by department →</Link></li>
        </ul>
        {departments.length > 0 && <p>{departments.length} departments in the company structure</p>}
      </section>
      <section className={s.hubPanel}>
        <h2>Related workspaces</h2>
        <ul className={s.hubAttention}>{moduleLinks.map(([label, href]) => <li key={href}><Link href={href}>{label} →</Link></li>)}</ul>
      </section>
    </div>
  </section>;
}
