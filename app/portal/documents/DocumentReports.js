'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import s from './documents.module.css';
import {
  approval, drillRecords, memberships, other, published, reportBreakdown, reportGroups,
  reportSeries, reviewCategories, revisionStatuses, series,
} from './document-report-data.mjs';

const pageSize = 8;
const dimensions = Object.keys(reportGroups);
const allRevisions = { key: 'all', label: 'All document revisions' };
const dateFormat = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
const formatDate = value => dateFormat.format(new Date(value + 'T00:00:00Z'));

function CategoryButton({ metric, active, choose, attention = false }) {
  return <button type="button" className={s.reportMetric} aria-pressed={active === metric.key}
    style={{ '--report-accent': metric.colour }} onClick={() => choose(metric.key)}>
    <i aria-hidden="true"/><span>{metric.label}</span><strong>{metric.count}</strong>
    {attention && <b className={s.reportScreen} aria-hidden="true">View →</b>}
  </button>;
}

function ringPoint(fraction, radius) {
  const angle = fraction * Math.PI * 2 - Math.PI / 2;
  return `${130 + radius * Math.cos(angle)} ${130 + radius * Math.sin(angle)}`;
}

function StatusDonut({ metrics, total, choose }) {
  let end = 0;
  return <svg className={s.reportDonut} viewBox="0 0 260 260" aria-hidden="true">
    <circle cx="130" cy="130" r="92" fill="none" stroke="#e3ecf3" strokeWidth="48"/>
    {metrics.filter(metric => metric.count > 0).map(metric => {
      const fraction = metric.count / total;
      const start = end;
      end += fraction;
      const onClick = () => choose(metric.key);
      const title = <title>{metric.label} · {metric.count}</title>;
      if (metric.count === total) return <circle key={metric.key} className={s.reportSlice} cx="130" cy="130"
        r="92" fill="none" stroke={metric.colour} strokeWidth="48" onClick={onClick}>{title}</circle>;
      const large = fraction > .5 ? 1 : 0;
      const d = `M ${ringPoint(start, 116)} A 116 116 0 ${large} 1 ${ringPoint(end, 116)} L ${ringPoint(end, 68)} A 68 68 0 ${large} 0 ${ringPoint(start, 68)} Z`;
      return <path key={metric.key} className={s.reportSlice} d={d} fill={metric.colour} onClick={onClick}>{title}</path>;
    })}
    <text textAnchor="middle" x="130" y="129" className={s.reportDonutTotal}>{total}</text>
    <text textAnchor="middle" x="130" y="150" className={s.reportDonutLabel}>revisions</text>
  </svg>;
}

function ReportTable({ rows }) {
  if (!rows.length) return <p className={s.reportEmpty}>No matching documents.</p>;
  return <div className={s.hubTableWrap} role="region" aria-label="Matching document records" tabIndex={0}>
    <table className={`${s.hubTable} ${s.reportTable}`}>
      <thead><tr>{['Reference', 'Title', 'Rev.', 'Department', 'Site', 'Status', 'Next review'].map(label =>
        <th key={label} scope="col">{label}</th>
      )}</tr></thead>
      <tbody>{rows.map(row => {
        const status = row.awaitingApproval ? 'awaiting-approval' : row.status;
        const label = row.awaitingApproval ? 'Awaiting approval'
          : revisionStatuses.find(item => item.key === row.status)?.label
            ?? (row.status === 'superseded' ? 'Superseded' : row.status === 'withdrawn' ? 'Withdrawn' : 'Other status');
        return <tr key={row.id}>
          <th scope="row"><Link href={'/portal/documents/' + row.id}>{row.reference}</Link></th>
          <td>{row.title}</td><td>{row.revision}</td>
          <td>{memberships(row, 'department').map(item => item.label).join(', ')}</td>
          <td>{memberships(row, 'site').map(item => item.label).join(', ')}</td>
          <td><span className={s.hubStatusBadge} data-status={status}>{label}</span></td>
          <td className={row.review === 'overdue' ? s.hubOverdue : undefined}>{row.reviewDate
            ? <time dateTime={row.reviewDate}>{formatDate(row.reviewDate)}</time> : '—'}</td>
        </tr>;
      })}</tbody>
    </table>
  </div>;
}

export default function DocumentReports({ records, companyName, asOf }) {
  const [root, setRoot] = useState('all');
  const [path, setPath] = useState([]);
  const [dimension, setDimension] = useState('department');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(0);
  const [logo, setLogo] = useState('');
  const [logoBusy, setLogoBusy] = useState(false);
  const [logoError, setLogoError] = useState('');
  const explorer = useRef(null);
  const heading = useRef(null);
  const picker = useRef(null);
  const logoGeneration = useRef(0);
  useEffect(() => () => { logoGeneration.current++; }, []);

  const unique = reportSeries(records);
  const withCounts = metrics => metrics.map(metric => ({ ...metric, count: records.filter(metric.matches).length }));
  const statuses = withCounts([...revisionStatuses, other]).filter(metric => metric.key !== 'other' || metric.count || root === 'other');
  const reviews = withCounts(reviewCategories);
  const [overdue, , , undated] = reviews;
  const approved = statuses.find(metric => metric.key === 'approved');
  const current = statuses.find(metric => metric.key === 'current').count;
  const dated = current - undated.count;
  const cards = [
    { ...series, count: unique.length },
    ...withCounts([approval]),
    { ...overdue, label: 'Overdue Review', detail: 'Current documents' },
    { ...statuses.find(metric => metric.key === 'in_review'), label: 'In Review', detail: 'Submitted for decision' },
    ...withCounts([published]),
  ];
  const selected = [...statuses, ...reviews, approval, published, series, allRevisions].find(metric => metric.key === root);
  const rootRecords = root === 'series' ? unique : selected.matches ? records.filter(selected.matches) : records;
  const scoped = drillRecords(rootRecords, path);
  const groups = dimension ? reportBreakdown(scoped, dimension) : [];
  const normalizedQuery = query.trim().toLocaleLowerCase('en-GB');
  const filtered = scoped.filter(row => `${row.reference} ${row.title}`.toLocaleLowerCase('en-GB').includes(normalizedQuery));
  const first = page * pageSize;
  const available = dimensions.filter(key => !path.some(step => step.dimension === key));
  const scope = [selected.label, ...path.map(step => step.label)].join(' › ');
  const countUnit = root === 'series' ? 'document series' : filtered.length === 1 ? 'revision' : 'revisions';

  function resetList() {
    setQuery('');
    setPage(0);
  }

  function jump() {
    heading.current?.focus({ preventScroll: true });
    explorer.current?.scrollIntoView({ block: 'start' });
  }

  function choose(key) {
    setRoot(key);
    setPath([]);
    setDimension('department');
    resetList();
    jump();
  }

  function drill(group) {
    setPath([...path, { ...group, dimension }]);
    setDimension(available.find(key => key !== dimension) ?? '');
    resetList();
    jump();
  }

  function back(depth) {
    setDimension(path[depth].dimension);
    setPath(path.slice(0, depth));
    resetList();
    jump();
  }

  async function chooseLogo(event) {
    const file = event.target.files?.[0];
    const token = ++logoGeneration.current;
    setLogoBusy(false);
    setLogoError('');
    if (!file) return;
    setLogo('');
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 2 * 1024 * 1024) {
      setLogoError('Choose a PNG, JPEG or WebP logo up to 2 MB.');
      event.target.value = '';
      return;
    }
    setLogoBusy(true);
    try {
      const source = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const image = new Image();
      image.src = source;
      await image.decode();
      if (token === logoGeneration.current) setLogo(source);
    } catch {
      if (token === logoGeneration.current) {
        setLogoError('This image could not be opened. Choose another logo.');
        if (picker.current) picker.current.value = '';
      }
    } finally {
      if (token === logoGeneration.current) setLogoBusy(false);
    }
  }

  function clearLogo() {
    logoGeneration.current++;
    setLogo('');
    setLogoBusy(false);
    setLogoError('');
    if (picker.current) picker.current.value = '';
  }

  return <div className={s.report}>
    <div className={`${s.reportToolbar} ${s.reportScreen}`}>
      <label>Company logo <input ref={picker} type="file" accept="image/png,image/jpeg,image/webp" onChange={chooseLogo}/></label>
      {logo && <><img src={logo} alt="Selected company logo"/><button type="button" className={s.hubApply} onClick={clearLogo}>Remove logo</button></>}
      <button type="button" className={s.hubCreate} onClick={() => window.print()} disabled={logoBusy}>Print / Save PDF</button>
      <small>Choose your company logo image for this report. The file stays in your browser.</small>
      {logoError && <span role="alert">{logoError}</span>}
    </div>
    <header className={s.reportPrintHeader}>
      {logo && <img src={logo} alt="Company logo"/>}
      <div><strong>{companyName}</strong><h1>Document Management · Reports &amp; KPIs</h1>
        <p>As at {formatDate(asOf)} · Accessible records</p></div>
    </header>
    <section className={s.hubCards} aria-label="Document performance">
      {cards.map(metric => <button type="button" key={metric.key} className={s.hubCard}
        aria-pressed={root === metric.key} style={{ '--hub-accent': metric.colour }} onClick={() => choose(metric.key)}>
        <strong>{metric.count}</strong><span>{metric.label}</span><small>{metric.detail}</small>
      </button>)}
    </section>
    <div className={`${s.hubSummary} ${s.reportSummary}`}>
      <section className={s.hubPanel} aria-labelledby="report-status">
        <h2 id="report-status">Document status</h2>
        <p className={s.reportScreen}>Select a category or slice to explore its revisions.</p>
        <div className={s.reportStatus}>
          <div className={s.reportStack}>{statuses.map(metric => <CategoryButton key={metric.key} metric={metric} active={root} choose={choose}/>)}</div>
          <StatusDonut metrics={statuses} total={records.length} choose={choose}/>
        </div>
      </section>
      <section className={s.hubPanel} aria-labelledby="report-review">
        <h2 id="report-review">Review schedule coverage</h2>
        <div className={s.coverageNumber}>{current ? Math.round(dated / current * 100) + '%' : '—'}</div>
        <p>{current ? `${dated} of ${current} current documents have a review date.` : 'No current documents in scope.'}</p>
        {current > 0 && <div className={s.reportCoverage} role="group" aria-label="Review schedule breakdown">
          {reviews.filter(metric => metric.count > 0).map(metric =>
            <button type="button" key={metric.key} onClick={() => choose(metric.key)} aria-pressed={root === metric.key}
              aria-label={`${metric.label} (${metric.count})`} style={{ width: metric.count / current * 100 + '%', background: metric.colour }}/>
          )}
        </div>}
        <div className={s.reportStack}>{reviews.map(metric => <CategoryButton key={metric.key} metric={metric} active={root} choose={choose}/>)}</div>
      </section>
      <section className={s.hubPanel} aria-labelledby="report-attention">
        <h2 id="report-attention">Documents requiring attention</h2>
        <p className={s.reportScreen}>Select an item to see the affected records.</p>
        <div className={s.reportStack}>{[overdue, approved, undated].map(metric =>
          <CategoryButton key={metric.key} metric={metric} active={root} choose={choose} attention/>
        )}</div>
      </section>
    </div>
    <section className={s.hubRegister} ref={explorer} aria-labelledby="report-explorer">
      <nav className={`${s.reportTrail} ${s.reportScreen}`} aria-label="Report drill-down">
        {root !== 'all' && <button type="button" onClick={() => choose('all')}>Reports &amp; KPIs</button>}
        {path.length > 0 && <button type="button" onClick={() => back(0)}>{selected.label}</button>}
        {path.slice(0, -1).map((step, index) =>
          <button type="button" key={step.dimension} onClick={() => back(index + 1)}>{step.label}</button>
        )}
      </nav>
      <header className={s.hubRegisterHead}>
        <h2 id="report-explorer" ref={heading} tabIndex={-1}>{path.at(-1)?.label ?? selected.label}</h2>
        <span role="status">{filtered.length} {countUnit}</span>
      </header>
      <div className={s.reportPrintOnly}><p>{scope}{normalizedQuery && ` · Search: ${query.trim()}`}</p></div>
      <div className={s.reportExplorer}>
        <section aria-label="Document breakdown">
          <div className={s.reportSectionHead}>
            <h3>{dimension ? `Breakdown by ${reportGroups[dimension].toLowerCase()}` : 'Breakdown'}</h3>
            {dimension && <label className={s.reportScreen}>Group by <select value={dimension} onChange={event => setDimension(event.target.value)}>
              {available.map(key => <option key={key} value={key}>{reportGroups[key]}</option>)}
            </select></label>}
          </div>
          <div className={s.reportStack}>
            {groups.map(group => <button type="button" className={s.reportGroup} key={group.id} onClick={() => drill(group)}>
              <span>{group.label}<b>{group.count}<span className={s.reportScreen} aria-hidden="true"> →</span></b></span>
              <i aria-hidden="true"><i style={{ width: group.count / scoped.length * 100 + '%' }}/></i>
            </button>)}
            {!groups.length && <p className={s.reportEmpty}>{scoped.length ? 'All grouping levels selected.' : 'No records in this category.'}</p>}
          </div>
          {groups.reduce((total, group) => total + group.count, 0) > scoped.length &&
            <p className={s.reportNote}>A revision can apply to more than one {reportGroups[dimension].toLowerCase()}.</p>}
        </section>
        <section aria-label="Matching documents">
          <div className={s.reportSectionHead}><h3>Matching documents</h3>
            <input className={s.reportScreen} type="search" aria-label="Search matching documents" placeholder="Find a reference or title"
              value={query} onChange={event => { setQuery(event.target.value); setPage(0); }}/>
          </div>
          <div className={s.reportScreen}>
            <ReportTable rows={filtered.slice(first, first + pageSize)}/>
            {filtered.length > pageSize && <div className={s.reportPagination}>
              <span>{first + 1}–{Math.min(first + pageSize, filtered.length)} of {filtered.length}</span>
              <div><button type="button" className={s.hubApply} disabled={!page} onClick={() => setPage(page - 1)}>Previous</button>
                <button type="button" className={s.hubApply} disabled={first + pageSize >= filtered.length} onClick={() => setPage(page + 1)}>Next</button></div>
            </div>}
          </div>
          <div className={s.reportPrintOnly}><ReportTable rows={filtered}/></div>
        </section>
      </div>
    </section>
  </div>;
}
