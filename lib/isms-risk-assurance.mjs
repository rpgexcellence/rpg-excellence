export const BASES = { inherent: "Inherent", residual: "Residual", target: "Target" };

export const RISK_BANDS = [
  [1, 4, "Low", "#247650", "#fff"], [5, 9, "Moderate", "#edbd4b", "#382705"],
  [10, 14, "High", "#e88146", "#321a08"], [15, 19, "Very high", "#ad392f", "#fff"],
  [20, 25, "Critical", "#892337", "#fff"],
];

export function rating(risk, basis = "residual") {
  const likelihood = Number(risk[basis + "_likelihood"]);
  const impact = Number(risk[basis + "_impact"]);
  if (![likelihood, impact].every(value => Number.isInteger(value) && value >= 1 && value <= 5)) return null;
  return { likelihood, impact, score: likelihood * impact, cell: likelihood + "-" + impact };
}

export const riskBand = score => RISK_BANDS.find(([min, max]) => score >= min && score <= max);
export const treatmentOpen = action => !["verified", "cancelled"].includes(action.status);
export const activeRisk = risk => !["closed", "archived", "draft"].includes(risk.status);

export function controlState(link, entry) {
  const needsAction = ["planned", "in_progress", "awaiting_verification"].includes(entry?.action_status);
  const evidence = entry?.effectiveness_evidence || entry?.action_verification_conclusion ||
    entry?.implementation_evidence || link.evidence_reference || "";
  const verified = (entry?.implementation_status === "effective" && Boolean(entry.effectiveness_evidence?.trim())) ||
    (link.operating_effectiveness === "effective" && Boolean(link.evidence_reference?.trim()));
  const implemented = verified || ["implemented", "effective"].includes(entry?.implementation_status);
  return { state: verified ? "Verified effective" : implemented ? "Implemented" : "Selected", needsAction, evidence };
}

export function acceptanceState(risk, acceptance, today) {
  if (!acceptance) return "Not recorded";
  if (acceptance.expires_at && acceptance.expires_at < today) return "Expired";
  if (rating(risk)?.score !== acceptance.accepted_score) return "Superseded";
  if (acceptance.decision === "accepted") {
    if (!acceptance.decided_at || (risk.updated_at && Date.parse(risk.updated_at) > Date.parse(acceptance.decided_at))) return "Superseded";
    return "Accepted";
  }
  if (acceptance.decision === "pending" && risk.updated_at && Date.parse(risk.updated_at) > Date.parse(acceptance.created_at)) return "Superseded";
  return ({ pending: "Pending decision", rejected: "Rejected", expired: "Expired" })[acceptance.decision] || "Not recorded";
}

export function toRiskCsv(rows) {
  return "\uFEFF" + rows.map(row => row.map(value => {
    const raw = String(value ?? "");
    const text = /^[\s\uFEFF]*[=+@-]|^[\t\r\n]/.test(raw) ? "'" + raw : raw;
    return '"' + text.replaceAll('"', '""') + '"';
  }).join(",")).join("\r\n");
}
