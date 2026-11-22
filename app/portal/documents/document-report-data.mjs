export const reportGroups = { department: 'Department', site: 'Site', type: 'Document type' };

export const revisionStatuses = [
  { key: 'current', label: 'Current', colour: '#16775e', matches: row => row.status === 'current' },
  { key: 'draft', label: 'Draft', colour: '#3579ad', matches: row => row.status === 'draft' },
  { key: 'approved', label: 'Approved for release', colour: '#a26a22', matches: row => row.status === 'approved' },
  { key: 'in_review', label: 'In review', colour: '#7451a1', matches: row => row.status === 'in_review' },
  { key: 'historic', label: 'Superseded / withdrawn', colour: '#64798d', matches: row => ['superseded', 'withdrawn'].includes(row.status) },
];

const current = row => row.status === 'current';
export const reviewCategories = [
  { key: 'overdue', label: 'Overdue reviews', colour: '#af3747', matches: row => current(row) && row.review === 'overdue' },
  { key: 'upcoming', label: 'Due within 30 days', colour: '#a26a22', matches: row => current(row) && row.review === 'upcoming' },
  { key: 'later', label: 'Due later', colour: '#16775e', matches: row => current(row) && Boolean(row.reviewDate) && !row.review },
  { key: 'undated', label: 'Current without a review date', colour: '#3579ad', matches: row => current(row) && row.review === 'undated' },
];

export const series = { key: 'series', label: 'Controlled Documents', colour: '#3579ad', detail: 'Accessible document series' };
export const approval = { key: 'approval', label: 'Awaiting Approval', colour: '#a26a22', detail: 'Independent approval pending', matches: row => row.awaitingApproval };
export const published = { key: 'published', label: 'Approved / Published', colour: '#16775e', detail: 'Approved for release and current', matches: row => current(row) || row.status === 'approved' };
export const other = { key: 'other', label: 'Other status', colour: '#3d526b', matches: row => !revisionStatuses.some(status => status.matches(row)) };

export function reportSeries(records) {
  const bySeries = new Map();
  // Register order is oldest first within a document number. Prefer its current revision if accessible.
  for (const row of records) {
    const previous = bySeries.get(row.series);
    if (!previous || !current(previous) || current(row)) bySeries.set(row.series, row);
  }
  return [...bySeries.values()];
}

export function memberships(row, dimension) {
  if (dimension === 'type') {
    return row.type ? [{ id: 'type:' + row.type, label: row.type }] : [{ id: 'none', label: 'No type specified' }];
  }
  return row[dimension].length ? row[dimension] : row.companyWide
    ? [{ id: 'company', label: 'Company-wide' }]
    : [{ id: 'none', label: 'No ' + dimension + ' specified' }];
}

export function drillRecords(records, path) {
  return records.filter(row => path.every(({ dimension, id }) => memberships(row, dimension).some(item => item.id === id)));
}

export function reportBreakdown(records, dimension) {
  const groups = new Map();
  for (const row of records) {
    for (const { id, label } of memberships(row, dimension)) {
      const group = groups.get(id) ?? { id, label, count: 0 };
      group.count++;
      groups.set(id, group);
    }
  }
  return [...groups.values()].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'en-GB'));
}
