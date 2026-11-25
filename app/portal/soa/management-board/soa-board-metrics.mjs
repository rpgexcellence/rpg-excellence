import { percentage } from "./metrics.mjs";

const stages = ["inherent", "residual", "target"];

export function recordedControlPosition(row, stage) {
  if (!stages.includes(stage)) return null;
  const likelihood = Number(row[stage + "_likelihood"]);
  const impact = Number(row[stage + "_impact"]);
  return [likelihood, impact].every(value => Number.isInteger(value) && value >= 1 && value <= 5)
    ? { likelihood, impact, score: likelihood * impact } : null;
}

export function soaBoardMetrics({ entries, controls, registers, review, findings, catalog }) {
  const mapped = entries?.filter(row => recordedControlPosition(row, "residual"));
  const elevated = mapped?.filter(row => recordedControlPosition(row, "residual").score >= 10);
  const critical = elevated?.filter(row => recordedControlPosition(row, "residual").score >= 20);
  const unmapped = entries?.filter(row => !recordedControlPosition(row, "residual"));
  const unowned = elevated?.filter(row => !row.risk_owner_person_id && !row.risk_owner?.trim());
  const actions = review.work.find(item => item.key === "actions");
  const missingSources = !entries || !registers || !actions?.overdue;
  const status = critical?.length || actions?.overdue?.length ? "red"
    : missingSources || !registers.length ? "neutral"
    : review.undecided?.length || review.draftRegisters?.length || elevated?.length ? "orange" : "green";
  const percent = value => value == null ? null : value + "%";
  return {
    mapped: entries?.map(row => ({
      assessmentId: row.assessment_id,
      controlId: row.control_id,
      title: catalog.get(row.control_id)?.control_title ?? "Annex A control",
      theme: catalog.get(row.control_id)?.theme,
      positions: Object.fromEntries(stages.map(stage => [stage, recordedControlPosition(row, stage)])),
    })) ?? [],
    critical, unmapped, unowned, findings, status, missingSources,
    measures: [
      ["Approved SoA registers", registers ? registers.filter(row => row.status === "approved").length + " of " + registers.length : null],
      ["Applicability decisions recorded", percent(controls && percentage(controls.decided.length, entries.length))],
      ["Applicable controls implemented", percent(controls && percentage(controls.implemented.length, controls.applicable.length))],
      ["Elevated mapped controls (score 10+)", elevated?.length],
      ["Accept / treat decisions", entries ? entries.filter(row => row.treatment_decision === "accept").length + " / " +
        entries.filter(row => ["reduce", "avoid", "share"].includes(row.treatment_decision)).length : null],
    ],
  };
}
