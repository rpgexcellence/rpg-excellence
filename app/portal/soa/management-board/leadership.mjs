const WORKSTREAMS = [
  ["treatments", "Risk treatments"],
  ["actions", "SoA control actions"],
  ["riskReviews", "Risk reviews"],
  ["soaReviews", "SoA reviews"],
  ["recovery", "Incident recovery"],
];

export function managementReview({ security, treatments, entries, controls, registers, today, includeSoa = true }) {
  const nextMonth = new Date(today + "T00:00:00Z");
  nextMonth.setUTCDate(nextMonth.getUTCDate() + 30);
  const cutoff = nextMonth.toISOString().slice(0, 10);
  const openTreatments = treatments?.filter(row => !["verified", "cancelled"].includes(row.status));
  const openActions = entries?.filter(row => ["planned", "in_progress", "awaiting_verification"].includes(row.action_status));
  const currentRegisters = registers?.filter(row => row.status !== "superseded");
  const reviewQueue = currentRegisters?.filter(row => row.status === "under_review");
  const draftRegisters = currentRegisters?.filter(row => row.status === "draft");
  const unassured = controls ? controls.applicable.length - controls.effective.length : null;
  const undecided = entries?.filter(row => row.applicability === "pending");

  function lane(key, rows, dateField, verification) {
    const date = row => row[dateField]?.slice(0, 10);
    return {
      key,
      label: WORKSTREAMS.find(([id]) => id === key)[1],
      today: rows?.filter(row => date(row) === today),
      upcoming: rows?.filter(row => date(row) > today && date(row) <= cutoff),
      overdue: rows?.filter(row => date(row) && date(row) < today),
      verification,
      undated: rows?.filter(row => !date(row)),
    };
  }

  const work = [
    lane("treatments", openTreatments, "target_date", openTreatments?.filter(row => row.status === "implemented")),
    lane("actions", openActions, "target_date", openActions?.filter(row => row.action_status === "awaiting_verification")),
    lane("riskReviews", security.activeRisks, "review_due_date", false),
    lane("soaReviews", currentRegisters, "review_due_at", false),
    lane("recovery", security.activeIncidents, "target_recovery_date", security.incidentVerification),
  ];

  const exceptions = [];
  function add(severity, key, title, rows, decision) {
    if (rows?.length) exceptions.push({ severity, key, title, count: rows.length, decision });
  }

  add("red", "risks", "Risks above appetite", security.above, "Agree the treatment or route the residual exposure to the authorised decision-maker.");
  add("red", "serious", "Active high or critical incidents", security.serious, "Confirm recovery accountability and agree the next executive update.");
  for (const item of work) add("red", item.key + "-overdue", item.label + " overdue", item.overdue, "Confirm the accountable owner, recovery date and next evidence checkpoint.");
  add("red", "expired", "Expired risk acceptances", security.expired, "Escalate the lapsed acceptance for a fresh decision.");
  add("orange", "pending", "Risk acceptances awaiting decision", security.pending, "Confirm who can accept the exposure and by when.");
  add("orange", "expiring", "Risk acceptances expiring within 30 days", security.expiring, "Decide whether to renew the acceptance or require additional treatment.");
  add("orange", "thresholds", "Risks without an approved appetite threshold", security.unresolved, "Confirm the threshold before drawing an assurance conclusion.");
  add("orange", "soa-review-queue", "SoA registers awaiting review", reviewQueue, "Confirm reviewer and decision date.");
  add("orange", "soa-drafts", "SoA registers still in draft", draftRegisters, "Agree the route to approval and the evidence required.");
  add("orange", "soa-undecided", "SoA controls awaiting an applicability decision", undecided, "Agree who will complete the applicability assessment.");
  for (const item of work) {
    add("orange", item.key + "-today", item.label + " due today", item.today, "Confirm delivery and agree the next update.");
    add("orange", item.key + "-verification", item.label + " awaiting verification", item.verification, "Confirm who will verify the evidence and when.");
    add("orange", item.key + "-upcoming", item.label + " due in the next 30 days", item.upcoming, "Confirm capacity to meet the dates.");
  }
  add("orange", "treatments-undated", "Risk treatments missing a due date", work[0].undated, "Set a date for each open treatment.");
  add("orange", "actions-undated", "SoA actions missing a due date", work[1].undated, "Set a date for each open action.");

  const missingSources = [security.above, security.activeIncidents, security.pending, treatments, ...(includeSoa ? [entries, registers] : [])].some(rows => rows == null);
  const hasBaseline = Boolean(controls?.applicable.length || security.activeRisks?.length || currentRegisters?.length || openTreatments?.length || security.activeIncidents?.length);
  const status = exceptions.some(item => item.severity === "red") ? "red"
    : missingSources || !hasBaseline ? "neutral"
    : exceptions.length || unassured > 0 ? "orange" : "green";
  return { status, work, exceptions, missingSources, reviewQueue, draftRegisters, undecided, unassured };
}
