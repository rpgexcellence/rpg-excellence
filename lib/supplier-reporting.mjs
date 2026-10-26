/** Supplier board/report calculations. Read-only; never changes approval decisions.
 * Inputs must be authorised and organisation-scoped by the server loader.
 * Current supplier status is a snapshot; date filters apply to completed QBRs.
 * Performance percentages are medians, not volume-weighted rates.
 */
export const SUPPLIER_METRICS = Object.freeze([
  { key: 'otd', label: 'On-time delivery', unit: '%', direction: 'higher' },
  { key: 'conformity', label: 'Product or service conformity', unit: '%', direction: 'higher' },
  { key: 'escapes', label: 'Quality escapes', unit: 'count', direction: 'lower' },
  { key: 'capa', label: 'Corrective-action closure', unit: '%', direction: 'higher' },
  { key: 'response', label: 'Response to issues', unit: '%', direction: 'higher' },
]);
const RISK_BANDS = ['critical', 'high', 'medium', 'low', 'unassessed'];
const OPEN_ACTIONS = new Set(['open', 'in_progress', 'awaiting_review']);
const EXCLUDED = new Set(['cancelled', 'canceled', 'withdrawn', 'deleted', 'void']);
const AUDIT_CLOSED = new Set(['closed']);
const text = value => typeof value === 'string' ? value.trim() : '';
const status = value => text(value).toLowerCase();
const list = value => Array.isArray(value) ? value : [];
const round = value => Math.round(value * 10) / 10;

export function supplierDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}(?:$|T)/.test(value)) return null;
  const key = value.slice(0, 10);
  const date = new Date(key + 'T00:00:00Z');
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === key ? key : null;
}
export function supplierNumber(value, count = false) {
  if ((typeof value !== 'number' && typeof value !== 'string') || String(value).trim() === '') return null;
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0 || (count ? !Number.isInteger(number) : number > 100)) return null;
  return number;
}
export function supplierMedian(values) {
  const sorted = values.filter(v => typeof v === 'number' && Number.isFinite(v)).sort((a, b) => a - b);
  if (!sorted.length) return null;
  const mid = Math.floor(sorted.length / 2);
  return round(sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2);
}
function unique(rows) {
  const map = new Map();
  for (const row of list(rows)) if (row && text(row.id)) map.set(row.id, row);
  return [...map.values()];
}
function riskBand(supplier) {
  const band = status(supplier.risk_result?.riskBand);
  return RISK_BANDS.includes(band) ? band : 'unassessed';
}
function approval(supplier, today) {
  const saved = status(supplier.approval_status) || 'unknown';
  const expiry = supplierDate(supplier.approval_expiry);
  if (['approved', 'conditionally_approved'].includes(saved) && expiry && expiry < today) return 'expired';
  return saved;
}
function withinDays(date, today, days) {
  const key = supplierDate(date);
  if (!key || key < today) return false;
  return (Date.parse(key + 'T00:00:00Z') - Date.parse(today + 'T00:00:00Z')) / 86400000 <= days;
}
function newestReviews(rows, group) {
  const result = new Map();
  const sorted = [...rows].sort((a, b) =>
    b.review_date.localeCompare(a.review_date) ||
    text(b.updated_at).localeCompare(text(a.updated_at)) || b.id.localeCompare(a.id));
  for (const row of sorted) {
    const key = group(row);
    if (!result.has(key)) result.set(key, row);
  }
  return [...result.values()];
}
function quarterOf(date) {
  return date.slice(0, 4) + '-Q' + Math.ceil(Number(date.slice(5, 7)) / 3);
}
function metricSummary(reviews, key, supplierCount) {
  const count = key === 'escapes';
  const values = reviews.map(r => supplierNumber(r.scorecard?.[key]?.actual, count)).filter(v => v !== null);
  let comparable = 0, meetingTarget = 0;
  for (const review of reviews) {
    const actual = supplierNumber(review.scorecard?.[key]?.actual, count);
    const target = supplierNumber(review.scorecard?.[key]?.target, count);
    if (actual === null || target === null) continue;
    comparable++;
    if (count ? actual <= target : actual >= target) meetingTarget++;
  }
  return {
    value: values.length ? (count ? values.reduce((a, b) => a + b, 0) : supplierMedian(values)) : null,
    aggregation: count ? 'sum_latest_supplier_reviews' : 'median_latest_supplier_reviews',
    coverage: values.length, supplierCount, missing: supplierCount - values.length,
    comparable, meetingTarget,
  };
}

export function buildSupplierAnalytics(snapshot = {}, filters = {}, options = {}) {
  const today = supplierDate(options.today || snapshot.asOf) || new Date().toISOString().slice(0, 10);
  const from = filters.from ? supplierDate(filters.from) : null;
  const to = filters.to ? supplierDate(filters.to) : null;
  if ((filters.from && !from) || (filters.to && !to) || (from && to && from > to)) throw new Error('Invalid supplier reporting date range.');
  const ids = list(filters.supplierIds);
  const suppliers = unique(snapshot.suppliers).filter(s =>
    (!ids.length || ids.includes(s.id)) &&
    (!filters.risk || filters.risk === 'all' || riskBand(s) === filters.risk) &&
    (!filters.category || filters.category === 'all' || list(s.supplier_types).includes(filters.category)) &&
    (!filters.standard || filters.standard === 'all' || list(s.applicable_standards).includes(filters.standard)));
  const allowed = new Set(suppliers.map(s => s.id));
  const scoped = rows => unique(rows).filter(row => allowed.has(row.supplier_id));
  const warnings = [...list(snapshot.warnings)];
  const completed = scoped(snapshot.reviews).filter(r => status(r.status) === 'completed');
  const invalidReviewDates = completed.filter(r => !supplierDate(r.review_date)).length;
  if (invalidReviewDates) warnings.push(`${invalidReviewDates} completed QBR(s) excluded because the review date is unavailable or invalid.`);
  const reviews = completed.filter(r => {
    const date = supplierDate(r.review_date);
    return date && date <= today && (!from || date >= from) && (!to || date <= to);
  }).map(r => ({ ...r, review_date: supplierDate(r.review_date) }));
  const latest = newestReviews(reviews, r => r.supplier_id);
  const quarterly = newestReviews(reviews, r => r.supplier_id + ':' + quarterOf(r.review_date));
  const metrics = Object.fromEntries(SUPPLIER_METRICS.map(m => [m.key, metricSummary(latest, m.key, suppliers.length)]));
  const quarterKeys = [...new Set(quarterly.map(r => quarterOf(r.review_date)))].sort();
  const trend = quarterKeys.map(quarter => {
    const rows = quarterly.filter(r => quarterOf(r.review_date) === quarter);
    return { quarter, suppliers: rows.length, metrics: Object.fromEntries(SUPPLIER_METRICS.map(m => [m.key, metricSummary(rows, m.key, rows.length)])) };
  });
  const risk = RISK_BANDS.map(band => ({ band, count: suppliers.filter(s => riskBand(s) === band).length }));
  const approvals = {};
  for (const supplier of suppliers) {
    const key = approval(supplier, today);
    approvals[key] = (approvals[key] || 0) + 1;
  }
  // Findings and linked CAPA count once, in mutually exclusive buckets.
  const findings = scoped(snapshot.findings).filter(f => !EXCLUDED.has(status(f.status)));
  const nc = { open: 0, pendingVerification: 0, verifiedClosed: 0, total: findings.length };
  for (const f of findings) {
    if (status(f.status) === 'closed' && f.closure_verified === true) nc.verifiedClosed++;
    else if (f.linked_rca_case_id || ['verification', 'technical_review', 'closed'].includes(status(f.status))) nc.pendingVerification++;
    else nc.open++;
  }
  const actions = scoped(snapshot.actions).filter(a => !EXCLUDED.has(status(a.status)));
  const openActions = actions.filter(a => OPEN_ACTIONS.has(status(a.status)));
  const overdueActions = openActions.filter(a => supplierDate(a.due_date) && supplierDate(a.due_date) < today);
  const missingActionDates = openActions.filter(a => !supplierDate(a.due_date)).length;
  const unknownActionStatuses = actions.filter(a => !OPEN_ACTIONS.has(status(a.status)) && status(a.status) !== 'closed').length;
  if (unknownActionStatuses) warnings.push(`${unknownActionStatuses} QBR action(s) have an unrecognised status and are excluded from open/closed totals.`);
  const subtier = scoped(snapshot.subtiers);
  const certificates = subtier.filter(s => supplierDate(s.certificate_expiry));
  const audits = scoped(snapshot.audits).filter(a => !EXCLUDED.has(status(a.status)) && !AUDIT_CLOSED.has(status(a.status)));
  const auditDate = a => supplierDate(a.planned_end_at) || supplierDate(a.planned_start_at);
  const overdueAudits = audits.filter(a => auditDate(a) && auditDate(a) < today);
  const overdueReviews = suppliers.filter(s => supplierDate(s.next_review_date) && supplierDate(s.next_review_date) < today);
  const assessmentScores = suppliers.map(s => supplierNumber(s.assurance_result?.assuranceScore)).filter(v => v !== null);
  return {
    asOf: today, filters: { from, to, supplierIds: ids, risk: filters.risk || 'all', category: filters.category || 'all', standard: filters.standard || 'all' },
    supplierCount: suppliers.length, suppliers, latestReviews: latest, metrics, trend, risk, approvals, nc,
    approved: approvals.approved || 0,
    withoutQbr: suppliers.length - latest.length,
    assessment: { median: supplierMedian(assessmentScores), coverage: assessmentScores.length, missing: suppliers.length - assessmentScores.length },
    actions: { total: actions.length, open: openActions.length, closed: actions.filter(a => status(a.status) === 'closed').length, overdue: overdueActions.length, missingDueDate: missingActionDates, unknownStatus: unknownActionStatuses },
    assurance: {
      overdueReviews: overdueReviews.length,
      missingReviewDate: suppliers.filter(s => !supplierDate(s.next_review_date)).length,
      approvalExpiring30: suppliers.filter(s => ['approved', 'conditionally_approved'].includes(approval(s, today)) && withinDays(s.approval_expiry, today, 30)).length,
      missingApprovalExpiry: suppliers.filter(s => ['approved', 'conditionally_approved'].includes(status(s.approval_status)) && !supplierDate(s.approval_expiry)).length,
      subtierCertificatesExpiring30: certificates.filter(s => withinDays(s.certificate_expiry, today, 30)).length,
      subtierCertificatesExpired: certificates.filter(s => supplierDate(s.certificate_expiry) < today).length,
      subtierMissingCertificateDate: subtier.length - certificates.length,
      overdueAudits: overdueAudits.length,
      auditsMissingPlannedDate: audits.filter(a => !auditDate(a)).length,
    },
    drilldown: { overdueActions, overdueReviews, overdueAudits, findings, subtiers: subtier },
    warnings: [...new Set(warnings)],
    methodology: [
      'Supplier approval, risk, review dates, findings and action status reflect current saved records, not historical status at the end of the selected period.',
      'Date filters select completed QBRs by review date. Performance KPIs use the latest completed review per supplier within that period.',
      'Quarterly trends use the latest completed review per supplier in each calendar quarter, based on review date.',
      'Percentage KPIs are supplier medians; volume-weighted delivery, conformity and PPM cannot be calculated without underlying quantities.',
      'Quality escapes sum recorded counts from the selected latest reviews; overlapping review periods may overlap events. This is not a deduplicated incident register.',
      'Certificate alerts use recorded sub-tier expiry dates; main supplier approval expiry is shown separately.',
      'Missing values are unavailable. Saved supplier performance slider defaults are never used as measured QBR results.',
      'Verified-closed findings require both a closed status and the saved closure verification flag. A linked CAPA is counted within its finding, not as an additional issue.',
    ],
  };
}

export function buildSupplierExecutiveBrief(analytics) {
  const a = analytics;
  const percent = metric => metric.value === null ? 'unavailable' : `${metric.value}% (${metric.coverage}/${metric.supplierCount} suppliers)`;
  return {
    title: 'Supplier assurance — leadership review', asOf: a.asOf,
    period: { from: a.filters.from, to: a.filters.to },
    paragraphs: [
      `The selected portfolio contains ${a.supplierCount} supplier(s), of which ${a.approved} currently hold approved status. Conditional, expired and pending approvals are reported separately.`,
      `Latest completed-QBR median on-time delivery is ${percent(a.metrics.otd)}; conformity is ${percent(a.metrics.conformity)}. ${a.withoutQbr} supplier(s) have no completed QBR in the selected period.`,
      `Current follow-up comprises ${a.actions.overdue} overdue QBR action(s), ${a.assurance.overdueReviews} overdue supplier review(s) and ${a.assurance.overdueAudits} overdue open supplier audit(s).`,
      `The linked finding register contains ${a.nc.open} open issue(s), ${a.nc.pendingVerification} awaiting closure or verification, and ${a.nc.verifiedClosed} verified closed. Linked CAPA cases are not added again.`,
      `Sub-tier certification records show ${a.assurance.subtierCertificatesExpiring30} expiry date(s) within 30 days and ${a.assurance.subtierCertificatesExpired} already expired. These are distinct from supplier approval expiry.`,
    ],
    priorities: [
      ...(a.actions.overdue ? ['Review overdue QBR actions with accountable owners and agree recovery dates.'] : []),
      ...(a.assurance.overdueReviews ? ['Complete overdue supplier reviews and record any approval decision.'] : []),
      ...(a.assurance.subtierCertificatesExpired ? ['Review expired sub-tier certificate records and confirm current evidence.'] : []),
      ...(a.withoutQbr ? ['Resolve performance-data gaps before making portfolio-wide performance claims.'] : []),
    ],
    warnings: a.warnings, methodology: a.methodology,
    reviewNote: 'Draft for leadership review. Validate source coverage and agree decisions before issue. This report does not approve suppliers or verify corrective actions.',
  };
}
