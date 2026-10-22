export const INCIDENT_DOMAINS = [
  ["health_safety", "Health & safety"],
  ["quality", "Quality / product"],
  ["environment", "Environment"],
  ["information_security", "Information security"],
  ["business_continuity", "Business disruption"],
];
export const INCIDENT_TYPES = [
  ["accident", "Accident / injury"],
  ["incident", "Incident"],
  ["near_miss", "Near miss"],
  ["concern", "Hazard / concern"],
  ["disruption", "Business disruption"],
];
export const INCIDENT_STATUSES = [
  "reported",
  "triaged",
  "investigating",
  "actions_open",
  "awaiting_verification",
  "closed",
  "rejected",
  "duplicate",
];
export const INCIDENT_SEVERITIES = ["low", "medium", "high", "critical"];
export const TERMINAL_INCIDENTS = new Set(["closed", "rejected", "duplicate"]);
export const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const text = (value, max) => {
  const s = String(value || "").trim();
  if (s.length > max) throw Error("An entry exceeds its permitted length.");
  return s;
};
export function incidentPriority({
  actual = 1,
  potential = 1,
  likelihood = 1,
  immediateDanger = false,
}) {
  for (const n of [actual, potential, likelihood])
    if (!Number.isInteger(n) || n < 1 || n > 5)
      throw Error("Risk scores must be whole numbers between 1 and 5.");
  const score = Math.max(actual, potential) * likelihood;
  return {
    score,
    band:
      immediateDanger || score >= 20
        ? "critical"
        : score >= 12
          ? "high"
          : score >= 5
            ? "medium"
            : "low",
  };
}
export function validateIncidentIntake(raw, now = Date.now()) {
  const title = text(raw.title, 180),
    description = text(raw.description, 6000);
  if (title.length < 5 || description.length < 20)
    throw Error(
      "Enter a title of at least 5 characters and a description of at least 20 characters.",
    );
  const domains = [...new Set(Array.isArray(raw.domains) ? raw.domains : [])];
  if (
    !domains.length ||
    domains.some((x) => !INCIDENT_DOMAINS.some(([k]) => k === x))
  )
    throw Error("Choose at least one reporting area.");
  if (!INCIDENT_TYPES.some(([k]) => k === raw.report_type))
    throw Error("Choose a report type.");
  if (!INCIDENT_SEVERITIES.includes(raw.reported_criticality))
    throw Error("Choose the reported urgency.");
  if (!["yes", "no", "unknown"].includes(raw.manager_notified))
    throw Error("Select whether a manager has been informed.");
  const occurrenceInput = String(raw.occurred_at || "");
  const occurred = new Date(
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(occurrenceInput)
      ? occurrenceInput + "Z"
      : occurrenceInput,
  );
  if (!Number.isFinite(occurred.getTime()) || occurred.getTime() > now + 300000)
    throw Error("Enter a valid occurrence time, no later than now.");
  const anonymous = raw.anonymous !== false;
  const contact = anonymous
    ? null
    : {
        name: text(raw.contact_name, 120),
        email: text(raw.contact_email, 254),
        phone: text(raw.contact_phone, 60),
      };
  if (contact && !raw.contact_consent)
    throw Error(
      "Confirm permission to use your contact details for this report.",
    );
  if (contact && (!contact.name || (!contact.email && !contact.phone)))
    throw Error(
      "To leave contact details, provide a name and email or telephone number.",
    );
  if (contact?.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email))
    throw Error("Check the contact email address.");
  return {
    values: {
      title,
      description,
      domains,
      report_type: raw.report_type,
      reported_criticality: raw.reported_criticality,
      occurred_at: occurred.toISOString(),
      anonymous,
      immediate_danger: raw.immediate_danger === true,
      manager_notified: raw.manager_notified,
      manager_details: text(raw.manager_details, 500),
      immediate_action: text(raw.immediate_action, 2000),
    },
    contact,
  };
}
const active = (row, today) =>
  row.status === "authorised" &&
  (!row.expires_at || row.expires_at.slice(0, 10) >= today);
export function incidentFunctions(
  access,
  today = new Date().toISOString().slice(0, 10),
) {
  return new Set(
    (access.functions || [])
      .filter((r) => active(r, today))
      .map((r) => r.function_key),
  );
}
export function isIncidentAdministrator(access) {
  return Boolean(
    access?.isOwner ||
    access?.isCompanyAdministrator ||
    (access?.permissions?.some(
      (p) => p.module_key === "incidents" && p.access_level === "admin",
    ) &&
      incidentFunctions(access).has("accident_incident_admin")),
  );
}
export function canReadIncident(access, report) {
  if (!access?.user || access.organization?.id !== report.organization_id)
    return false;
  if (access.isOwner || access.isCompanyAdministrator) return true;
  const p = (access.permissions || []).find(
    (p) => p.module_key === "incidents" && p.access_level !== "none",
  );
  if (!p) return false;
  const assigned = [
    report.investigator_person_id,
    report.verifier_person_id,
    ...(report.team_person_ids || []),
  ].includes(access.person?.id);
  if (p.scope_type === "assigned_records" && !assigned) return false;
  if (
    p.scope_type === "site" &&
    !(p.scope_values || []).includes(report.site_id)
  )
    return false;
  if (p.scope_type === "department" && !assigned) return false;
  if (isIncidentAdministrator(access)) return true;
  if (
    (report.domains || []).includes("information_security") &&
    !incidentFunctions(access).has("security_incident_lead") &&
    !(access.permissions || []).some(
      (p) =>
        p.module_key === "information_security" && p.access_level !== "none",
    )
  )
    return false;
  return true;
}
export function incidentStatistics(reports, tasks = [], now = Date.now()) {
  const valid = reports.filter(
    (r) => r.triaged_at && !["rejected", "duplicate"].includes(r.status),
  );
  const byDomain = Object.fromEntries(
    INCIDENT_DOMAINS.map(([k]) => [
      k,
      valid.filter((r) => r.domains.includes(k)).length,
    ]),
  );
  const byType = Object.fromEntries(
    INCIDENT_TYPES.map(([k]) => [
      k,
      valid.filter((r) => r.report_type === k).length,
    ]),
  );
  const monthCounts = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now);
    d.setUTCDate(1);
    d.setUTCMonth(d.getUTCMonth() - 5 + i);
    const key = d.toISOString().slice(0, 7);
    return {
      key,
      count: valid.filter(
        (r) => (r.occurred_at || r.created_at || "").slice(0, 7) === key,
      ).length,
    };
  });
  const acceptedIds = new Set(reports.map((r) => r.id));
  return {
    received: reports.length,
    untriaged: reports.filter((r) => r.status === "reported").length,
    confirmed: valid.length,
    open: valid.filter((r) => !TERMINAL_INCIDENTS.has(r.status)).length,
    criticalOpen: reports.filter(
      (r) =>
        !TERMINAL_INCIDENTS.has(r.status) &&
        (r.criticality === "critical" ||
          r.immediate_danger ||
          r.reported_criticality === "critical"),
    ).length,
    overdueTasks: tasks.filter(
      (t) =>
        acceptedIds.has(t.incident_id) &&
        !["verified", "cancelled"].includes(t.status) &&
        new Date(t.due_at).getTime() < now,
    ).length,
    byDomain,
    byType,
    months: monthCounts,
  };
}
