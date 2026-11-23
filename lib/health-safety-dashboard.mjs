const openStatuses = new Set(["open", "accepted", "in_progress", "evidence_submitted", "verification", "partly_effective", "not_effective"]);
const verificationStatuses = new Set(["evidence_submitted", "verification"]);
const archived = new Set(["archived", "superseded"]);
const dateKey = value => typeof value === "string" ? value.slice(0, 10) : "";

export function residualBand(score) {
  return score >= 15 ? "unacceptable" : score >= 10 ? "inadequate" : score >= 5 ? "adequate" : "acceptable";
}

export function riskMatrixPosition(likelihood, severity) {
  const levels = [1, 2, 3, 4, 5];
  if (!levels.includes(likelihood) || !levels.includes(severity)) return null;
  return { score: likelihood * severity, cell: `${likelihood}-${severity}` };
}

export function healthSafetyPosition({ assessments, hazards, actions, inspections }, today) {
  const nextDate = new Date(today + "T00:00:00Z");
  nextDate.setUTCDate(nextDate.getUTCDate() + 30);
  const next30 = nextDate.toISOString().slice(0, 10);
  const current = assessments.filter(row => !archived.has(row.status));
  const currentIds = new Set(current.map(row => row.id));
  const liveHazards = hazards.filter(row => currentIds.has(row.assessment_id));
  const scored = liveHazards.filter(row => Number.isFinite(row.residual_score));
  const elevated = scored.filter(row => row.residual_score >= 10);
  const unacceptable = elevated.filter(row => row.residual_score >= 15);
  const open = actions.filter(row => currentIds.has(row.assessment_id) && openStatuses.has(row.status));
  const verified = actions.filter(row => currentIds.has(row.assessment_id) && (row.status === "effective" || row.effectiveness_result === "effective_verified"));
  const approved = current.filter(row => ["approved", "communicated"].includes(row.status));
  const timing = (rows, field) => ({
    today: rows.filter(row => dateKey(row[field]) === today),
    upcoming: rows.filter(row => dateKey(row[field]) > today && dateKey(row[field]) <= next30),
    overdue: rows.filter(row => dateKey(row[field]) && dateKey(row[field]) < today),
  });
  const actionDates = timing(open, "target_date");
  const reviewDates = timing(current, "review_date");
  const awaiting = open.filter(row => verificationStatuses.has(row.status));
  const overdueHigh = actionDates.overdue.filter(row => ["high", "critical"].includes(row.priority));
  const exceptions = [];
  function add(tone, key, label, rows, decision) {
    if (rows?.length) exceptions.push({ tone, key, label, count: rows.length, decision });
  }
  add("red", "unacceptable", "Unacceptable residual hazards", unacceptable, "Confirm immediate controls and who will review the residual risks.");
  add("red", "overdue-high", "High-priority control actions overdue", overdueHigh, "Agree an accountable owner and recovery date for the overdue work.");
  add("orange", "other-overdue-actions", "Other control actions overdue", actionDates.overdue.filter(row => !overdueHigh.includes(row)), "Agree revised delivery dates for overdue actions.");
  add("orange", "overdue-reviews", "Assessment reviews overdue", reviewDates.overdue, "Confirm who will review the outstanding assessments and by when.");
  add("orange", "verification", "Control actions awaiting verification", awaiting, "Assign verification and agree the evidence required.");
  add("orange", "overdue-inspections", "Workplace inspections overdue", inspections?.overdue, "Confirm the fieldwork recovery plan.");
  add("orange", "due-reviews", "Assessment reviews due today", reviewDates.today, "Confirm the reviews due today can be completed.");
  add("orange", "due-actions", "Control actions due today", actionDates.today, "Confirm the actions due today can be completed.");
  add("orange", "upcoming-reviews", "Assessment reviews due in the next 30 days", reviewDates.upcoming, "Confirm reviewer availability for upcoming reviews.");
  add("orange", "upcoming-actions", "Control actions due in the next 30 days", actionDates.upcoming, "Confirm capacity for upcoming actions.");
  const missingRecords = current.length === 0 || scored.length === 0 || scored.length !== liveHazards.length || inspections === null;
  const status = exceptions.some(item => item.tone === "red") ? "red"
    : missingRecords ? "neutral" : exceptions.length ? "orange" : "green";

  return { current, liveHazards, approved, elevated, unacceptable, open, overdueHigh, verified, scored, actionDates, reviewDates, awaiting, status, exceptions, missingRecords };
}
