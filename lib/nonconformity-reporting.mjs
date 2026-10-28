/**
 * RPG Excellence — shared NC register, management-board and report calculations.
 * Read-only. Supply only records authorised by the server for this workspace.
 * Device drafts are deliberately excluded from controlled counts.
 * Date filters select the raised-date cohort; status remains the current status.
 */
export const FINDING_CLASSIFICATIONS = Object.freeze([
  {key:'major_nc',label:'Major NC',color:'#123d6b',isNonconformity:true,guide:'A systemic failure, absent or ineffective control, or significant loss of ability to meet an applicable requirement.'},
  {key:'minor_nc',label:'Minor NC',color:'#168f99',isNonconformity:true,guide:'An evidenced, isolated failure to meet a requirement without evidence of a wider system breakdown.'},
  {key:'observation',label:'Observation',color:'#bd8b32',isNonconformity:false,guide:'An evidence-based concern or potential weakness where a failure to meet a requirement has not been established. Review and record the action decision.'},
  {key:'ofi',label:'OFI',color:'#7864a7',isNonconformity:false,guide:'An opportunity to improve an otherwise conforming process. Implementation is optional; record the review decision.'},
]);
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
    .filter(f => FINDING_CLASSIFICATIONS.some(c => c.key === lower(f.finding_type)) && !EXCLUDED.has(lower(f.status)))
    .map(f => {
      const access = accesses.get(f.id), audit = audits.get(f.audit_id), supplier = suppliers.get(f.supplier_id);
      const stateKey = workflow(f, access), state = NC_WORKFLOW.find(s => s.key === stateKey);
      const manual = lower(f.source_type) === 'manual' || !f.audit_id;
      const linkedCapaId = text(f.linked_rca_case_id) || null;
      return {
        id: f.id, reference: text(f.finding_reference) || 'Reference unavailable',
        title: text(f.title) || 'Untitled nonconformity',
        classification: lower(f.finding_type), classificationLabel: FINDING_CLASSIFICATIONS.find(c=>c.key===lower(f.finding_type)).label,
        isNonconformity: ['major_nc','minor_nc'].includes(lower(f.finding_type)),
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
        status: lower(f.status), stateKey, stateLabel: !['major_nc','minor_nc'].includes(lower(f.finding_type)) && stateKey === 'open' ? 'Review decision pending' : state.label, stateColor: state.color,
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
  const findingScope = rows.filter(r =>
    (!from || (r.raisedDate && r.raisedDate >= from)) && (!to || (r.raisedDate && r.raisedDate <= to)) &&
    (!filters.classification || filters.classification === 'all' || r.classification === filters.classification) &&
    (!filters.risk || filters.risk === 'all' || r.risk === filters.risk) &&
    (!filters.source || filters.source === 'all' || r.sourceCategory === filters.source || r.sourceType === filters.source) &&
    (!filters.owner || filters.owner === 'all' || (filters.owner === 'unassigned' ? r.unassigned : r.ownerName === filters.owner)) &&
    (!filters.location || filters.location === 'all' || r.location === filters.location) &&
    (!filters.supplierId || r.supplierId === filters.supplierId) &&
    (!q || lower([r.reference, r.title, r.ownerName, r.location, r.sourceReference, r.supplierName, r.auditReference].join(' ')).includes(q)));
  const scope = findingScope.filter(r=>r.isNonconformity);
  const improvementRows = findingScope.filter(r=>!r.isNonconformity);
  const open = scope.filter(r => !r.closed), closed = scope.filter(r => r.closed);
  const overdue = open.filter(r => r.overdue), dueSoon = open.filter(r => r.dueSoon), unassigned = open.filter(r => r.unassigned);
  const ages = open.map(r => r.openAgeDays).filter(v => v !== null), durations = closed.map(r => r.closureDays).filter(v => v !== null);
  const ageing = NC_AGE_BANDS.map(b => ({ key: b.key, label: b.label, color: b.color, count: open.filter(r => r.openAgeDays !== null && r.openAgeDays >= b.min && r.openAgeDays <= b.max).length }));
  const classification = FINDING_CLASSIFICATIONS.map(c=>({...c,count:findingScope.filter(r=>r.classification===c.key).length,open:findingScope.filter(r=>!r.closed&&r.classification===c.key).length}));
  const workflows = NC_WORKFLOW.map(stage => ({ ...stage, count: scope.filter(r => r.stateKey === stage.key).length }));
  const oldestOpen = [...open].filter(r => r.openAgeDays !== null).sort((a, b) => b.openAgeDays - a.openAgeDays || a.id.localeCompare(b.id))[0] || null;
  // KPI cards/age bars filter the records beneath them, not their own base totals.
  let visible = findingScope;
  const statusFilter = filters.status || 'all';
  if (statusFilter === 'open') visible = open;
  else if (statusFilter === 'closed') visible = closed;
  else if (statusFilter === 'overdue') visible = overdue;
  else if (statusFilter === 'due_soon') visible = dueSoon;
  else if (statusFilter === 'open_major') visible = open.filter(r => r.classification === 'major_nc');
  else if (statusFilter === 'unassigned') visible = unassigned;
  else if (statusFilter === 'follow_up') visible = open.filter(r => r.stateKey !== 'open');
  else if (statusFilter === 'assigned_to_me') visible = findingScope.filter(r=>!r.closed).filter(r => snapshot.currentUserId && r.assigneeUserId === snapshot.currentUserId);
  else if (statusFilter !== 'all') visible = scope.filter(r => r.stateKey === statusFilter);
  if (filters.ageBand) {
    const band = NC_AGE_BANDS.find(b => b.key === filters.ageBand);
    visible = band ? visible.filter(r => !r.closed && r.openAgeDays !== null && r.openAgeDays >= band.min && r.openAgeDays <= band.max) : [];
  }
  visible = [...visible].sort((a, b) => Number(b.overdue) - Number(a.overdue) || (a.dueDate || '9999-12-31').localeCompare(b.dueDate || '9999-12-31') || a.reference.localeCompare(b.reference));
  const total = scope.length;
  return {
    asOf: today, filters: { ...filters, from, to }, rows: scope, visibleRows: visible,
    findingRows:findingScope, improvementRows, findingTotal:findingScope.length,
    observationCount:improvementRows.filter(r=>r.classification==='observation').length,
    ofiCount:improvementRows.filter(r=>r.classification==='ofi').length,
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
      'The register and classification chart include Major NC, Minor NC, Observation and OFI. NC KPIs, ageing, overdue counts and closure rates include Major and Minor only; Observations and OFIs are reported separately. Device drafts and withdrawn records are excluded.',
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
      `${a.observationCount} observation(s) and ${a.ofiCount} OFI(s) are recorded separately from the ${a.total} NC(s). These improvement findings do not imply a proven failure or automatically require CAPA-8D.`,
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

/**
 * Audit fieldwork scope and coverage. Read-only calculations shared by the
 * existing audit page and server actions. Callers must first authorise the
 * company, audit, module and commercial entitlement; this module grants none.
 * A question-bank count is not a certification of standard completeness.
 */
const AUDIT_FINDING_TYPES = new Set(FINDING_CLASSIFICATIONS.map(item => item.key));
const AUDIT_FINDING_PRIORITY = { major_nc: 0, minor_nc: 1, observation: 2, ofi: 3 };
const auditArray = value => Array.isArray(value) ? value : [];
const auditText = value => typeof value === 'string' ? value.trim() : '';
const auditUnique = values => [...new Set(values.filter(Boolean))];

// Resolve stored bank labels through the explicit catalogue edition. Generic
// labels never override a more specific edition or silently stand in for 2026.
export function auditReferenceBankCandidates(selection = {}) {
  const relation = selection.internal_audit_standard_catalogue;
  const catalogue = (Array.isArray(relation) ? relation[0] : relation) || selection;
  const code = auditText(catalogue?.standard_code), display = auditText(catalogue?.display_name);
  const edition = auditText(catalogue?.edition_label);
  const exact = auditUnique([
    display && display !== code ? display : '',
    /:\d{4}/.test(code) ? code : '',
    code && /^\d{4}(?:\/.*)?$/.test(edition) && !/:\d{4}/.test(code) ? `${code}:${edition}` : '',
  ]);
  const bases = auditUnique(exact.map(name => {
    const match = /^(.+:\d{4})\/Amd\s*\d+:\d{4}$/i.exec(name);
    return match ? match[1] : '';
  }));
  const labels = !exact.length ? auditUnique([display, code]) : [];
  return { exact, bases, labels, names: auditUnique([...exact, ...bases, ...labels]) };
}

export function resolveAuditReferenceBank(selection, availableNames = []) {
  const candidates = auditReferenceBankCandidates(selection), available = new Set(auditArray(availableNames));
  const result = (names, match, amendmentReviewRequired = false) => ({
    status: names.length === 1 ? 'available' : names.length ? 'ambiguous' : 'missing',
    names, match, amendmentReviewRequired,
  });
  const exact = candidates.exact.filter(name => available.has(name));
  if (exact.length) return result(exact, 'exact_catalogue_edition');
  const bases = candidates.bases.filter(name => available.has(name));
  if (bases.length) return result(bases, 'same_base_edition', true);
  return result(candidates.labels.filter(name => available.has(name)), 'catalogue_label');
}

function auditClauseReference(value) {
  const raw = auditText(value).replace(/^clause\s+/i, '').replace(/^annex\s+/i, '')
    .replace(/\.\*$/, '').replace(/^(\d+(?:\.\d+)*)-RPG-\d+$/i, '$1').toUpperCase();
  const match = /^(?:([A-Z])(?:\.)?)?(\d+(?:\.\d+)*)?([A-Z])?$/.exec(raw);
  if (!match || (!match[1] && !match[2]) || (match[3] && !match[2])) return null;
  const parts = match[2] ? match[2].split('.').map(Number) : [];
  if (parts.length > 16 || parts.some(n => !Number.isSafeInteger(n) || n >= Number.MAX_SAFE_INTEGER)) return null;
  return { prefix: match[1] || '', parts, point: match[3] || '', raw };
}
function auditCompareParts(a, b) {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    if ((a[i] ?? 0) !== (b[i] ?? 0)) return (a[i] ?? 0) - (b[i] ?? 0);
  }
  return 0;
}

export function parseAuditClauseScope(value) {
  let source = value;
  if (typeof source === 'string' && source.trim().startsWith('[')) {
    try { source = JSON.parse(source); } catch { return { selectors: [], invalid: [source] }; }
  }
  if (source == null || source === '') return { selectors: [], invalid: [] };
  if (!Array.isArray(source) && typeof source !== 'string') return { selectors: [], invalid: ['Unsupported clause selection format'] };
  const selectors = [], invalid = [];
  for (const item of Array.isArray(source) ? source : [source]) {
    if (typeof item !== 'string') { invalid.push('Non-text clause selection'); continue; }
    // RPG suffixes identify local questions, not additional standard clauses.
    // Keep stored identities unchanged; interpret only their explicit base reference.
    const cleaned = item.trim().replace(/\bclauses?\s+/ig, '').replace(/\bannex\s+/ig, '')
      .replace(/(\d+(?:\.\d+)*)-RPG-\d+\b/ig, '$1')
      .replace(/[–—]/g, '-').replace(/\s+to\s+/ig, '-').replace(/\s*-\s*/g, '-')
      .replace(/(\d+(?:\.\d+)*)\s*\(([A-Z])\)/ig, '$1$2')
      .replace(/(\d+(?:\.\d+)*)\s+([A-Z])(?=\s*(?:[-,;|\n]|$))/ig, '$1$2');
    if (!cleaned || /^(?:all|all clauses|full)$/i.test(item.trim())) continue;
    for (const token of cleaned.split(/[,;|\n]+|\s+and\s+|\s*&\s*|\s+/i).filter(Boolean)) {
      const range = token.split('-'), start = auditClauseReference(range[0]);
      let end = range.length === 2 ? auditClauseReference(range[1]) : null;
      if (start?.point && range.length === 2 && /^[A-Z]$/i.test(range[1])) {
        end = { ...start, point: range[1].toUpperCase(), raw: start.raw.replace(/[A-Z]$/, range[1].toUpperCase()) };
      }
      const invalidRange = range.length === 2 && (!end || start?.prefix !== end.prefix ||
        start?.parts.length !== end.parts.length || Boolean(start?.point) !== Boolean(end.point) ||
        (start?.point && auditCompareParts(start.parts, end.parts) !== 0) ||
        (start && (auditCompareParts(start.parts, end.parts) > 0 ||
          (auditCompareParts(start.parts, end.parts) === 0 && start.point > end.point))));
      if (!start || range.length > 2 || invalidRange) { invalid.push(token); continue; }
      if (!selectors.some(s => s.raw === token)) selectors.push({ raw: token, start, end });
    }
  }
  return { selectors, invalid };
}

// Finite numeric bounds are used for hierarchy-aware intersection. No clause
// numbers or requirements are generated from an interval; no stored row changes.
function auditClauseBound(reference, upper = false) {
  const parts = [...reference.parts];
  let point = reference.point ? reference.point.charCodeAt(0) - 64 : 0;
  if (upper) {
    if (point) point++;
    else if (parts.length) parts[parts.length - 1]++;
    else parts.push(Infinity);
  }
  return [...Array.from({ length: 16 }, (_, index) => parts[index] || 0), point];
}
function auditSelectorInterval(selector) {
  return { prefix: selector.start.prefix, low: auditClauseBound(selector.start), high: auditClauseBound(selector.end || selector.start, true) };
}
function auditIntervalIntersection(a, b) {
  if (a.prefix !== b.prefix) return null;
  const low = auditCompareParts(a.low, b.low) >= 0 ? a.low : b.low;
  const high = auditCompareParts(a.high, b.high) <= 0 ? a.high : b.high;
  return auditCompareParts(low, high) < 0 ? { prefix: a.prefix, low, high } : null;
}
function auditSelectorDepth(selector) { return selector.start.parts.length + (selector.start.point ? 1 : 0); }

export function auditClauseMatches(reference, selector) {
  if (!selector?.start) return false;
  const parsed = parseAuditClauseScope(reference);
  if (parsed.invalid.length) return false;
  const target = auditSelectorInterval(selector);
  // Deliberately retain the coverage guard: an explicit clause-6 reference,
  // or range 4-6, cannot establish every detailed child requirement such as 6.1.1.
  return parsed.selectors.some(candidate => auditSelectorDepth(candidate) >= auditSelectorDepth(selector) &&
    Boolean(auditIntervalIntersection(auditSelectorInterval(candidate), target)));
}

export function auditClauseScopesOverlap(left, right) {
  const a = parseAuditClauseScope(left), b = parseAuditClauseScope(right);
  return !a.invalid.length && !b.invalid.length && a.selectors.some(x => b.selectors.some(y =>
    Boolean(auditIntervalIntersection(auditSelectorInterval(x), auditSelectorInterval(y)))));
}

function auditScopeAllows(clause, included, excluded) {
  const parsed = parseAuditClauseScope(clause);
  // Preserve invalid input for the caller's diagnostic instead of hiding it.
  if (parsed.invalid.length) return true;
  for (const candidate of parsed.selectors) {
    const source = auditSelectorInterval(candidate);
    const selected = included.length ? included.map(s => auditIntervalIntersection(source, auditSelectorInterval(s))).filter(Boolean) : [source];
    for (const interval of selected) {
      const omitted = excluded.map(s => auditIntervalIntersection(interval, auditSelectorInterval(s))).filter(Boolean)
        .sort((a, b) => auditCompareParts(a.low, b.low));
      let cursor = interval.low;
      for (const omission of omitted) {
        if (auditCompareParts(omission.low, cursor) > 0) return true;
        if (auditCompareParts(omission.high, cursor) > 0) cursor = omission.high;
        if (auditCompareParts(cursor, interval.high) >= 0) break;
      }
      if (auditCompareParts(cursor, interval.high) < 0) return true;
    }
  }
  return false;
}

export function buildAuditFieldworkScope(input = {}) {
  const selections = auditArray(input.selectedStandards), processes = auditArray(input.selectedProcesses);
  const allQuestions = latestUnique(input.questions), bank = new Map(allQuestions.map(row => [row.id, row]));
  const active = allQuestions.filter(question => question.active === true);
  const links = auditArray(input.links), issues = [], result = new Map(), standards = [], excluded = [];
  const issue = (code, standardId, message, details = [], blocking = true) => issues.push({ code, standardId, message, details, blocking });
  const seenStandards = new Set();
  for (const selection of selections) {
    const standardId = auditText(selection.standard_id);
    if (!standardId) { issue('missing_standard_identity', null, 'A selected standard has no controlled catalogue identity.'); continue; }
    if (seenStandards.has(standardId)) { issue('duplicate_standard_selection', standardId, 'The same standard is selected more than once. Review its scope.'); continue; }
    seenStandards.add(standardId);
    const catalogue = Array.isArray(selection.internal_audit_standard_catalogue)
      ? selection.internal_audit_standard_catalogue[0] : selection.internal_audit_standard_catalogue;
    const standardLabel = auditText(catalogue?.display_name) || auditText(catalogue?.standard_code) || standardId;
    const included = parseAuditClauseScope(selection.included_clauses), omitted = parseAuditClauseScope(selection.excluded_clauses);
    if (included.invalid.length || omitted.invalid.length) issue('unrecognised_clause_scope', standardId,
      'Some approved clause selections could not be interpreted. Review them before completing fieldwork.', [...included.invalid, ...omitted.invalid]);
    if (omitted.selectors.length && !auditText(selection.exclusion_justification || input.exclusionJustification)) {
      issue('exclusion_reason_missing', standardId, 'Excluded clauses need a recorded scope justification.');
    }
    const full = String(selection.full_or_partial || '').toLowerCase() === 'full';
    const processKeys = new Set(processes.filter(p => p.standard_id === standardId).map(p => auditText(p.scope_key)).filter(Boolean));
    if (!full && !processKeys.size && !included.selectors.length) issue('partial_scope_unspecified', standardId,
      'This partial audit has no selected processes or included clauses. Confirm the approved scope.');
    const standardLinks = links.filter(link => link.standard_id === standardId);
    const native = active.filter(question => question.standard_id === standardId);
    const unmapped = native.filter(question => !standardLinks.some(link => link.question_id === question.id));
    const unresolvedUnmapped = unmapped.filter(question => !parseAuditClauseScope(question.clause).selectors.length || parseAuditClauseScope(question.clause).invalid.length > 0 ||
      auditScopeAllows(question.clause, included.selectors, omitted.selectors));
    if (unresolvedUnmapped.length) issue('active_questions_without_process_mapping', standardId,
      'Active questions have no mapping to this standard. They require mapping review; full or clause-defined scope retains applicable native questions.',
      unresolvedUnmapped.map(question => ({ id: question.id, code: question.question_code || null, clause: question.clause || null })));
    const broken = standardLinks.filter(link => !bank.has(link.question_id));
    if (broken.length) issue('missing_mapped_question', standardId, 'Mappings refer to questions that were not loaded. Load the complete mapped question bank.',
      auditUnique(broken.map(link => link.question_id)));
    const retired = standardLinks.filter(link => bank.has(link.question_id) && bank.get(link.question_id).active !== true &&
      (full || !processKeys.size || processKeys.has(link.scope_key)) && auditScopeAllows(link.clause, included.selectors, omitted.selectors));
    if (retired.length) issue('retired_question_mapping', standardId, 'Selected scope still maps to inactive questions. Review replacement coverage.', auditUnique(retired.map(link => link.question_id)));
    for (const key of processKeys) if (!standardLinks.some(link => link.scope_key === key && bank.get(link.question_id)?.active === true)) {
      issue('selected_process_without_questions', standardId, 'A selected process has no active mapped audit questions.', [key]);
    }
    const candidates = new Map();
    function consider(question, link, nativeFallback = false) {
      if (!question || question.active !== true) return;
      // A mapped question may be held under another standard's bank. Keep its
      // controlled mapping to this selected standard instead of filtering it out.
      const mappedClause = auditText(link?.clause);
      const nativeClause = question.standard_id === standardId ? auditText(question.clause) : '';
      const mappingReference = auditClauseReference(mappedClause);
      const nativeSelectors = parseAuditClauseScope(nativeClause);
      const refinedNativeClause = nativeClause && mappingReference && nativeSelectors.selectors.length === 1 &&
        !nativeSelectors.selectors[0].end && !nativeSelectors.invalid.length &&
        auditClauseMatches(nativeClause, { start: mappingReference, end: null });
      const clause = nativeFallback ? nativeClause : refinedNativeClause ? nativeClause : mappedClause || nativeClause;
      if (!clause || !parseAuditClauseScope(clause).selectors.length || parseAuditClauseScope(clause).invalid.length) {
        issue('question_clause_missing', standardId, 'A potentially applicable question has no usable clause reference.', [question.id]);
        return;
      }
      if (!auditScopeAllows(clause, included.selectors, omitted.selectors)) {
        excluded.push({ questionId: question.id, standardId, clause, reason: 'Outside approved clause selection' }); return;
      }
      if (!full && processKeys.size && (!link || !processKeys.has(link.scope_key))) return;
      if (!full && !processKeys.size && !included.selectors.length) return;
      const mapping = { ...(link || {}), question_id: question.id, standard_id: standardId,
        clause, scope_key: link?.scope_key || null, standard_label: standardLabel,
        requirement_summary: auditText(link?.requirement_summary) || auditText(question.requirement_summary),
        coverage_source: nativeFallback ? 'native_question_requires_mapping_review' : 'controlled_scope_mapping' };
      const own = candidates.get(question.id) || { ...question, criteria_links: [] };
      if (!own.criteria_links.some(m => m.standard_id === standardId && m.clause === mapping.clause && m.scope_key === mapping.scope_key)) own.criteria_links.push(mapping);
      candidates.set(question.id, own);
    }
    for (const link of standardLinks) if (full || !processKeys.size || processKeys.has(link.scope_key)) consider(bank.get(link.question_id), link);
    // Never silently hide native questions on a full-standard audit. For a
    // process audit an unmapped question cannot safely be assigned to a process.
    for (const question of unmapped) if (full || (included.selectors.length && !processKeys.size)) consider(question, null, true);
    const references = auditArray(input.referenceCriteria).filter(row => row.standard_id === standardId);
    const requiredReferences = references.filter(row =>
      auditScopeAllows(row.clause_reference || row.clause, included.selectors, omitted.selectors) &&
      (full || !processKeys.size || auditArray(row.scope_keys || (row.scope_key ? [row.scope_key] : [])).some(key => processKeys.has(key))));
    if (input.referenceInventoryReviewed !== true) issue('reference_inventory_unverified', standardId,
      'Review the bank against the controlled clause inventory for the selected edition before claiming complete criterion coverage.');
    if (input.referenceInventoryReviewed === true && !requiredReferences.length) issue('reference_inventory_missing', standardId,
      'No controlled clause inventory was supplied for this selected scope.');
    for (const reference of requiredReferences) {
      const clause = auditText(reference.clause_reference || reference.clause);
      if (!parseAuditClauseScope(clause).selectors.length || parseAuditClauseScope(clause).invalid.length) { issue('reference_clause_invalid', standardId, 'A controlled coverage reference has no usable clause identity.', [clause]); continue; }
      // A broad question for clause 6 does not prove coverage of every detailed
      // requirement. A question at 6.1.1 may support its parent reference 6.1.
      if (![...candidates.values()].some(question => question.criteria_links.some(link =>
        link.standard_id === standardId && parseAuditClauseScope(clause).selectors.every(selector => auditClauseMatches(link.clause, selector))))) {
        issue('required_clause_without_question', standardId, 'An approved criterion has no mapped audit question.', [clause]);
      }
    }
    for (const selector of included.selectors) {
      const whollyExcluded = !auditScopeAllows(selector.raw, [], omitted.selectors);
      if (!whollyExcluded && ![...candidates.values()].some(question =>
        question.criteria_links.some(link => auditClauseScopesOverlap(link.clause, selector.raw)))) issue('included_clause_without_question', standardId,
        'An explicitly included clause has no question in the selected scope.', [selector.raw]);
    }
    for (const candidate of candidates.values()) {
      const combined = result.get(candidate.id);
      if (combined) combined.criteria_links.push(...candidate.criteria_links);
      else result.set(candidate.id, candidate);
    }
    standards.push({ standardId, standardLabel, full, included: included.selectors.map(s => s.raw), excluded: omitted.selectors.map(s => s.raw),
      processKeys: [...processKeys], nativeActiveQuestions: native.length, scopedQuestions: candidates.size,
      nativeQuestionsWithoutMapping: unmapped.length, unresolvedScopeQuestions: unresolvedUnmapped.length, referenceClauses: requiredReferences.length });
  }
  if (!selections.length) issue('no_selected_standards', null, 'No approved audit standards were supplied.');
  const questions = [...result.values()].sort((a, b) => (Number(a.display_order) || 0) - (Number(b.display_order) || 0) ||
    String(a.clause || '').localeCompare(String(b.clause || ''), 'en', { numeric: true }) || a.id.localeCompare(b.id));
  if (!questions.length) issue('no_scoped_questions', null, 'No active audit questions resolve to the approved scope.');
  return { questions, standards, issues, excluded, referenceInventoryReviewed: input.referenceInventoryReviewed === true,
    scopeReady: questions.length > 0 && !issues.some(item => item.blocking),
    methodology: 'Coverage refers to the supplied approved scope and controlled inventory. Guidance, scores, draft findings and CAPA cases are not additional assessed questions.' };
}

export function buildAuditFieldworkCoverage(input = {}) {
  const scope = input.scope || { questions: [], issues: [], scopeReady: false };
  const auditId = auditText(input.auditId), ownerId = auditText(input.ownerId);
  if (!auditId || !ownerId) throw new Error('An authorised audit and owner are required to calculate fieldwork coverage.');
  const ids = new Set(auditArray(scope.questions).map(row => row.id));
  const belongs = row => row.owner_id === ownerId && (!input.organizationId || !row.organization_id || row.organization_id === input.organizationId);
  const answers = latestUnique(input.answers).filter(row => belongs(row) && row.audit_id === auditId && ids.has(row.question_id));
  const byQuestion = new Map();
  for (const answer of answers.sort((a, b) => (validTime(a.updated_at) ?? validTime(a.created_at) ?? 0) -
    (validTime(b.updated_at) ?? validTime(b.created_at) ?? 0) || a.id.localeCompare(b.id))) byQuestion.set(answer.question_id, answer);
  const answerQuestions = new Map(answers.map(answer => [answer.id, answer.question_id]));
  const findings = latestUnique(input.findings).filter(row => belongs(row) && !EXCLUDED.has(lower(row.status)) &&
    !['draft', 'device_draft', 'pending_submission'].includes(lower(row.status)) &&
    AUDIT_FINDING_TYPES.has(row.finding_type) && (row.audit_id === auditId || row.source_audit_id === auditId));
  const evidence = latestUnique(input.evidence).filter(row => belongs(row) && row.audit_id === auditId);
  const rows = auditArray(scope.questions).map(question => {
    const answer = byQuestion.get(question.id) || null;
    const linkedFindings = findings.filter(finding => finding.source_audit_question_id === question.id ||
      (!finding.source_audit_question_id && answerQuestions.get(finding.answer_id) === question.id))
      .sort((a, b) => AUDIT_FINDING_PRIORITY[a.finding_type] - AUDIT_FINDING_PRIORITY[b.finding_type] || a.id.localeCompare(b.id));
    const supporting = evidence.filter(item => answerQuestions.get(item.answer_id) === question.id);
    const hasEvidence = Boolean(auditText(answer?.conclusion) || auditText(answer?.objective_evidence) ||
      supporting.some(item => auditText(item.description) || auditText(item.attachment_path) || auditText(item.external_url)));
    const result = answer?.result || 'not_assessed';
    let complete = false, justifiedNotApplicable = false, reason = 'Not assessed';
    if (result === 'not_applicable') {
      justifiedNotApplicable = Boolean(auditText(answer.not_applicable_justification)) && linkedFindings.length === 0;
      complete = justifiedNotApplicable;
      reason = linkedFindings.length ? 'Applicability decision conflicts with a linked finding' : complete ? 'Justified N/A; lead auditor review required' : 'N/A justification missing';
    } else if (result === 'unable_to_verify') reason = 'Unable to verify; follow-up unresolved';
    else if (linkedFindings.length) {
      complete = linkedFindings.every(finding => auditText(finding.criteria) && auditText(finding.objective_evidence) &&
        (!['major_nc', 'minor_nc'].includes(finding.finding_type) || auditText(finding.failure_statement)));
      reason = complete ? 'Controlled finding linked' : 'Linked finding evidence or required failure statement incomplete';
    } else if (AUDIT_FINDING_TYPES.has(result)) reason = 'Finding selected but no controlled finding is linked';
    else if (['conformity', 'positive_practice'].includes(result)) {
      complete = hasEvidence; reason = complete ? 'Evidence-supported conclusion' : 'Supporting evidence missing';
    }
    return { questionId: question.id, question, answer, linkedFindings, evidence: supporting, result,
      displayResult: linkedFindings[0]?.finding_type || result, complete, justifiedNotApplicable,
      unableToVerify: result === 'unable_to_verify', reason };
  });
  const accountedFor = rows.filter(row => row.complete).length;
  const justifiedNotApplicable = rows.filter(row => row.justifiedNotApplicable).length;
  const required = rows.length, outstandingRows = rows.filter(row => !row.complete);
  const linkedFindingIds = auditUnique(rows.flatMap(row => row.linkedFindings.map(finding => finding.id)));
  const clauses = new Map();
  for (const row of rows) for (const link of row.question.criteria_links || []) {
    const key = link.standard_id + ':' + link.clause;
    const item = clauses.get(key) || { key, standardId: link.standard_id, clause: link.clause, questionIds: [], accountedQuestionIds: [] };
    if (!item.questionIds.includes(row.questionId)) item.questionIds.push(row.questionId);
    if (row.complete && !item.accountedQuestionIds.includes(row.questionId)) item.accountedQuestionIds.push(row.questionId);
    clauses.set(key, item);
  }
  return { rows, required, accountedFor, concluded: accountedFor - justifiedNotApplicable, justifiedNotApplicable,
    outstanding: required - accountedFor, outstandingRows, unableToVerify: rows.filter(row => row.unableToVerify).length,
    linkedFindingCount: linkedFindingIds.length, linkedFindingIds,
    percentage: required ? Math.round(accountedFor / required * 100) : null,
    clauses: [...clauses.values()].map(item => ({ ...item, required: item.questionIds.length, accountedFor: item.accountedQuestionIds.length })),
    scopeIssues: auditArray(scope.issues), scopeReady: scope.scopeReady === true,
    canCompleteFieldwork: required > 0 && outstandingRows.length === 0 && scope.scopeReady === true,
    leadAuditorConfirmationRequired: true };
}

// Used only with an already-authorised query factory. Read to an empty page,
// not to a guessed response limit, since the database may cap page sizes.
export async function readCompleteAuditRows(makeQuery, options = {}) {
  const label = auditText(options.label) || 'Audit records';
  const keys = auditArray(options.orderKeys).length ? options.orderKeys : ['id'];
  const rows = []; let offset = 0, previousLast = null;
  for (;;) {
    let query = makeQuery();
    for (const key of keys) query = query.order(key, { ascending: true });
    const { data, error } = await query.range(offset, offset + 499);
    if (error || !Array.isArray(data)) throw new Error(`${label} could not be loaded completely. No incomplete coverage total has been displayed.`);
    if (!data.length) return rows;
    const fingerprint = JSON.stringify(keys.map(key => data[data.length - 1]?.[key] ?? null));
    if (fingerprint === previousLast || keys.every(key => data[data.length - 1]?.[key] == null)) throw new Error(`${label} pagination could not be verified.`);
    rows.push(...data); offset += data.length; previousLast = fingerprint;
  }
}
