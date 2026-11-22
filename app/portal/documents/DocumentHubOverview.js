import Link from 'next/link';
import s from './documents.module.css';

const dateKey = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit',
});

export function documentReviewDates(now = new Date()) {
  const today = dateKey.format(now);
  const next = new Date(today + 'T00:00:00Z');
  next.setUTCDate(next.getUTCDate() + 30);
  return { today, next30: next.toISOString().slice(0, 10) };
}

export function reviewAttention(document, { today, next30 }) {
  if (document.status !== 'current') return '';
  if (!document.review_date) return 'undated';
  if (document.review_date < today) return 'overdue';
  return document.review_date <= next30 ? 'upcoming' : '';
}

const segments = [
  ['Current', ['current'], '#238a69'],
  ['Draft', ['draft'], '#4f85b6'],
  ['Approved for release', ['approved'], '#b47a23'],
  ['In review', ['in_review'], '#8663ad'],
  ['Superseded / withdrawn', ['superseded', 'withdrawn'], '#899baa'],
];

export function awaitingDocumentApproval(document, assignments) {
  if (document.status !== 'in_review') return false;
  const verifiers = assignments.filter(row => row.role === 'verifier');
  return verifiers.length > 0 && verifiers.every(row => row.decision === 'confirmed' && row.accepted_at)
    && assignments.some(row => row.role === 'approver' && !row.decision);
}

export default function DocumentHubOverview({ documents, reviewDates, registerHref, awaitingApproval }) {
  const status = new Map();
  const reviews = new Map();
  for (const document of documents) {
    status.set(document.status, (status.get(document.status) ?? 0) + 1);
    const key = reviewAttention(document, reviewDates);
    reviews.set(key, (reviews.get(key) ?? 0) + 1);
  }
  const current = status.get('current') ?? 0;
  const approved = status.get('approved') ?? 0;
  const overdue = reviews.get('overdue') ?? 0;
  const undated = reviews.get('undated') ?? 0;
  const upcoming = reviews.get('upcoming') ?? 0;
  const coverage = current ? Math.round((current - undated) / current * 100) : null;
  const total = documents.length;
  let cursor = 0;
  const breakdown = segments.map(([label, keys, colour]) => {
    const count = keys.reduce((sum, key) => sum + (status.get(key) ?? 0), 0);
    const start = cursor;
    cursor += count;
    return { label, count, colour, start };
  });
  const filled = breakdown.filter(segment => segment.count);
  const ringFill = filled.length > 1 ? `conic-gradient(${filled.map(({colour, start, count}) =>
    `${colour} ${start / total * 100}% ${(start + count) / total * 100}%`).join(', ')})` : filled[0]?.colour ?? '#e3ecf3';
  const cards = [
    ['Controlled Documents', new Set(documents.map(document => document.series_id || document.id)).size, 'Accessible document series', '#5397c9', {}],
    ['Awaiting Approval', awaitingApproval.size, 'Independent approval pending', '#d49c45', { stage: 'awaiting-approval' }],
    ['Overdue Review', overdue, 'Current documents', '#ce646c', { attention: 'overdue' }],
    ['In Review', status.get('in_review') ?? 0, 'Submitted for decision', '#916bb4', { status: 'in_review' }],
    ['Approved / Published', approved + current, 'Approved for release and current', '#48a88c', { status: ['approved', 'current'] }],
  ];
  const attention = [
    ['overdue reviews', overdue, '#ce646c', { attention: 'overdue' }],
    ['approved for release', approved, '#d49c45', { status: 'approved' }],
    ['current without a review date', undated, '#5397c9', { attention: 'undated' }],
  ];

  return <>
    <section className={s.hubCards} aria-label="Document performance">
      {cards.map(([label, count, detail, colour, filters]) => <Link className={s.hubCard} key={label} href={registerHref(filters)} style={{ '--hub-accent': colour }}>
        <strong>{count}</strong><span>{label}</span><small>{detail}</small>
      </Link>)}
    </section>
    <div className={s.hubSummary}>
      <section className={s.hubPanel} aria-labelledby="document-status">
        <h2 id="document-status">Document status</h2>
        <div className={s.hubStatus}>
          <div className={s.hubRing} style={{ background: ringFill }} aria-hidden="true"><div><strong>{total}</strong><small>revisions</small></div></div>
          <ul className={s.hubLegend}>{breakdown.map(({label, count, colour}) => <li key={label}>
            <i style={{ background: colour }} aria-hidden="true"/><span>{label}</span><b>{count}</b>
          </li>)}</ul>
        </div>
      </section>
      <section className={s.hubPanel} aria-labelledby="review-coverage">
        <h2 id="review-coverage">Review schedule coverage</h2>
        <div className={s.coverageNumber}>{coverage === null ? '—' : coverage + '%'}</div>
        <p>{current ? `${current - undated} of ${current} current documents have a review date.` : 'No current documents in scope.'}</p>
        {coverage !== null && <meter min={0} max={100} value={coverage} aria-label="Review schedule coverage"/>}
        <Link href={registerHref({ attention: 'upcoming' })}><b>{upcoming}</b> due within 30 days →</Link>
      </section>
      <section className={s.hubPanel} aria-labelledby="document-attention">
        <h2 id="document-attention">Documents requiring attention</h2>
        <ul className={s.hubAttention}>{attention.map(([label, count, colour, filters]) => <li key={label}>
          <Link href={registerHref(filters)} style={{ '--hub-accent': colour }}><span><b>{count}</b> {label}</span><b aria-hidden="true">View →</b></Link>
        </li>)}</ul>
      </section>
    </div>
  </>;
}
