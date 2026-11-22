import { residualBand } from "../../../../lib/health-safety-dashboard.mjs";

export const registerPath = "/portal/health-safety/risk-assessment";
export const actionsPath = "/portal/health-safety/actions";
const historic = new Set(["superseded", "archived"]);
const open = new Set(["open", "accepted", "in_progress", "evidence_submitted", "verification", "partly_effective", "not_effective"]);
const awaitingVerification = new Set(["evidence_submitted", "verification"]);
const priorityWeight = { critical: 0, high: 1, medium: 2, low: 3 };
const active = new Set(["draft", "in_review", "changes_required", "approved", "communicated", "review_due"]);

export const riskLabels = {
  acceptable: "Acceptable", adequate: "Adequate", inadequate: "Inadequate", unacceptable: "Unacceptable", unrated: "Unrated",
};
export const riskBand = score => score == null ? "unrated" : residualBand(score);
export const readable = value => String(value || "").replaceAll("_", " ").replace(/\b\w/g, letter => letter.toUpperCase());
export const isControlled = row => ["approved", "communicated"].includes(row.status);
export const isHistoric = row => historic.has(row.status);
export const validViews = ["all", "active", "elevated", "review-due", "approved", "archived"];
const nonblank = value => typeof value === "string" && value.trim() ? value.trim() : null;
const dateKey = value => typeof value === "string" ? value.slice(0, 10) : "";

function coordinate(likelihood, severity) {
  const valid = number => Number.isInteger(number) && number >= 1 && number <= 5;
  return valid(likelihood) && valid(severity) ? [likelihood, severity] : [null, null];
}

function score(value, pair) {
  if (Number.isFinite(value) && value > 0) return value;
  return pair[0] === null ? null : pair[0] * pair[1];
}

function indexByAssessment(rows) {
  const index = new Map();
  for (const row of rows) {
    if (!index.has(row.assessment_id)) index.set(row.assessment_id, []);
    index.get(row.assessment_id).push(row);
  }
  return index;
}

const newestFirst = (a, b) => (Number(b.version) || 0) - (Number(a.version) || 0) ||
  String(b.updated_at ?? "").localeCompare(String(a.updated_at ?? "")) || a.id.localeCompare(b.id);

function revisionFamilies(records, events) {
  const ids = new Set(records.map(row => row.id));
  const parent = new Map();
  for (const event of events) {
    const source = event.event_data?.source_assessment_id;
    if (ids.has(event.assessment_id) && ids.has(source) && event.assessment_id !== source) {
      parent.set(event.assessment_id, source);
    }
  }
  const families = new Map();
  for (const row of records) {
    let root = row.id;
    const seen = new Set();
    while (parent.has(root) && !seen.has(root)) {
      seen.add(root);
      root = parent.get(root);
    }
    if (seen.has(root)) root = [...seen].sort()[0];
    if (!families.has(root)) families.set(root, []);
    families.get(root).push(row);
  }
  return [...families.values()].map(family => family.sort(newestFirst));
}

export function buildRegister(assessments, hazards, actions, events, today) {
  const hazardIndex = indexByAssessment(hazards);
  const actionIndex = indexByAssessment(actions);
  const rows = assessments.map(row => {
    const title = nonblank(row.title) || "Untitled assessment";
    const reference = nonblank(row.assessment_reference) || "No reference";
    const site = nonblank(row.site_location) || "Site not assigned";
    const department = nonblank(row.area_department) || "Department not assigned";
    const assessedHazards = (hazardIndex.get(row.id) ?? []).map(hazard => {
      const current = coordinate(hazard.current_likelihood, hazard.current_severity);
      const residual = coordinate(hazard.residual_likelihood, hazard.residual_severity);
      const type = nonblank(hazard.hazard_category) || "Uncategorised hazard";
      return {
        id: hazard.id, assessmentId: row.id, assessmentLabel: reference + " · " + title,
        type, label: nonblank(hazard.hazard_description) || type,
        current, residual, initialScore: score(hazard.current_score, current),
        residualScore: score(hazard.residual_score, residual),
      };
    });
    const openActions = (actionIndex.get(row.id) ?? []).filter(action => open.has(action.status)).map(action => ({
      id: action.id, reference: action.action_reference, label: nonblank(action.action_required) || "Control action",
      target: dateKey(action.target_date), priority: action.priority,
      awaiting: awaitingVerification.has(action.status),
      overdue: Boolean(dateKey(action.target_date) && dateKey(action.target_date) < today),
    }));
    const highest = key => Math.max(0, ...assessedHazards.map(hazard => hazard[key] ?? 0)) || null;
    const reviewDate = dateKey(row.review_date);
    return {
      id: row.id, title, reference, site, department,
      assessor: nonblank(row.assessor_name), type: row.assessment_type,
      version: row.version, status: row.status, updated_at: row.updated_at, reviewDate,
      reviewDue: !isHistoric(row) && Boolean(reviewDate && reviewDate <= today),
      initialScore: highest("initialScore"), residualScore: highest("residualScore"),
      hazards: assessedHazards, actions: openActions,
    };
  });
  const latest = revisionFamilies(rows, events).flatMap(family => {
    const current = family.find(row => !isHistoric(row));
    if (!current) return [];
    const history = family.filter(row => row.id !== current.id).map(({ id, reference, version, status }) => ({ id, reference, version, status }));
    return [{ ...current, history }];
  }).sort((a, b) => String(b.updated_at ?? "").localeCompare(String(a.updated_at ?? "")) || a.id.localeCompare(b.id));
  return {
    latest, archive: rows.filter(isHistoric).sort(newestFirst),
    coverage: { approved: rows.filter(isControlled).map(({ id, reference, title, status }) => ({ id, reference, title, status })), total: rows.length },
  };
}

export function movement(hazard) {
  const { initialScore, residualScore } = hazard;
  if (initialScore === null || residualScore === null) return "unrated";
  return residualScore < initialScore ? "lower" : residualScore > initialScore ? "higher" : "same";
}

export function matchesRegister(row, { query, site, department }) {
  const term = query.trim().toLowerCase();
  return (!site || row.site === site) && (!department || row.department === department) &&
    (!term || [row.reference, row.title, row.site, row.department, row.assessor, readable(row.type),
      ...row.hazards.flatMap(hazard => [hazard.label, hazard.type])].some(value => value?.toLowerCase().includes(term)));
}

export function matchesSlice(row, slice) {
  switch (slice) {
    case "active": return active.has(row.status);
    case "elevated": return row.residualScore >= 10;
    case "unacceptable": return row.residualScore >= 15;
    case "overdue": return row.actions.some(action => action.overdue);
    case "review-due": return row.reviewDue;
    case "approval": return row.status === "in_review";
    case "approved": return isControlled(row);
    case "verification": return row.actions.some(action => action.awaiting);
    case "lower": case "same": case "higher": case "unrated": return row.hazards.some(hazard => movement(hazard) === slice);
    default: return true;
  }
}

export function priorityActions(rows) {
  return rows.flatMap(row => row.actions.filter(action => action.overdue).map(action => ({ row, action })))
    .sort((a, b) => (priorityWeight[a.action.priority] ?? 4) - (priorityWeight[b.action.priority] ?? 4) ||
      a.action.target.localeCompare(b.action.target));
}

const safeCsvCell = value => {
  const text = String(value ?? "");
  const safe = /^[\s\u0000-\u001f]*[=+@-]|^[\t\r\n]/.test(text) ? "'" + text : text;
  return '"' + safe.replaceAll('"', '""') + '"';
};

export function registerCsv(rows) {
  return [
    ["Reference", "Assessment", "Version", "Site", "Department", "Assessor", "Approval status", "Initial maximum",
      "Residual maximum", "Residual rating", "Open actions", "Overdue actions", "Review date"],
    ...rows.map(row => [row.reference, row.title, row.version, row.site, row.department, row.assessor,
      readable(row.status), row.initialScore, row.residualScore, riskLabels[riskBand(row.residualScore)],
      row.actions.length, row.actions.filter(action => action.overdue).length, row.reviewDate]),
  ].map(row => row.map(safeCsvCell).join(",")).join("\r\n");
}
