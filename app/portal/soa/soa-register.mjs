export const TYPES = [["standalone", "Standalone"], ["assessment", "Assessment linked"]];
export const STATUSES = [["draft", "Draft"], ["under_review", "Under review"], ["approved", "Approved"], ["superseded", "Superseded"]];
export const BANDS = [
  ["implemented", "Implemented", "#187356"],
  ["partial", "Partially implemented", "#de9d31"],
  ["other", "Other applicable states", "#a8b7c7"],
  ["excluded", "Not applicable", "#627999"],
  ["pending", "Decision pending", "#c3a5d4"],
];
export const CHECKS = [
  ["decision", "Applicability decisions", "Pending"],
  ["reason", "Inclusion and exclusion justifications", "Missing"],
  ["evidence", "Implementation evidence", "Outstanding"],
  ["treatment", "Required risk-treatment links", "Missing"],
];

const implemented = value => value === "implemented" || value === "effective";
const hasText = value => Boolean(value?.trim());

export function summarizeControls(catalog, entries, evidence, links, risks) {
  const coverage = Object.fromEntries(BANDS.map(([key]) => [key, []]));
  const gaps = Object.fromEntries(CHECKS.map(([key]) => [key, []]));
  const byControl = new Map(entries.map(entry => [entry.control_id, entry]));
  const evidenceIds = new Set(evidence.filter(file => file.evidence_kind === "implementation").map(file => file.control_id));
  const riskById = new Map(risks.map(risk => [risk.id, risk]));
  const linkedControls = new Set();
  const linkedRisks = new Map();
  const controlIds = new Set(catalog.map(control => control.control_id));
  for (const link of links) {
    const risk = riskById.get(link.risk_id);
    if (!risk || !controlIds.has(link.control_id)) continue;
    linkedRisks.set(risk.id, risk);
    if (risk.status !== "archived") linkedControls.add(link.control_id);
  }

  for (const control of catalog) {
    const id = control.control_id;
    const entry = byControl.get(id);
    if (entry?.applicability !== "applicable" && entry?.applicability !== "not_applicable") {
      coverage.pending.push(control);
      gaps.decision.push(control);
      continue;
    }
    if (!hasText(entry.applicability_justification)) gaps.reason.push(control);
    if (entry.applicability === "not_applicable") {
      coverage.excluded.push(control);
      continue;
    }
    const claimed = implemented(entry.implementation_status) || entry.implementation_status === "partially_implemented";
    const band = implemented(entry.implementation_status) ? "implemented" : claimed ? "partial" : "other";
    coverage[band].push(control);
    if (claimed && !hasText(entry.implementation_evidence) && !evidenceIds.has(id)) gaps.evidence.push(control);
    if (entry.inclusion_source === "risk_treatment" && !linkedControls.has(id)) gaps.treatment.push(control);
  }
  return {
    coverage, gaps, linkedRisks: [...linkedRisks.values()].sort((a, b) => (a.risk_reference ?? "").localeCompare(b.risk_reference ?? "")),
    total: catalog.length,
    applicable: coverage.implemented.length + coverage.partial.length + coverage.other.length,
    ready: catalog.length > 0 && Object.values(gaps).every(items => items.length === 0),
  };
}

export function filterStatements(rows, { query, types, statuses }) {
  const term = query.trim().toLowerCase();
  return rows.filter(row =>
    (!types.length || types.includes(row.type)) &&
    (!statuses.length || statuses.includes(row.status)) &&
    [row.reference, row.title, row.organization, row.version, row.assessmentReference,
      ...row.summary.linkedRisks.flatMap(risk => [risk.risk_reference, risk.title])]
      .some(value => value?.toLowerCase().includes(term))
  );
}

export function readinessLabel(row) {
  if (!row.summary.total) return "Unavailable";
  return row.summary.ready ? "Ready for review" : "Attention required";
}

export function statementCsv(rows) {
  const columns = ["SoA reference", "Title", "Type", "Organisation", "Version", "Last updated", "Status", "Readiness", "Linked assessment", "Linked risks"];
  const records = rows.map(row => [
    row.reference, row.title, TYPES.find(([key]) => key === row.type)?.[1], row.organization, row.version, row.updatedAt,
    STATUSES.find(([key]) => key === row.status)?.[1] ?? row.status, readinessLabel(row), row.assessmentReference,
    row.summary.linkedRisks.map(risk => risk.risk_reference).join(", "),
  ]);
  const cell = value => {
    const text = String(value ?? "");
    const escaped = /^[\s]*[=+@-]|^[\t\r\n]/.test(text) ? "'" + text : text;
    return '"' + escaped.replaceAll('"', '""') + '"';
  };
  return [columns, ...records].map(record => record.map(cell).join(",")).join("\r\n");
}
