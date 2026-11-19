export const THEMES = {
  organisational: "Organisational",
  people: "People",
  physical: "Physical",
  technological: "Technological",
};

const londonDate = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/London", day: "2-digit", month: "2-digit", year: "numeric",
});

export function boardDate(now = new Date()) {
  return londonDate.format(now).split("/").reverse().join("-");
}

export function percentage(count, total) {
  return total ? Math.round(100 * count / total) : null;
}

export function securityMetrics({ risks, methodologies, treatments, incidents, acceptances }, today, year, quarter) {
  const thresholds = methodologies && new Map(methodologies.map(row => [row.id, row.appetite_score]));
  const activeRisks = risks?.filter(row => !["draft", "closed", "archived"].includes(row.status));
  const riskRows = thresholds && activeRisks?.map(row => ({ ...row, appetite: thresholds.get(row.methodology_id) }));
  const above = riskRows?.filter(row => Number.isFinite(row.appetite) && row.residual_score > row.appetite);
  const unresolved = riskRows?.filter(row => !Number.isFinite(row.appetite));
  const openTreatments = treatments?.filter(row => !["verified", "cancelled"].includes(row.status));
  const overdue = openTreatments?.filter(row => row.target_date && row.target_date < today);
  const undated = openTreatments?.filter(row => !row.target_date);
  const dated = treatments?.filter(row => row.status !== "cancelled" && row.target_date?.startsWith(year + "-"));
  const cohorts = dated && [1, 2, 3, 4].filter(number => quarter === "all" || String(number) === quarter).map(number => {
    const rows = dated.filter(row => Math.ceil(Number(row.target_date.slice(5, 7)) / 3) === number);
    return { number, rows, verified: rows.filter(row => row.status === "verified") };
  });
  const activeIncidents = incidents?.filter(row => !["closed", "cancelled"].includes(row.status));
  const serious = activeIncidents?.filter(row => ["high", "critical"].includes(row.severity));
  const overdueRecovery = activeIncidents?.filter(row => row.target_recovery_date && row.target_recovery_date < today);
  const incidentVerification = activeIncidents?.filter(row => row.status === "awaiting_verification");
  const activeRiskIds = risks && new Set(risks.filter(row => !["closed", "archived"].includes(row.status)).map(row => row.id));
  const riskAcceptances = activeRiskIds && acceptances?.filter(row => activeRiskIds.has(row.risk_id));
  const pending = riskAcceptances?.filter(row => row.decision === "pending");
  const limit = new Date(today + "T00:00:00Z");
  limit.setUTCDate(limit.getUTCDate() + 30);
  const cutoff = limit.toISOString().slice(0, 10);
  const expiring = riskAcceptances?.filter(row => row.decision === "accepted" && row.expires_at >= today && row.expires_at <= cutoff);
  const expired = riskAcceptances?.filter(row => row.decision === "expired" || (row.decision === "accepted" && row.expires_at && row.expires_at < today));
  return { activeRisks, above, unresolved, overdue, undated, cohorts, activeIncidents, serious, overdueRecovery, incidentVerification, pending, expiring, expired };
}

export function controlMetrics(entries, catalog) {
  const applicable = entries.filter(row => row.applicability === "applicable");
  const effective = applicable.filter(row => row.implementation_status === "effective");
  const implemented = applicable.filter(row => ["implemented", "effective"].includes(row.implementation_status));
  const decided = entries.filter(row => ["applicable", "not_applicable"].includes(row.applicability));
  const groups = Object.entries({ ...THEMES, unclassified: "Unclassified" }).map(([key, label]) => {
    const rows = applicable.filter(row => {
      const theme = catalog.get(row.control_id)?.theme;
      return key === "unclassified" ? !Object.hasOwn(THEMES, theme) : theme === key;
    });
    const effective = rows.filter(row => row.implementation_status === "effective").length;
    const implemented = rows.filter(row => row.implementation_status === "implemented").length;
    return { key, label, rows, effective, implemented, other: rows.length - effective - implemented };
  });
  return { applicable, effective, implemented, decided, groups };
}
