import { actionOverdue, inspectionPerformance, OPEN_ACTIONS, openFinding } from "./workplace-inspection-overview.mjs";
import { NC_AGE_BANDS } from "./nonconformity-reporting.mjs";
import { siteToday } from "./zone-policy.mjs";

const day = 86400000;
const monthLabel = new Intl.DateTimeFormat("en-GB", { month: "short", year: "numeric", timeZone: "UTC" });
const colours = ["#185095", "#137e77", "#6f56a1", "#a66b28", "#487998", "#566979", "#4b8d91"];
const priorityRank = new Map(["critical", "high", "medium", "low"].map((rank, index) => [rank, index]));
const outcomeNames = [
  ["effective", "Effective", "#08795e"],
  ["partly_effective", "Partly effective", "#a66b28"],
  ["not_effective", "Not effective", "#a2475a"],
];

function calendarDate(value) {
  return typeof value === "string" && Number.isFinite(Date.parse(value)) ? siteToday("Europe/London", new Date(value)) : "";
}

const group = (key, label, color, rows, kind = "findings") => ({ key, label, color, rows, count: rows.length, kind });

function partition(rows, keyFor) {
  const items = new Map();
  for (const row of rows) {
    const key = keyFor(row);
    if (!key) continue;
    if (!items.has(key)) items.set(key, []);
    items.get(key).push(row);
  }
  return items;
}

function groups(rows, keyFor, labelFor, kind) {
  return [...partition(rows, keyFor)]
    .sort(([a, first], [b, second]) => second.length - first.length || a.localeCompare(b))
    .map(([key, items], index) => group(key, labelFor(key, items), colours[index % colours.length], items, kind));
}

const title = value => value ? value.replaceAll("_", " ").replace(/^./, letter => letter.toUpperCase()) : "Not recorded";
const accountableFinding = row => !["positive_practice", "opportunity_for_improvement"].includes(row.finding_type);

function verification(row) {
  const date = calendarDate(row.verified_at);
  const legacy = row.verification_result;
  const outcome = row.effectiveness_result ? (row.verifierRecorded ? row.effectiveness_result : "") : legacy;
  return date && outcomeNames.some(([key]) => key === outcome) ? { date, outcome } : null;
}

export function buildWorkplaceFindingsBoard({ findings, actions, inspections, asOf, today, filters = {} }) {
  const inScope = row => (!filters.site || row.siteKey === filters.site) &&
    (!filters.zone || row.zoneKey === filters.zone) && (!filters.priority || row.priority === filters.priority);
  const scopedFindings = findings.filter(row => row.status !== "cancelled" && inScope(row));
  const scopedActions = actions.filter(row => row.status !== "cancelled" && inScope(row));
  const open = scopedFindings.filter(openFinding);
  const needsAction = open.filter(accountableFinding);
  const openActions = scopedActions.filter(row => OPEN_ACTIONS.includes(row.status));
  const overdue = openActions.filter(row => actionOverdue(row, today));
  const awaiting = openActions.filter(row => row.status === "awaiting_verification");
  const high = needsAction.filter(row => ["critical", "high"].includes(row.priority));
  const startMonth = new Date(today + "T00:00:00Z");
  const months = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(Date.UTC(startMonth.getUTCFullYear(), startMonth.getUTCMonth() - 5 + index, 1));
    return { date: date.toISOString().slice(0, 7), label: monthLabel.format(date) };
  });
  const windowStart = months[0].date + "-01";
  const dateInWindow = date => date >= windowStart && date <= today;
  const validEvent = date => dateInWindow(calendarDate(date)) && Date.parse(date) <= asOf;
  const verified = scopedActions.flatMap(row => {
    const result = verification(row);
    return result && validEvent(row.verified_at) ? [{ ...row, assessment: result }] : [];
  });
  const effective = verified.filter(row => row.assessment.outcome === "effective" && row.status === "closed");
  const raised = partition(scopedFindings.filter(row => validEvent(row.created_at)), row => calendarDate(row.created_at).slice(0, 7));
  const verifiedMonth = partition(effective, row => row.assessment.date.slice(0, 7));
  const ageById = new Map(open.map(row => [row.id, (Date.parse(today) - Date.parse(calendarDate(row.created_at))) / day]));
  const recordedAge = [...ageById.values()].filter(age => Number.isFinite(age) && age >= 0).length;
  const idsWithOpenActions = new Set(actions.filter(row => OPEN_ACTIONS.includes(row.status)).map(row => row.finding_id));
  const { repeats } = inspectionPerformance(inspections, scopedFindings, asOf, validEvent);
  const findingsById = new Map(scopedFindings.map(row => [row.id, row]));
  const priorities = [...openActions].sort((a, b) =>
    Number(actionOverdue(b, today)) - Number(actionOverdue(a, today)) ||
    (priorityRank.get(a.priority) ?? 9) - (priorityRank.get(b.priority) ?? 9) ||
    (a.target_date || "9999").localeCompare(b.target_date || "9999") || a.reference.localeCompare(b.reference));
  return {
    summary: [
      group("open", "Open findings", "#215187", open),
      group("high", "High / critical findings", "#9a5727", high),
      group("actions", "Open actions", "#215187", openActions, "actions"),
      group("overdue", "Overdue actions", "#a2475a", overdue, "actions"),
      group("awaiting", "Awaiting verification", "#7153a2", awaiting, "actions"),
      group("verified", "Verified effective", "#08795e", effective, "actions"),
    ],
    trend: months.map(({date,label}) => ({
      date, label,
      raised: group("raised-" + date, "Findings raised · " + label, "#2365c9", raised.get(date) || []),
      verified: group("verified-" + date, "Actions verified effective · " + label, "#08795e", verifiedMonth.get(date) || [], "actions"),
    })),
    findingsByType: groups(scopedFindings, row => row.finding_type || "unclassified", title, "findings"),
    totalFindings: scopedFindings.length,
    ageing: NC_AGE_BANDS.map(({key,label,color,min,max}) =>
      group(key,label,color,open.filter(row => ageById.get(row.id) >= min && ageById.get(row.id) <= max))),
    recordedAge,
    attention: [
      group("overdue", "Overdue actions", "#a2475a", overdue, "actions"),
      group("high", "High / critical findings", "#a66b28", high),
      group("no-action", "Actionable findings without an open action", "#566979", needsAction.filter(row => !idsWithOpenActions.has(row.id))),
      group("awaiting", "Awaiting verification", "#7153a2", awaiting, "actions"),
    ],
    outcomes: outcomeNames.map(([key,label,color]) => group(key,label,color,verified.filter(row => row.assessment.outcome === key), "actions")),
    verifiedTotal: verified.length,
    recurrence: repeats.map(({key,label,scope,findingIds}) => group(key, scope ? label + " · " + scope : label, "#336fa7", findingIds.map(id => findingsById.get(id)))),
    workflow: groups(openActions, row => row.status, title, "actions"),
    overdueBySite: groups(overdue, row => row.siteKey, (_, rows) => rows[0].site, "actions"),
    priorities,
  };
}
