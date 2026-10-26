/**
 * RPG Excellence — shared NC register, management-board and report calculations.
 * Read-only. Supply only records authorised by the server for this workspace.
 * Device drafts are deliberately excluded from controlled counts.
 * Date filters select the raised-date cohort; status remains the current status.
 */
export const NC_AGE_BANDS = Object.freeze([
  { key: '0_30', label: '0–30 days', min: 0, max: 30, color: '#13979a' },
  { key: '31_60', label: '31–60 days', min: 31, max: 60, color: '#d8ac3d' },
  { key: '61_90', label: '61–90 days', min: 61, max: 90, color: '#df843b' },
  { key: 'over_90', label: 'Over 90 days', min: 91, max: Infinity, color: '#cd4b5d' },
]);
export const NC_WORKFLOW = Object.freeze([
  { key: 'open', label: 'Response due', color: '#cc5b55' },
  { key: 'assigned', label: 'Owner assigned', color: '#c49d3c' },
  { key: 'capa', label: 'CAPA-8D linked', color: '#286aaf' },
  { key: 'submitted', label: 'Auditor review', color: '#7d68aa' },
  { key: 'returned', label: 'Returned for action', color: '#d27b41' },
  { key: 'verification', label: 'Closure verification pending', color: '#7a72b1' },
  { key: 'closed', label: 'Verified closed', color: '#168d84' },
]);
const DAY = 86400000;
const EXCLUDED = new Set(['withdrawn', 'cancelled', 'canceled', 'deleted', 'void']);
const text = value => typeof value === 'string' ? value.trim() : '';
const lower = value => text(value).toLowerCase();
const array = value => Array.isArray(value) ? value : [];
const label = value => text(value).replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
const rounded = value => Math.round(value * 10) / 10;
const mean = values => values.length ? rounded(values.reduce((a, b) => a + b, 0) / values.length) : null;

export function nonconformityDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}(?:$|T)/.test(value)) return null;
  const key = value.slice(0, 10), date = new Date(key + 'T00:00:00Z');
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== key) return null;
  if (value.length === 10) return key;
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})$/.test(value)) return null;
  const instant = Date.parse(value);
  return Number.isFinite(instant) ? new Date(instant).toISOString().slice(0, 10) : null;
}
function validTime(value) {
  if (!nonconformityDate(value)) return null;
  if (value.length > 10 && !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})$/.test(value)) return null;
  const time = Date.parse(value.length === 10 ? value + 'T00:00:00Z' : value);
  return Number.isFinite(time) ? time : null;
}
function calendarDays(start, end) {
  const a = nonconformityDate(start), b = nonconformityDate(end);
  if (!a || !b || b < a) return null;
  return Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / DAY);
}
function latestUnique(rows) {
  const result = new Map();
  for (const row of array(rows)) {
    if (!row || !text(row.id)) continue;
    const prior = result.get(row.id);
    const stamp = validTime(row.updated_at) ?? validTime(row.created_at) ?? 0;
    const old = prior ? validTime(prior.updated_at) ?? validTime(prior.created_at) ?? 0 : -1;
    if (!prior || stamp >= old) result.set(row.id, row);
  }
  return [...result.values()];
}
function currentAccess(rows) {
  const result = new Map();
  const sorted = latestUnique(rows).sort((a, b) =>
    (validTime(b.updated_at) ?? validTime(b.created_at) ?? 0) - (validTime(a.updated_at) ?? validTime(a.created_at) ?? 0) || b.id.localeCompare(a.id));
  for (const row of sorted) if (text(row.finding_id) && !result.has(row.finding_id)) result.set(row.finding_id, row);
  return result;
}
function workflow(finding, access) {
  // Verification of the finding is authoritative; a closed linked CAPA alone
  // never closes its originating NC. Preserve the existing action-access flow.
  if (lower(finding.status) === 'closed' && finding.closure_verified === true) return 'closed';
  if (lower(access?.status) === 'returned') return 'returned';
  if (lower(access?.status) === 'submitted') return 'submitted';
  if (lower(access?.status) === 'assigned') return 'assigned';
  if (lower(finding.status) === 'closed') return 'verification';
  if (text(finding.linked_rca_case_id)) return 'capa';
  return 'open';
}

export function buildNonconformityRows(snapshot = {}) {
  const accesses = currentAccess(snapshot.access);
  const audits = new Map(latestUnique(snapshot.audits).map(row => [row.id, row]));
  const suppliers = new Map(latestUnique(snapshot.suppliers).map(row => [row.id, row]));
  const cases = new Map(latestUnique(snapshot.capaCases).map(row => [row.id, row]));
  return latestUnique(snapshot.findings)
    .filter(f => ['major_nc', 'minor_nc'].includes(lower(f.finding_type)) && !EXCLUDED.has(lower(f.status)))
    .map(f => {
      const access = accesses.get(f.id), audit = audits.get(f.audit_id), supplier = suppliers.get(f.supplier_id);
      const stateKey = workflow(f, access), state = NC_WORKFLOW.find(s => s.key === stateKey);
      const manual = lower(f.source_type) === 'manual' || !f.audit_id;
      const linkedCapaId = text(f.linked_rca_case_id) || null;
      return {
        id: f.id, reference: text(f.finding_reference) || 'Reference unavailable',
        title: text(f.title) || 'Untitled nonconformity',
        classification: lower(f.finding_type), classificationLabel: lower(f.finding_type) === 'major_nc' ? 'Major NC' : 'Minor NC',
        risk: ['critical', 'high', 'medium', 'low'].includes(lower(f.risk_level)) ? lower(f.risk_level) : 'unknown',
        sourceType: manual ? 'manual' : 'audit', sourceCategory: text(f.source_category) || (manual ? 'other' : 'internal_audit'),
        sourceReference: text(f.source_reference),
        sourceAuditId: text(f.source_audit_id)||null,
        sourceAuditReference: text(f.source_audit_reference)||text(audits.get(f.source_audit_id)?.audit_reference),
        sourceAuditTitle: text(f.source_audit_title)||text(audits.get(f.source_audit_id)?.title),
        location: text(f.process_area) || 'Not recorded',
        raisedDate: nonconformityDate(f.created_at), raisedAt: validTime(f.created_at),
        detectedDate: nonconformityDate(f.detected_at), dueDate: nonconformityDate(f.agreed_date),
        verifiedDate: stateKey === 'closed' ? nonconformityDate(f.closure_verified_at) : null,
        verifiedAt: stateKey === 'closed' ? validTime(f.closure_verified_at) : null,
        ownerId: text(access?.assignee_person_id) || null,
        assigneeUserId: text(access?.assignee_user_id) || null,
        ownerName: text(access?.assignee_name) || text(f.responsible_owner_name) || null,
        accessId: text(access?.id) || null,
        auditId: text(f.audit_id) || null, auditReference: text(audit?.audit_reference),
        supplierId: text(f.supplier_id) || null, supplierName: text(supplier?.legal_name),
        status: lower(f.status), stateKey, stateLabel: state.label, stateColor: state.color,
        closed: stateKey === 'closed', linkedCapaId,
        linkedCapaStatus: linkedCapaId ? text(cases.get(linkedCapaId)?.status) || null : null,
        criteria: text(f.criteria), objectiveEvidence: text(f.objective_evidence), failureStatement: text(f.failure_statement),
        requirementSource: text(f.requirement_source), requirementStandardId: text(f.requirement_standard_id),
        requirementReference: text(f.clause), evidenceSource: text(f.evidence_source),
        requirementStandardLabel: text(array(snapshot.requirementStandards).find(s=>s.id===f.requirement_standard_id)?.standard_code),
        recordHref: manual
          ? `/portal/internal-audit-actions?record=${encodeURIComponent(f.id)}#nc-${encodeURIComponent(f.id)}`
          : `/portal/internal-audits/${encodeURIComponent(f.audit_id)}#action-${encodeURIComponent(f.id)}`,
      };
    });
}

export function buildNonconformityAnalytics(snapshot = {}, filters = {}, options = {}) {
  const today = nonconformityDate(options.today || snapshot.asOf) || new Date().toISOString().slice(0, 10);
  const from = filters.from ? nonconformityDate(filters.from) : null;
  const to = filters.to ? nonconformityDate(filters.to) : null;
  if ((filters.from && !from) || (filters.to && !to) || (from && to && from > to)) throw new Error('Select a valid NC reporting date range.');
  const rows = buildNonconformityRows(snapshot).map(row => {
    const openAgeDays = row.closed ? null : calendarDays(row.raisedDate, today);
    // An actual verification timestamp is required. Never substitute updated_at
    // or an unverified closure date for the independent verification event.
    const closureDays = row.closed && row.raisedAt !== null && row.verifiedAt !== null && row.verifiedAt >= row.raisedAt && row.verifiedDate <= today
      ? Math.floor((row.verifiedAt - row.raisedAt) / DAY) : null;
    const daysUntilDue = row.dueDate ? Math.round((Date.parse(row.dueDate + 'T00:00:00Z') - Date.parse(today + 'T00:00:00Z')) / DAY) : null;
    return { ...row, openAgeDays, closureDays,
      overdue: !row.closed && daysUntilDue !== null && daysUntilDue < 0,
      dueSoon: !row.closed && daysUntilDue !== null && daysUntilDue >= 0 && daysUntilDue <= 7,
      unassigned: !row.closed && !row.ownerName && !row.ownerId && !row.assigneeUserId,
    };
  });
  const q = lower(filters.query);
  const scope = rows.filter(r =>
    (!from || (r.raisedDate && r.raisedDate >= from)) && (!to || (r.raisedDate && r.raisedDate <= to)) &&
    (!filters.classification || filters.classification === 'all' || r.classification === filters.classification) &&
    (!filters.risk || filters.risk === 'all' || r.risk === filters.risk) &&
    (!filters.source || filters.source === 'all' || r.sourceCategory === filters.source || r.sourceType === filters.source) &&
    (!filters.owner || filters.owner === 'all' || (filters.owner === 'unassigned' ? r.unassigned : r.ownerName === filters.owner)) &&
    (!filters.location || filters.location === 'all' || r.location === filters.location) &&
    (!filters.supplierId || r.supplierId === filters.supplierId) &&
    (!q || lower([r.reference, r.title, r.ownerName, r.location, r.sourceReference, r.supplierName, r.auditReference].join(' ')).includes(q)));
  const open = scope.filter(r => !r.closed), closed = scope.filter(r => r.closed);
  const overdue = open.filter(r => r.overdue), dueSoon = open.filter(r => r.dueSoon), unassigned = open.filter(r => r.unassigned);
  const ages = open.map(r => r.openAgeDays).filter(v => v !== null), durations = closed.map(r => r.closureDays).filter(v => v !== null);
  const ageing = NC_AGE_BANDS.map(b => ({ key: b.key, label: b.label, color: b.color, count: open.filter(r => r.openAgeDays !== null && r.openAgeDays >= b.min && r.openAgeDays <= b.max).length }));
  const classification = ['major_nc', 'minor_nc'].map(key => ({ key, label: key === 'major_nc' ? 'Major NC' : 'Minor NC', count: scope.filter(r => r.classification === key).length, open: open.filter(r => r.classification === key).length }));
  const workflows = NC_WORKFLOW.map(stage => ({ ...stage, count: scope.filter(r => r.stateKey === stage.key).length }));
  const oldestOpen = [...open].filter(r => r.openAgeDays !== null).sort((a, b) => b.openAgeDays - a.openAgeDays || a.id.localeCompare(b.id))[0] || null;
  // KPI cards/age bars filter the records beneath them, not their own base totals.
  let visible = scope;
  const statusFilter = filters.status || 'all';
  if (statusFilter === 'open') visible = open;
  else if (statusFilter === 'closed') visible = closed;
  else if (statusFilter === 'overdue') visible = overdue;
  else if (statusFilter === 'due_soon') visible = dueSoon;
  else if (statusFilter === 'open_major') visible = open.filter(r => r.classification === 'major_nc');
  else if (statusFilter === 'unassigned') visible = unassigned;
  else if (statusFilter === 'follow_up') visible = open.filter(r => r.stateKey !== 'open');
  else if (statusFilter === 'assigned_to_me') visible = open.filter(r => snapshot.currentUserId && r.assigneeUserId === snapshot.currentUserId);
  else if (statusFilter !== 'all') visible = scope.filter(r => r.stateKey === statusFilter);
  if (filters.ageBand) {
    const band = NC_AGE_BANDS.find(b => b.key === filters.ageBand);
    visible = band ? visible.filter(r => !r.closed && r.openAgeDays !== null && r.openAgeDays >= band.min && r.openAgeDays <= band.max) : [];
  }
  visible = [...visible].sort((a, b) => Number(b.overdue) - Number(a.overdue) || (a.dueDate || '9999-12-31').localeCompare(b.dueDate || '9999-12-31') || a.reference.localeCompare(b.reference));
  const total = scope.length;
  return {
    asOf: today, filters: { ...filters, from, to }, rows: scope, visibleRows: visible,
    total, open: open.length, closed: closed.length, overdue: overdue.length, dueSoon: dueSoon.length, unassigned: unassigned.length,
    followUp: open.filter(r => r.stateKey !== 'open').length,
    closureRate: total ? rounded(closed.length / total * 100) : null,
    averageOpenAge: mean(ages), averageClosureTime: mean(durations),
    oldestOpen, ageing, classification, workflows,
    linkedCapaCount: scope.filter(r => r.linkedCapaId).length,
    attention: [
      { key: 'overdue', label: 'Overdue NCs', count: overdue.length, color: '#cd4b5d' },
      { key: 'open_major', label: 'Open major NCs', count: open.filter(r => r.classification === 'major_nc').length, color: '#d19f35' },
      { key: 'due_soon', label: 'Due within 7 days', count: dueSoon.length, color: '#bf9346' },
      { key: 'submitted', label: 'Awaiting auditor review', count: open.filter(r => r.stateKey === 'submitted').length, color: '#587ab4' },
      { key: 'unassigned', label: 'Unassigned open NCs', count: unassigned.length, color: '#ae7e4a' },
    ],
    coverage: {
      age: { recorded: ages.length, total: open.length, missing: open.length - ages.length },
      closureTime: { recorded: durations.length, total: closed.length, missing: closed.length - durations.length },
      openWithoutDueDate: open.filter(r => !r.dueDate).length,
      missingRaisedDate: scope.filter(r => !r.raisedDate).length,
      missingRaisedDateExcludedByPeriod: (from || to) ? rows.filter(r => !r.raisedDate).length : 0,
    },
    facets: {
      owners: [...new Set(rows.map(r => r.ownerName).filter(Boolean))].sort(),
      locations: [...new Set(rows.map(r => r.location))].sort(),
      sources: [...new Set(rows.map(r => r.sourceCategory))].sort(),
    },
    methodology: [
      'Only saved Major and Minor NCs are included. Device drafts and excluded or withdrawn records are not controlled totals.',
      'Date filters select NCs by their raised date. Workflow and closure show current saved status, not historical status at the period end.',
      'A finding is verified closed only when its status is closed and its closure verification flag is true. Closing a linked CAPA alone does not close the NC.',
      'Open age uses calendar days since the NC was raised. Closure time uses completed 24-hour periods from creation to the recorded verification timestamp.',
      'Unknown, invalid or future age dates and missing or inconsistent verification timestamps are excluded from the corresponding averages and disclosed in coverage.',
      'Overdue means the agreed date is before the current UTC date. A response due today is not overdue. Due within seven days includes today.',
      'Workflow stages are mutually exclusive. Attention measures can overlap. A linked CAPA is shown against its finding and never added as another NC.',
      'Recorded process/location labels are not presented as verified links to administrative sites or zones.',
    ],
  };
}

export function buildNonconformityExecutiveBrief(analytics, organizationName = 'Organisation') {
  const a = analytics;
  const days = value => value === null ? 'unavailable' : `${value} days`;
  return {
    title: 'Nonconformity performance — leadership review', organizationName: text(organizationName) || 'Organisation',
    asOf: a.asOf, period: { from: a.filters.from, to: a.filters.to },
    paragraphs: [
      `The selected portfolio contains ${a.total} controlled NC(s): ${a.open} unresolved and ${a.closed} verified closed. The current verified closure rate is ${a.closureRate === null ? 'unavailable' : a.closureRate + '%'}.`,
      `${a.overdue} unresolved NC(s) are past the agreed date, ${a.dueSoon} fall due within seven days and ${a.unassigned} have no recorded owner. These attention measures may overlap.`,
      `Average open age is ${days(a.averageOpenAge)}, using ${a.coverage.age.recorded}/${a.coverage.age.total} unresolved NC(s) with valid dates. Average time to recorded verification is ${days(a.averageClosureTime)}, using ${a.coverage.closureTime.recorded}/${a.coverage.closureTime.total} verified-closed NC(s).`,
      `${a.linkedCapaCount} NC(s) have a linked CAPA-8D case. These links are included within the NC register and do not increase the controlled NC total.`,
    ],
    priorities: [
      ...(a.overdue ? ['Agree recovery actions for overdue NCs with their accountable owners.'] : []),
      ...(a.unassigned ? ['Assign accountable owners to unresolved NCs without recorded ownership.'] : []),
      ...(a.coverage.closureTime.missing ? ['Resolve missing verification dates before using closure-time performance for leadership decisions.'] : []),
      ...(a.coverage.openWithoutDueDate ? ['Confirm agreed response dates for open NCs where no valid date is recorded.'] : []),
    ],
    methodology: a.methodology,
    reviewNote: 'Draft for leadership review. Confirm evidence, ownership and decisions before issue. Approval and independent verification remain within the controlled online workflow.',
  };
}
