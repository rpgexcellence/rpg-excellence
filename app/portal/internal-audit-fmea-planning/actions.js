"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "../../../lib/supabase/server";

const clean = (value) => typeof value === "string" && value.trim() ? value.trim() : null;
const score = (value) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= 5 ? parsed : null;
};
const MODIFIERS = { major: 25, repeat: 20, regulatory: 20, change: 15, new: 15, trend: 10, performance: -10, assurance: -10 };
const CONSEQUENCE_KEYS = ["quality", "legal", "environment", "safety", "security", "continuity", "certification"];

function recommendation(value) {
  if (value >= 100) return { band: "critical", frequency: "Audit within 3–6 months" };
  if (value >= 70) return { band: "high", frequency: "Audit within 12 months" };
  if (value >= 40) return { band: "medium", frequency: "Audit within 18–24 months" };
  return { band: "lower", frequency: "At least once in the three-year cycle" };
}

export async function saveFmeaPlanningAssessment(formData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/portal/login?next=/portal/internal-audit-fmea-planning");

  const processArea = clean(formData.get("process_area"));
  const programmeId = clean(formData.get("programme_id"));
  const siteId = clean(formData.get("site_id"));
  const failureMode = clean(formData.get("failure_mode"));
  const credibleEffects = clean(formData.get("credible_effects"));
  const currentControls = clean(formData.get("current_controls"));
  const evidence = clean(formData.get("evidence"));
  const leadAuditor = clean(formData.get("lead_auditor"));
  const decision = clean(formData.get("decision"));
  const decisionRationale = clean(formData.get("decision_rationale"));
  const confirmed = formData.get("lead_auditor_confirmation") === "confirmed";
  const likelihood = score(formData.get("likelihood"));
  const detectability = score(formData.get("detectability"));
  const consequenceScores = Object.fromEntries(CONSEQUENCE_KEYS.map((key) => [key, score(formData.get(`consequence_${key}`))]));
  const selectedStandards = [...new Set(formData.getAll("standard_codes").map(clean).filter(Boolean))];
  const selectedModifiers = [...new Set(formData.getAll("modifiers").map(clean).filter((key) => Object.hasOwn(MODIFIERS, key)))];

  if (!programmeId || !processArea || !failureMode || !credibleEffects || !currentControls || !evidence || !leadAuditor || !decisionRationale || !confirmed || !likelihood || !detectability || Object.values(consequenceScores).some((value) => !value)) {
    throw new Error("Complete the process, evidence, scoring, lead-auditor rationale and confirmation before saving.");
  }
  if (!selectedStandards.length) throw new Error("Select at least one applicable standard.");
  if (!["accept", "increase", "decrease"].includes(decision)) throw new Error("Select a valid lead-auditor decision.");

  const { data: programme, error: programmeError } = await supabase.from("internal_audit_programmes")
    .select("id,title").eq("id", programmeId).eq("owner_id", user.id).maybeSingle();
  if (programmeError) throw new Error(programmeError.message);
  if (!programme) throw new Error("Select a controlled three-year audit programme.");
  if (siteId) {
    const { data: site, error: siteError } = await supabase.from("internal_audit_programme_sites")
      .select("id").eq("id", siteId).eq("programme_id", programmeId).eq("owner_id", user.id).maybeSingle();
    if (siteError) throw new Error(siteError.message);
    if (!site) throw new Error("The selected location does not belong to this programme.");
  }
  const { data: programmeStandards, error: programmeStandardsError } = await supabase
    .from("internal_audit_programme_standards")
    .select("internal_audit_standard_catalogue(standard_code,display_name)")
    .eq("programme_id", programmeId).eq("owner_id", user.id);
  if (programmeStandardsError) throw new Error(programmeStandardsError.message);
  const allowedStandards = new Set((programmeStandards || []).flatMap((row) => {
    const standard = row.internal_audit_standard_catalogue;
    return standard ? [standard.standard_code, standard.display_name].filter(Boolean) : [];
  }));
  if (selectedStandards.some((standard) => !allowedStandards.has(standard))) {
    throw new Error("One or more selected standards are outside the chosen programme scope.");
  }

  const highestConsequence = Math.max(...Object.values(consequenceScores));
  const baseScore = highestConsequence * likelihood * detectability;
  const modifierAdjustment = selectedModifiers.reduce((total, key) => total + MODIFIERS[key], 0);
  const finalScore = Math.max(1, baseScore + modifierAdjustment);
  const result = recommendation(finalScore);
  const reference = `FMEA-${new Date().getUTCFullYear()}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
  const appliedModifiers = selectedModifiers.map((key) => ({ key, points: MODIFIERS[key] }));

  const frequencyMonths = result.band === "critical" ? 6 : result.band === "high" ? 12 : result.band === "medium" ? 18 : 36;
  const { data: assessment, error } = await supabase.from("internal_audit_fmea_planning_assessments").insert({
    owner_id: user.id,
    programme_id: programmeId,
    site_id: siteId,
    assessment_reference: reference,
    process_area: processArea,
    site_or_function: clean(formData.get("site_or_function")),
    failure_mode: failureMode,
    credible_effects: credibleEffects,
    current_controls: currentControls,
    evidence_considered: evidence,
    selected_standards: selectedStandards,
    consequence_scores: consequenceScores,
    highest_consequence: highestConsequence,
    likelihood,
    detectability,
    base_score: baseScore,
    applied_modifiers: appliedModifiers,
    modifier_adjustment: modifierAdjustment,
    final_score: finalScore,
    recommended_band: result.band,
    recommended_frequency: result.frequency,
    lead_auditor_name: leadAuditor,
    lead_auditor_decision: decision,
    decision_rationale: decisionRationale,
    confirmed_at: new Date().toISOString(),
  }).select("id").single();
  if (error) throw new Error(error.message);

  const { data: programmeRisk, error: riskError } = await supabase.from("internal_audit_programme_risks").insert({
    owner_id: user.id,
    programme_id: programmeId,
    site_id: siteId,
    scope_level: siteId ? "site" : "process",
    process_area: processArea,
    site_or_function: clean(formData.get("site_or_function")),
    failure_mode: failureMode,
    potential_effect: credibleEffects,
    potential_cause: `Evidence-based FMEA planning assessment ${reference}`,
    current_controls: currentControls,
    severity: Math.min(10, highestConsequence * 2),
    occurrence: Math.min(10, likelihood * 2),
    detection: Math.min(10, detectability * 2),
    regulatory_exposure: consequenceScores.legal,
    process_failure_impact: highestConsequence,
    customer_impact_probability: likelihood,
    failure_detectability: detectability,
    planning_score: finalScore,
    priority_override: result.band === "lower" ? "low" : result.band,
    required_frequency_months: frequencyMonths,
    rationale: decisionRationale,
    source_fmea_assessment_id: assessment.id,
    source_fmea_reference: reference,
  }).select("id").single();
  if (riskError) throw new Error(riskError.message);

  const { error: linkError } = await supabase.from("internal_audit_fmea_planning_assessments").update({
    programme_risk_id: programmeRisk.id,
    promoted_at: new Date().toISOString(),
  }).eq("id", assessment.id).eq("owner_id", user.id);
  if (linkError) throw new Error(linkError.message);

  await supabase.from("internal_audit_programme_events").insert({
    owner_id: user.id,
    programme_id: programmeId,
    event_type: "fmea_assessment_added",
    summary: `${reference} added to the programme risk universe`,
    created_by: user.id,
    event_data: { assessment_id: assessment.id, programme_risk_id: programmeRisk.id, score: finalScore, band: result.band },
  });

  revalidatePath("/portal/internal-audit-fmea-planning");
  revalidatePath("/portal/internal-audit-programme");
  redirect(`/portal/internal-audit-programme?programme=${programmeId}&saved=fmea&fmea=${reference}#fmea`);
}
