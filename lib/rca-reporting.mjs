/* Shared, read-only CAPA/8D analytics. No database writes or access decisions.
 * The server must supply only records authorised for the current user.
 * Dashboard, drill-downs and executive report use this same projected dataset.
 */
const DAY = 86400000;
const EXCLUDED = new Set(["cancelled", "withdrawn", "rejected", "duplicate", "archived"]);
const SEVERITIES = new Set(["critical", "high", "medium", "low"]);
const ROLES = new Set(["occurrence", "escape", "systemic"]);
const EFFECTIVE = new Set(["effective", "effective_verified"]);
const NOT_EFFECTIVE = new Set(["partially_effective", "not_effective", "ineffective"]);
const CAPA_STAGES = ["correction", "cause_analysis", "corrective_action", "effectiveness_review"];
export const RCA_DISCIPLINES = [
  [0, "Initial response"], [1, "Team"], [2, "Problem definition"],
  [3, "Containment"], [4, "Root-cause validation"],
  [5, "Corrective-action selection"], [6, "Implementation & effectiveness"],
  [7, "Recurrence prevention"], [8, "Closure & learning"],
];

const text = (value) => typeof value === "string" && value.trim() ? value.trim() : null;
const list = (value) => Array.isArray(value) ? value : [];
const unique = (values) => [...new Set(values.filter(Boolean))];
const label = (value) => String(value || "Not recorded").replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
function dedupe(rows) {
  const result = new Map();
  for (const row of list(rows)) if (text(row?.id)) result.set(row.id, row);
  return [...result.values()];
}
export function rcaDate(value) {
  if (!(typeof value === "string" || value instanceof Date)) return null;
  const raw = value instanceof Date ? value : value.trim();
  if (typeof raw === "string") {
    if (!/^\d{4}-\d{2}-\d{2}(?:T|$)/.test(raw)) return null;
    const calendar = raw.slice(0, 10);
    const check = new Date(calendar + "T00:00:00.000Z");
    if (!Number.isFinite(check.getTime()) || check.toISOString().slice(0, 10) !== calendar) return null;
  }
  const parsed = new Date(raw);
  return Number.isFinite(parsed.getTime()) ? parsed.toISOString().slice(0, 10) : null;
}
function snapshotDate(value) {
  const result = rcaDate(value);
  if (!result) throw new Error("A valid reporting snapshot is required.");
  return result;
}
const difference = (start, end) => start && end ? Math.round((Date.parse(end) - Date.parse(start)) / DAY) : null;
const percentage = (part, total) => total > 0 ? Math.round(part / total * 100) : null;
const average = (values) => values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : null;
function grouped(rows, key) {
  const result = new Map();
  for (const row of list(rows)) {
    const value = row?.[key];
    if (!value) continue;
    result.set(value, [...(result.get(value) || []), row]);
  }
  return result;
}
function profile(row) {
  return {
    id: row.id, role: ROLES.has(row.cause_type) ? row.cause_type : "unknown",
    status: text(row.status) || "not_recorded", code: text(row.profile_code),
    title: text(row.profile_title), category: text(row.profile_category),
    mechanism: text(row.failure_mechanism), extent: text(row.profile_extent),
    control: text(row.control_layer), recurrence: text(row.recurrence_relationship),
    process: text(row.affected_process), systemOwner: text(row.accountable_system_owner),
    systemOwnerId: text(row.accountable_system_owner_person_id),
    standards: unique(list(row.applicable_standards).map(text)),
    // Keep long causal narratives and evidence descriptions out of chart DTOs.
    rationaleRecorded: Boolean(text(row.profile_rationale)),
    validated: row.status === "validated",
    profiled: Boolean(text(row.profile_code) && text(row.profile_rationale)),
  };
}
function action(row) {
  return {
    id: row.id, caseId: row.case_id, causeId: text(row.cause_id),
    title: text(row.title) || "Corrective action", type: text(row.action_type),
    discipline: Number.isInteger(row.discipline) ? row.discipline : null,
    selection: text(row.selection_status), status: text(row.status),
    owner: text(row.action_owner), dueAt: rcaDate(row.due_date),
    result: text(row.effectiveness_result),
    effectivenessCriteriaRecorded: Boolean(text(row.effectiveness_criteria)),
    submittedAt: rcaDate(row.d6_submitted_at),
  };
}
function activeSelectedAction(row) {
  return row.discipline === 5 && row.selection === "selected" && !EXCLUDED.has(row.status);
}

/** Project only safe fields; join supporting rows by case_id, never by names. */
export function rcaExplorerRows(cases = [], related = {}) {
  const causesByCase = grouped(dedupe(related.causes), "case_id");
  const actionsByCase = grouped(dedupe(related.actions), "case_id");
  const disciplinesByCase = grouped(list(related.disciplines), "case_id");
  const stagesByCase = grouped(list(related.capaStages), "case_id");
  const organisations = new Map(list(related.organizations).map((row) => [row.id, row]));
  const findings = new Map(list(related.findings).map((row) => [row.id, row]));
  return dedupe(cases).map((row) => {
    const type = row.case_type === "capa" ? "capa" : row.case_type === "8d" || !row.case_type ? "8d" : "unknown";
    const status = text(row.status) || "not_recorded";
    const discipline = Number.isInteger(row.current_discipline) && row.current_discipline >= 0 && row.current_discipline <= 8 ? row.current_discipline : null;
    const closed = status === "closed";
    const excluded = EXCLUDED.has(status);
    const org = organisations.get(row.organization_id);
    const locationId = text(row.administration_location_id);
    const location = text(row.location);
    const d3 = (disciplinesByCase.get(row.id) || []).find((item) => item.discipline === 3);
    const capaStages = stagesByCase.get(row.id) || [];
    const finalStage = capaStages.find((item) => item.stage === "effectiveness_review");
    const nc = findings.get(row.finding_id || row.linked_finding_id);
    const profiles = (causesByCase.get(row.id) || []).map(profile);
    const actions = (actionsByCase.get(row.id) || []).map(action);
    const selectedActions = actions.filter(activeSelectedAction);
    const scopeKey = locationId ? `${row.organization_id || "unknown"}:location:${locationId}` : `${row.organization_id || "unknown"}:unallocated`;
    const workflowKey = excluded ? "excluded" : closed ? "closed" : type === "capa"
      ? `capa:${CAPA_STAGES.includes(row.capa_current_stage) ? row.capa_current_stage : "not_recorded"}`
      : type === "8d" && discipline !== null ? `d${discipline}` : "not_recorded";
    const rootEligible = type === "8d" && discipline !== null && discipline >= 4;
    const capaCauseEligible = type === "capa" && ["cause_analysis", "corrective_action", "effectiveness_review", "closed"].includes(row.capa_current_stage);
    const causeStage = capaStages.find((item) => item.stage === "cause_analysis");
    const capaCauseReviewed = Boolean(capaCauseEligible && causeStage?.completed_at && text(causeStage.narrative) && text(causeStage.evidence_reference));
    const containmentEligible = type === "8d" && ((discipline !== null && discipline >= 3) || Boolean(d3));
    const d3Approved = d3?.status === "approved" && d3.human_approved === true;
    const noContainment = d3Approved && d3.no_action_required === true && Boolean(text(d3.no_action_justification));
    const containment = noContainment ? "approved_not_required" : d3Approved ? "review_approved" : containmentEligible ? "pending_review" : "not_yet_applicable";
    const assessment = type === "capa"
      ? finalStage?.completed_at && ["effective", "ineffective"].includes(finalStage.decision) ? finalStage.decision === "effective" ? "effective" : "not_effective" : "unassessed"
      : selectedActions.some((item) => NOT_EFFECTIVE.has(item.result)) ? "not_effective"
        : selectedActions.length && selectedActions.every((item) => EFFECTIVE.has(item.result)) ? "effective"
          : selectedActions.some((item) => item.result === "unable_to_verify") ? "unable_to_verify" : "unassessed";
    return {
      id: row.id, reference: text(row.case_reference) || "Reference pending",
      title: text(row.title) || "Corrective-action case", type, status, closed, excluded,
      organizationId: text(row.organization_id), organizationName: text(org?.name) || "Organisation not recorded",
      locationId, location: location || "Location not recorded", scopeKey,
      // These dimensions must be explicitly recorded/enriched by the server;
      // never infer a department from the accountable person's job title.
      department: text(row.department_name) || text(row.department) || "Not recorded",
      source: text(row.source_type) || "not_recorded", severity: SEVERITIES.has(row.severity) ? row.severity : "unknown",
      severityBasis: "current_saved_case", createdAt: rcaDate(row.created_at),
      closedAt: closed ? rcaDate(row.closed_at) : null,
      targetAt: rcaDate(row.target_close_date), updatedAt: rcaDate(row.updated_at),
      accountablePersonId: text(row.accountable_person_id) || text(row.sponsor_person_id),
      accountableName: text(row.sponsor_name), leaderId: text(row.leader_person_id), leaderName: text(row.leader_name),
      discipline, capaStage: text(row.capa_current_stage), workflowKey,
      awaitingVerification: !closed && !excluded && (status === "effectiveness_review" || (type === "8d" && discipline === 6)),
      containment, containmentEligible, rootEligible, capaCauseEligible, capaCauseReviewed,
      ncType: text(nc?.finding_type), ncId: text(nc?.id),
      profiles, actions, assessment,
      simplifiedCapaDecision: type === "capa" && finalStage?.completed_at ? text(finalStage.decision) : null,
    };
  });
}

/** Date range is a raised-date cohort; current status remains authoritative. */
export function rcaFilterRows(rows = [], scope = {}) {
  const from = scope.from ? rcaDate(scope.from) : null;
  const to = scope.to ? rcaDate(scope.to) : null;
  if ((scope.from && !from) || (scope.to && !to) || (from && to && from > to)) throw new Error("Choose a valid reporting date range.");
  const orgs = unique(list(scope.organizations).map(text));
  const areas = unique(list(scope.areas).map(text));
  return rows.filter((row) => (!from || (row.createdAt && row.createdAt >= from))
    && (!to || (row.createdAt && row.createdAt <= to))
    && (!orgs.length || orgs.includes(row.organizationId))
    && (!areas.length || areas.includes(row.scopeKey))
    && (!scope.department || row.department === scope.department)
    && (!scope.source || row.source === scope.source)
    && (!scope.severity || row.severity === scope.severity)
    && (!scope.type || row.type === scope.type));
}

function bucket(rows, key, name) {
  return { key, label: name, count: rows.length, caseIds: rows.map((row) => row.id) };
}
function aggregate(rows, property) {
  const groups = new Map();
  for (const row of rows) {
    const key = String(row[property] || "not_recorded");
    groups.set(key, [...(groups.get(key) || []), row]);
  }
  return [...groups].map(([key, items]) => bucket(items, key, label(key)))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

/** A case counts once per group, even when it has several matching causes. */
export function rcaProfileGroups(rows = [], { role = "occurrence", dimension = "profile" } = {}) {
  if (!ROLES.has(role)) throw new Error("Choose occurrence, escape or systemic causes.");
  const allowed = new Set(["profile", "category", "mechanism", "extent", "control", "recurrence", "systemOwner", "process", "standards"]);
  if (!allowed.has(dimension)) throw new Error("Unsupported RCA dimension.");
  const groups = new Map();
  for (const row of rows.filter((item) => !item.excluded)) {
    for (const p of row.profiles.filter((item) => item.role === role && item.validated && item.profiled)) {
      const values = dimension === "profile" ? [p.code] : dimension === "standards" ? p.standards.length ? p.standards : ["not_recorded"] : [p[dimension] || "not_recorded"];
      for (const value of unique(values)) {
        const key = String(value);
        const entry = groups.get(key) || { key, label: dimension === "profile" ? `${p.code} · ${p.title || "Title not recorded"}` : label(value), ids: new Set(), causes: new Set() };
        entry.ids.add(row.id); entry.causes.add(p.id); groups.set(key, entry);
      }
    }
  }
  return [...groups.values()].map((entry) => ({ key: entry.key, label: entry.label, count: entry.ids.size, caseIds: [...entry.ids], causeCount: entry.causes.size }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

/** Hierarchy uses stable keys: area → workflow → case. Profiles can be
 * explored independently by role/dimension and joined back by case IDs. */
export function rcaDrilldown(rows = [], selection = {}) {
  let scoped = rows.filter((row) => !row.excluded);
  if (selection.area) scoped = scoped.filter((row) => row.scopeKey === selection.area);
  if (selection.workflow) scoped = scoped.filter((row) => row.workflowKey === selection.workflow);
  if (selection.caseIds) { const ids = new Set(selection.caseIds); scoped = scoped.filter((row) => ids.has(row.id)); }
  const stage = !selection.area ? "areas" : !selection.workflow ? "workflow" : "cases";
  return { stage, count: scoped.length, groups: stage === "areas" ? aggregate(scoped, "scopeKey").map((entry) => ({ ...entry, label: scoped.find((row) => row.scopeKey === entry.key)?.location || entry.label })) : stage === "workflow" ? aggregate(scoped, "workflowKey").map((entry) => ({ ...entry, label: workflowLabel(entry.key) })) : [], caseIds: scoped.map((row) => row.id) };
}
export function workflowLabel(key) {
  if (key === "closed") return "Closed · recorded status";
  if (/^d[0-8]$/.test(key)) return `D${key.slice(1)} · ${RCA_DISCIPLINES[Number(key.slice(1))][1]}`;
  if (key.startsWith("capa:")) return `CAPA · ${label(key.slice(5))}`;
  return label(key);
}

export function rcaAnalytics(rows = [], snapshot = new Date()) {
  const today = snapshotDate(snapshot), all = dedupe(rows), included = all.filter((row) => !row.excluded);
  const open = included.filter((row) => !row.closed), closed = included.filter((row) => row.closed);
  const overdue = open.filter((row) => row.targetAt && row.targetAt < today);
  const dueSoon = open.filter((row) => row.targetAt && row.targetAt >= today && difference(today, row.targetAt) <= 7);
  const unassigned = open.filter((row) => !row.accountablePersonId && !row.accountableName);
  const ages = open.filter((row) => row.createdAt && row.createdAt <= today);
  const validClosures = closed.filter((row) => row.createdAt && row.closedAt && row.createdAt <= row.closedAt && row.closedAt <= today);
  const timedClosures = validClosures.filter((row) => row.targetAt);
  const onTime = timedClosures.filter((row) => row.closedAt <= row.targetAt);
  const containmentEligible = included.filter((row) => row.containmentEligible);
  const containmentRequired = containmentEligible.filter((row) => row.containment !== "approved_not_required");
  const approvedContainment = containmentRequired.filter((row) => row.containment === "review_approved");
  const rootEligible = included.filter((row) => row.rootEligible);
  // Occurrence is required. Escape/systemic are optional and never invented.
  const rootComplete = rootEligible.filter((row) => row.profiles.some((p) => p.role === "occurrence" && p.validated && p.profiled)
    && !row.profiles.some((p) => p.validated && !p.profiled));
  const rootPending = rootEligible.filter((row) => !rootComplete.includes(row));
  const capaRootEligible = included.filter((row) => row.capaCauseEligible);
  const capaRootReviewed = capaRootEligible.filter((row) => row.capaCauseReviewed);
  const capaRootPending = capaRootEligible.filter((row) => !row.capaCauseReviewed);
  const assessed = included.filter((row) => ["effective", "not_effective"].includes(row.assessment));
  const effective = assessed.filter((row) => row.assessment === "effective");
  const notEffective = assessed.filter((row) => row.assessment === "not_effective");
  const unable = included.filter((row) => row.assessment === "unable_to_verify");
  const unassessed = included.filter((row) => row.assessment === "unassessed");
  const highOpen = open.filter((row) => ["critical", "high"].includes(row.severity));
  const recurrence = included.filter((row) => row.profiles.some((p) => p.role === "occurrence" && p.validated && p.profiled && p.recurrence === "confirmed_recurrence"));
  const bands = [["0_30", "0–30 days", 0, 30], ["31_60", "31–60 days", 31, 60], ["61_90", "61–90 days", 61, 90], ["over_90", "Over 90 days", 91, Infinity]]
    .map(([key, name, from, to]) => bucket(ages.filter((row) => { const age = difference(row.createdAt, today); return age >= from && age <= to; }), key, name));
  bands.push(bucket(open.filter((row) => !ages.includes(row)), "unknown", "Age not established"));
  const months = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(today + "T00:00:00Z"); date.setUTCDate(1); date.setUTCMonth(date.getUTCMonth() - 5 + index);
    const key = date.toISOString().slice(0, 7);
    return { key, raised: bucket(included.filter((row) => row.createdAt?.startsWith(key) && row.createdAt <= today), "raised", "Raised"), closed: bucket(validClosures.filter((row) => row.closedAt.startsWith(key)), "closed", "Closed") };
  });
  const closureBands = [["0", "Same day", 0, 0], ["1_7", "1–7 days", 1, 7], ["8_30", "8–30 days", 8, 30], ["31_plus", "31+ days", 31, Infinity]]
    .map(([key, name, from, to]) => bucket(validClosures.filter((row) => { const n = difference(row.createdAt, row.closedAt); return n >= from && n <= to; }), key, name));
  closureBands.push(bucket(closed.filter((row) => !validClosures.includes(row)), "unknown", "Closure time not established"));
  const buckets = { open, closed, overdue, dueSoon, unassigned, highOpen, rootPending,
    awaitingVerification: included.filter((row) => row.awaitingVerification),
    containmentRequired, approvedContainment, containmentNotRequired: containmentEligible.filter((row) => row.containment === "approved_not_required"),
    rootEligible, rootComplete, capaRootEligible, capaRootReviewed, capaRootPending, assessed, effective, notEffective, unableToVerify: unable, unassessed, recurrence, onTime, timedClosures };
  return {
    snapshot: today, total: included.length, excluded: all.length - included.length,
    counts: Object.fromEntries(Object.entries(buckets).map(([key, items]) => [key, items.length])),
    caseIds: Object.fromEntries(Object.entries(buckets).map(([key, items]) => [key, items.map((row) => row.id)])),
    rates: { onTime: percentage(onTime.length, timedClosures.length), closed: percentage(closed.length, included.length), containment: percentage(approvedContainment.length, containmentRequired.length), rootValidation: percentage(rootComplete.length, rootEligible.length), effective: percentage(effective.length, assessed.length) },
    averageOpenAge: average(ages.map((row) => difference(row.createdAt, today))),
    averageClosureDays: average(validClosures.map((row) => difference(row.createdAt, row.closedAt))),
    oldestOpenId: [...ages].sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id))[0]?.id || null,
    ageing: bands, closureBands, months,
    byArea: aggregate(open, "scopeKey").map((entry) => ({ ...entry, label: open.find((row) => row.scopeKey === entry.key)?.location || entry.label })),
    byDepartment: aggregate(open, "department"), bySource: aggregate(included, "source"),
    bySeverity: aggregate(included, "severity"), byNcType: aggregate(included, "ncType"),
    workflow: aggregate(included, "workflowKey").map((entry) => ({ ...entry, label: workflowLabel(entry.key) })),
    profiles: Object.fromEntries([...ROLES].map((role) => [role, rcaProfileGroups(included, { role })])),
    quality: {
      missingRaisedDate: included.filter((row) => !row.createdAt).length,
      futureRaisedDate: included.filter((row) => row.createdAt && row.createdAt > today).length,
      unknownOpenAge: open.length - ages.length, unknownClosureTime: closed.length - validClosures.length,
      unknownClosedTarget: closed.length - timedClosures.length,
      openWithoutTarget: open.filter((row) => !row.targetAt).length,
      unknownSeverity: included.filter((row) => row.severity === "unknown").length,
      validatedCausesWithoutProfile: included.reduce((sum, row) => sum + row.profiles.filter((p) => p.validated && !p.profiled).length, 0),
      departmentNotRecorded: included.filter((row) => row.department === "Not recorded").length,
    },
    basis: {
      scope: "Raised-date cohort; current case state at the reporting snapshot.",
      severity: "Current saved case severity. Original reporter severity is not inferred.",
      closure: "Recorded closed status; elapsed time uses closed_at only. Updated_at never substitutes for closure.",
      onTime: "Valid recorded closures against the currently saved target date; this is not an original-target SLA measure.",
      containment: "Human-approved D3 containment review. Approved no-containment decisions are shown separately and excluded from the required-review denominator. Four-stage CAPA is not mapped to D3.",
      effectiveness: "Case-level recorded decisions: selected D5 actions for 8D; completed effectiveness stage for simplified CAPA. All selected actions must be effective for a case to count effective. Unassessed and unable-to-verify are shown separately.",
      profiles: "Validated profiled causes only; occurrence, escape and systemic remain separate. Cases count once per group; multiple standards may overlap.",
    },
  };
}

/** Factual leadership narrative. Authorization and subscription checks belong
 * in the server action, using the same scope and rows as the dashboard. */
export function rcaExecutiveBrief(rows = [], scope = {}, snapshot = new Date()) {
  const scoped = rcaFilterRows(rows, scope), analytics = rcaAnalytics(scoped, snapshot);
  const c = analytics.counts, decisions = [];
  if (c.unassigned) decisions.push(`Appoint accountable sponsors for ${c.unassigned} open case(s).`);
  if (c.overdue) decisions.push(`Confirm recovery dates and resources for ${c.overdue} overdue case(s).`);
  if (c.notEffective) decisions.push(`Reassess causes and corrective actions for ${c.notEffective} case(s) with a recorded ineffective or partially effective outcome.`);
  if (c.rootPending) decisions.push(`Complete evidence-based occurrence-cause validation and outstanding profile records for ${c.rootPending} eligible case(s). Add escape or systemic streams only where evidence supports them.`);
  if (c.capaRootPending) decisions.push(`Complete the evidence-supported cause-analysis stage for ${c.capaRootPending} simplified CAPA case(s).`);
  if (c.dueSoon) decisions.push(`Confirm delivery readiness for ${c.dueSoon} open case(s) due within seven days.`);
  if (c.awaitingVerification) decisions.push(`Allocate competent reviewers to ${c.awaitingVerification} case(s) awaiting verification; retain the existing independence and closure gates.`);
  const limitations = [analytics.basis.scope, analytics.basis.onTime, analytics.basis.effectiveness, analytics.basis.profiles];
  if (analytics.quality.unknownClosureTime) limitations.push(`${analytics.quality.unknownClosureTime} closed case(s) have no reliable closure duration and are excluded from time measures.`);
  if (analytics.quality.unknownClosedTarget) limitations.push(`${analytics.quality.unknownClosedTarget} closed case(s) lack the dates needed for the on-time measure.`);
  if (analytics.quality.unknownOpenAge) limitations.push(`${analytics.quality.unknownOpenAge} open case(s) have unknown age.`);
  if (analytics.quality.openWithoutTarget) limitations.push(`${analytics.quality.openWithoutTarget} open case(s) have no valid target date and cannot be classified as overdue.`);
  if (analytics.quality.validatedCausesWithoutProfile) limitations.push(`${analytics.quality.validatedCausesWithoutProfile} validated cause(s) lack a code or rationale and are excluded from profile charts.`);
  if (analytics.quality.unknownSeverity) limitations.push(`${analytics.quality.unknownSeverity} case(s) have no recognised severity classification.`);
  return {
    title: "CAPA-8D Executive Review", snapshot: analytics.snapshot, scope,
    analytics, caseIds: scoped.filter((row) => !row.excluded).map((row) => row.id),
    summary: analytics.total
      ? `The selected portfolio contains ${analytics.total} controlled case(s): ${c.open} open and ${c.closed} recorded closed. ${c.overdue} open case(s) are beyond their current target date and ${c.highOpen} carry a current high or critical classification. ${analytics.rates.onTime === null ? "On-time closure performance is not established." : `${analytics.rates.onTime}% of measurable recorded closures met the current target date.`} ${analytics.averageClosureDays === null ? "Average closure time is not established." : `Average measurable closure time is ${analytics.averageClosureDays} calendar day(s).`}`
      : "No cases match the selected scope. Performance rates and closure time are not established.",
    decisions, limitations,
    findings: [
      `${c.effective} of ${c.assessed} assessed case(s) have recorded effective outcomes; ${c.unassessed} are unassessed and ${c.unableToVerify} cannot yet be verified.`,
      `${c.recurrence} case(s) record confirmed recurrence in a validated occurrence profile.`,
      `${c.rootComplete} of ${c.rootEligible} eligible 8D case(s) have a validated, profiled occurrence cause without outstanding validated-profile gaps. ${c.capaRootReviewed} of ${c.capaRootEligible} eligible simplified CAPA case(s) have a completed cause-analysis stage with evidence recorded.`,
    ],
    reviewStatus: "Draft for leadership review; report generation records no approval and changes no case status.",
  };
}
