import { NC_AGE_BANDS, nonconformityDate } from "./nonconformity-reporting.mjs";
import { RCA_PROFILE_BY_CODE, RCA_PROFILE_CATALOG } from "./rca-profile-catalog.js";

export const EFFECTIVENESS = [
  ["effective", "Effective", "#0d8265"],
  ["partially_effective", "Partially effective", "#aa701b"],
  ["not_effective", "Not effective", "#ba5366"],
  ["unable_to_verify", "Unable to verify", "#637d93"],
];

const outcomeRank = new Map(["not_effective", "unable_to_verify", "partially_effective", "effective"].map((key, index) => [key, index]));
const causeCategories = new Map(RCA_PROFILE_CATALOG.map(group => [group.code, group.title]));
const sourceNames = {
  internal_audit: "Internal audit", external_audit: "External audit", supplier: "Supplier",
  supplier_audit: "Supplier audit", customer_complaint: "Customer complaint",
  product_service: "Product or service", process_monitoring: "Process monitoring",
  management_review: "Management review", other: "Other",
};
const colours = ["#17539a", "#16877d", "#7355a4", "#a36a2b", "#588db8", "#596d83"];
const monthName = new Intl.DateTimeFormat("en-GB", { month: "short", year: "numeric", timeZone: "UTC" });

function groupBy(values, keyFor) {
  const groups = new Map();
  for (const value of values) {
    const key = keyFor(value);
    if (!key) continue;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(value);
  }
  return groups;
}

function item(key, label, color, rows) {
  return { key, label, color, rows, count: rows.length };
}

function reportingMonths(asOf) {
  const last = new Date(asOf + "T00:00:00Z");
  return Array.from({ length: 6 }, (_, index) => {
    const date = new Date(Date.UTC(last.getUTCFullYear(), last.getUTCMonth() - 5 + index, 1));
    return { date: date.toISOString().slice(0, 7), label: monthName.format(date) };
  });
}

function outcome(record, asOf) {
  const aliases = { effective_verified: "effective", ineffective: "not_effective" };
  const key = aliases[record?.effectiveness_result] ?? record?.effectiveness_result;
  const date = nonconformityDate(record?.verified_at);
  return date && date <= asOf && outcomeRank.has(key) ? { key, date } : null;
}

function effectiveness(rows, data, start, asOf) {
  if (!data || data.decisions === null || data.actions === null) return null;
  const decisions = new Map(data.decisions.map(row => [row.id, row]));
  const byCase = groupBy(data.actions.filter(row => Number(row.discipline) === 5 && row.selection_status === "selected"), row => row.case_id);
  const observed = new Map();
  const prepared = new Map();
  for (const row of rows) {
    const decision = decisions.get(row.accessId);
    const final = decision?.finding_id === row.id && (!decision.rca_case_id || decision.rca_case_id === row.linkedCapaId)
      ? outcome(decision, asOf) : null;
    if (final) {
      if (final.date >= start) observed.set(row.id, { ...final, basis: "Finding verification" });
      continue;
    }
    const caseId = row.linkedCapaAvailable ? row.linkedCapaId : null;
    if (!caseId) continue;
    if (!prepared.has(caseId)) {
      const outcomes = (byCase.get(caseId) || []).map(action => outcome(action, asOf))
        .filter(result => result && result.date >= start)
        .sort((a, b) => outcomeRank.get(a.key) - outcomeRank.get(b.key) || b.date.localeCompare(a.date));
      prepared.set(caseId, outcomes[0]);
    }
    const assessment = prepared.get(caseId);
    if (assessment) observed.set(row.id, { ...assessment, basis: "Corrective action verification" });
  }
  const grouped = groupBy(rows, row => observed.get(row.id)?.key);
  return {
    total: observed.size,
    items: EFFECTIVENESS.map(([key, label, colour]) => item(key, label, colour,
      (grouped.get(key) || []).map(row => ({ ...row, chartContext: observed.get(row.id) })))),
  };
}

function recurring(rows, causes) {
  if (!causes) return null;
  const byCase = new Map();
  for (const cause of causes) {
    const category = RCA_PROFILE_BY_CODE.get(cause.profile_code)?.category;
    if (cause.status !== "validated" || cause.cause_type !== "systemic" || !category) continue;
    if (!byCase.has(cause.case_id)) byCase.set(cause.case_id, new Set());
    byCase.get(cause.case_id).add(category);
  }
  const groups = new Map();
  let covered = 0;
  for (const row of rows) {
    const categories = row.linkedCapaAvailable && byCase.get(row.linkedCapaId);
    if (!categories) continue;
    covered++;
    for (const category of categories) {
      if (!groups.has(category)) groups.set(category, []);
      groups.get(category).push(row);
    }
  }
  return {
    covered, total: rows.length,
    items: [...groups].filter(([, group]) => group.length > 1)
      .map(([key, group]) => item(key, causeCategories.get(key), "#336fa7", group))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label)),
  };
}

export function buildNonconformityBoard(analytics, boardData) {
  const { asOf, rows, findingRows } = analytics;
  const months = reportingMonths(asOf);
  const start = months[0].date + "-01";
  const raised = groupBy(rows.filter(row => row.raisedDate <= asOf), row => row.raisedDate?.slice(0, 7));
  const verified = groupBy(rows.filter(row => row.closed && row.verifiedDate <= asOf &&
    (!row.raisedAt || row.verifiedAt >= row.raisedAt)), row => row.verifiedDate?.slice(0, 7));
  const open = rows.filter(row => !row.closed);
  const sourceGroups = [...groupBy(rows, row => row.sourceCategory || "other")]
    .sort(([a, groupA], [b, groupB]) => groupB.length - groupA.length || a.localeCompare(b));
  return {
    trend: months.map(({ date, label }) => ({
      date, label,
      raised: item("raised-" + date, "Raised · " + label, "#2365c9", raised.get(date) || []),
      verified: item("verified-" + date, "Verified closed · " + label, "#0a7e61", verified.get(date) || []),
    })),
    sources: sourceGroups.map(([key, group], index) => item(key,
      sourceNames[key] || key.replaceAll("_", " ").replace(/^./, char => char.toUpperCase()), colours[index % colours.length], group)),
    effectiveness: effectiveness(rows, boardData, start, asOf),
    recurring: recurring(rows.filter(row => row.raisedDate >= start && row.raisedDate <= asOf), boardData?.causes),
    capaRestricted: boardData?.capaRestricted === true,
    ageing: NC_AGE_BANDS.map(band => item(band.key, band.label, band.color,
      open.filter(row => row.openAgeDays !== null && row.openAgeDays >= band.min && row.openAgeDays <= band.max))),
    attention: [
      ...analytics.attention.map(queue => item(queue.key, queue.label, queue.color, open.filter(row => {
        if (queue.key === "open_major") return row.classification === "major_nc";
        if (queue.key === "submitted") return row.stateKey === "submitted";
        if (queue.key === "due_soon") return row.dueSoon;
        return row[queue.key];
      }))),
      item("verification", "Awaiting verification", "#7465a1", open.filter(row => row.stateKey === "verification")),
    ],
    workflow: analytics.workflows.filter(stage => stage.key !== "closed")
      .map(stage => item(stage.key, stage.label, stage.color, open.filter(row => row.stateKey === stage.key))),
    classification: analytics.classification.map(group => item(group.key, group.label, group.color,
      findingRows.filter(row => row.classification === group.key))),
  };
}
