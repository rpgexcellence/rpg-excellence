export const POWRA_ROOT = "/portal/health-safety/powra";

export const decisionDetails = {
  safe_to_start: ["Safe to Start", "safe"],
  additional_controls: ["Additional Controls Required", "controls"],
  supervisor_review: ["Supervisor Review", "review"],
  stop_work: ["Stop Work", "stop"],
  pending: ["Checks incomplete", "neutral"],
};

export const closureLabels = {
  completed: "Task completed",
  cancelled: "Cancelled before start",
  stopped: "Ended after Stop Work",
  referred: "Referred for reassessment",
};

export function decidePowra(checks, hazards, { linked, noHazards, stop }) {
  if (stop || checks.some(row => row.answer === "no") || hazards.some(row => row.remaining_risk === "high")) return "stop_work";
  if (checks.some(row => !row.answer) || hazards.some(row => !row.remaining_risk) || (!hazards.length && !noHazards)) return "pending";
  if (!linked || hazards.some(row => row.changed || row.remaining_risk === "medium")) return "supervisor_review";
  if (hazards.some(row => !row.control?.trim() || row.verified !== true)) return "additional_controls";
  return "safe_to_start";
}

export function closureOptions(decision) {
  if (decision === "stop_work") return ["stopped"];
  if (decision === "safe_to_start") return ["completed", "cancelled"];
  return ["referred", "cancelled"];
}

export function powraDecision(record) {
  if (record.decision === "supervisor_review" && record.end_review?.point_of_work?.additional_controls === true) return "additional_controls";
  return Object.hasOwn(decisionDetails, record.decision) ? record.decision : "pending";
}

export function powraStatus(record) {
  if (record.status === "closed") return record.end_review?.outcome === "completed" ? "Completed" : "Closed";
  if (record.status === "cancelled") return "Cancelled";
  if (record.status === "stopped") return "Stopped";
  if (powraDecision(record) === "additional_controls") return "On hold";
  if (record.status === "supervisor_review") return "Awaiting Supervisor";
  return "Active";
}

export function powraViews(record) {
  if (record.status === "closed" || record.status === "cancelled") {
    return record.status === "closed" && record.end_review?.outcome === "completed" ? ["completed"] : ["closed"];
  }
  if (record.status === "stopped") return ["stop"];
  if (powraDecision(record) === "additional_controls") return ["active"];
  if (record.status === "supervisor_review") return ["review"];
  if (record.status === "open") return ["active"];
  return [];
}

export function powraOutstanding(record) {
  const hazards = Array.isArray(record.hazards) ? record.hazards : [];
  return hazards.some(row => typeof row?.verified !== "boolean") ? null : hazards.filter(row => !row.verified || !row.control?.trim()).length;
}

export function powraDate(value) {
  return value ? new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeZone: "Europe/London" }).format(new Date(value)) : "Not recorded";
}

export function powraTime(value) {
  return value ? new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/London" }).format(new Date(value)) : "Not recorded";
}
