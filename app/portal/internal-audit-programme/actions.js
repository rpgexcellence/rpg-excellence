"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "../../../lib/supabase/server";

const clean = (value) => typeof value === "string" && value.trim() ? value.trim() : null;
const numberInRange = (value, min, max) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= min && parsed <= max ? parsed : null;
};

async function context() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/portal/login?next=/portal/internal-audit-programme");
  return { supabase, user };
}

async function ownedProgramme(supabase, userId, programmeId) {
  const { data, error } = await supabase.from("internal_audit_programmes")
    .select("*").eq("id", programmeId).eq("owner_id", userId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Three-year audit programme not found.");
  return {
    ...data,
    cycle_start: data.cycle_start || data.start_date,
    cycle_end: data.cycle_end || data.end_date,
    lead_auditor_name: data.lead_auditor_name || data.programme_owner_name,
    lead_auditor_email: data.lead_auditor_email || data.programme_owner_email,
  };
}

function programmeReference() {
  const year = new Date().getUTCFullYear();
  return `IAP-${year}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
}

export async function createProgramme(formData) {
  const { supabase, user } = await context();
  const organizationId = clean(formData.get("organization_id"));
  const title = clean(formData.get("title"));
  const cycleStart = clean(formData.get("cycle_start"));
  const leadAuditorName = clean(formData.get("lead_auditor_name"));
  const leadAuditorEmail = clean(formData.get("lead_auditor_email"));
  const objectives = clean(formData.get("objectives"));
  const siteStructure = clean(formData.get("site_structure"));
  const systemModel = clean(formData.get("system_model"));
  const samplingMethod = clean(formData.get("multisite_sampling_method"));
  const standardIds = [...new Set(formData.getAll("standard_ids").map(clean).filter(Boolean))];
  if (!organizationId || !title || !cycleStart || !leadAuditorName || !objectives || !["single_site", "multisite"].includes(siteStructure) || !["integrated", "separate", "hybrid"].includes(systemModel)) {
    throw new Error("Organisation, programme structure, system model, title, cycle start, lead auditor and objectives are required.");
  }
  if (siteStructure === "multisite" && !samplingMethod) throw new Error("Define the multisite sampling and three-year rotation method.");
  if (standardIds.length < 1 || standardIds.length > 5) throw new Error("Select between one and five controlled programme standards.");
  const start = new Date(`${cycleStart}T00:00:00Z`);
  if (Number.isNaN(start.getTime())) throw new Error("Enter a valid programme start date.");
  const end = new Date(start);
  end.setUTCFullYear(end.getUTCFullYear() + 3);
  end.setUTCDate(end.getUTCDate() - 1);
  const { data: organization } = await supabase.from("organizations").select("id")
    .eq("id", organizationId).eq("owner_id", user.id).maybeSingle();
  if (!organization) throw new Error("Organisation not found.");
  const { data: standards, error: standardsError } = await supabase
    .from("internal_audit_standard_catalogue").select("id,standard_code,display_name")
    .in("id", standardIds).eq("active", true);
  if (standardsError) throw new Error(standardsError.message);
  if ((standards || []).length !== standardIds.length) throw new Error("One or more programme standards are unavailable.");
  const cycleEnd = end.toISOString().slice(0, 10);
  const contextAndChange = clean(formData.get("context_and_change"));
  const { data: programme, error } = await supabase.from("internal_audit_programmes").insert({
    owner_id: user.id, organization_id: organizationId, programme_reference: programmeReference(),
    title, description: objectives, cycle_start: cycleStart, cycle_end: cycleEnd,
    start_date: cycleStart, end_date: cycleEnd,
    lead_auditor_name: leadAuditorName, lead_auditor_email: leadAuditorEmail,
    programme_owner_name: leadAuditorName, programme_owner_email: leadAuditorEmail,
    objectives, context_and_change: contextAndChange, context_and_priorities: contextAndChange, status: "draft",
    site_structure: siteStructure, system_model: systemModel, central_functions: clean(formData.get("central_functions")),
    multisite_sampling_method: samplingMethod,
  }).select("id").single();
  if (error || !programme) throw new Error(error?.message || "Unable to create the programme.");
  const { error: linkError } = await supabase.from("internal_audit_programme_standards").insert(
    standardIds.map((standardId) => ({ owner_id: user.id, programme_id: programme.id, standard_id: standardId }))
  );
  if (linkError) throw new Error(linkError.message);
  await supabase.from("internal_audit_programme_events").insert({
    owner_id: user.id, programme_id: programme.id, event_type: "programme_created",
    summary: "Three-year internal audit programme created", created_by: user.id,
    event_data: { standards: standards || [], cycle_start: cycleStart, cycle_end: cycleEnd },
  });
  revalidatePath("/portal/internal-audit-programme");
  redirect(`/portal/internal-audit-programme?programme=${programme.id}&created=1`);
}

export async function updateProgramme(formData) {
  const { supabase, user } = await context();
  const programmeId = clean(formData.get("programme_id"));
  const existing = await ownedProgramme(supabase, user.id, programmeId);
  const title = clean(formData.get("title"));
  const cycleStart = clean(formData.get("cycle_start"));
  const leadAuditorName = clean(formData.get("lead_auditor_name"));
  const leadAuditorEmail = clean(formData.get("lead_auditor_email"));
  const objectives = clean(formData.get("objectives"));
  const contextAndChange = clean(formData.get("context_and_change"));
  const siteStructure = clean(formData.get("site_structure"));
  const systemModel = clean(formData.get("system_model"));
  const samplingMethod = clean(formData.get("multisite_sampling_method"));
  const standardIds = [...new Set(formData.getAll("standard_ids").map(clean).filter(Boolean))];
  if (!title || !cycleStart || !leadAuditorName || !objectives || !["single_site", "multisite"].includes(siteStructure) || !["integrated", "separate", "hybrid"].includes(systemModel)) {
    throw new Error("Complete all required programme-mandate fields.");
  }
  if (siteStructure === "multisite" && !samplingMethod) throw new Error("Define the multisite sampling and three-year rotation method.");
  if (standardIds.length < 1 || standardIds.length > 5) throw new Error("Select between one and five controlled programme standards.");
  const start = new Date(`${cycleStart}T00:00:00Z`);
  if (Number.isNaN(start.getTime())) throw new Error("Enter a valid programme start date.");
  const end = new Date(start); end.setUTCFullYear(end.getUTCFullYear() + 3); end.setUTCDate(end.getUTCDate() - 1);
  const cycleEnd = end.toISOString().slice(0, 10);
  const { data: validStandards, error: validError } = await supabase.from("internal_audit_standard_catalogue")
    .select("id").in("id", standardIds).eq("active", true);
  if (validError) throw new Error(validError.message);
  if ((validStandards || []).length !== standardIds.length) throw new Error("One or more programme standards are unavailable.");
  const { data: currentLinks, error: currentLinksError } = await supabase.from("internal_audit_programme_standards")
    .select("standard_id").eq("programme_id", programmeId).eq("owner_id", user.id);
  if (currentLinksError) throw new Error(currentLinksError.message);
  const removedStandardIds = (currentLinks || []).map((row) => row.standard_id).filter((id) => !standardIds.includes(id));
  if (removedStandardIds.length) {
    const { count: allocatedClauses, error: clauseCheckError } = await supabase.from("internal_audit_programme_audit_clauses")
      .select("id", { count: "exact", head: true }).eq("programme_id", programmeId).eq("owner_id", user.id).in("standard_id", removedStandardIds);
    if (clauseCheckError) throw new Error(clauseCheckError.message);
    if (allocatedClauses) throw new Error("A removed standard is already allocated to a planned audit. Revise that audit before changing programme scope.");
    const { error: siteStandardDeleteError } = await supabase.from("internal_audit_programme_site_standards")
      .delete().eq("programme_id", programmeId).eq("owner_id", user.id).in("standard_id", removedStandardIds);
    if (siteStandardDeleteError) throw new Error(siteStandardDeleteError.message);
    const { error: programmeStandardDeleteError } = await supabase.from("internal_audit_programme_standards")
      .delete().eq("programme_id", programmeId).eq("owner_id", user.id).in("standard_id", removedStandardIds);
    if (programmeStandardDeleteError) throw new Error(programmeStandardDeleteError.message);
  }
  const { error } = await supabase.from("internal_audit_programmes").update({
    title, description: objectives, objectives, cycle_start: cycleStart, cycle_end: cycleEnd,
    start_date: cycleStart, end_date: cycleEnd, lead_auditor_name: leadAuditorName,
    lead_auditor_email: leadAuditorEmail, programme_owner_name: leadAuditorName,
    programme_owner_email: leadAuditorEmail, context_and_change: contextAndChange,
    context_and_priorities: contextAndChange, site_structure: siteStructure, system_model: systemModel,
    central_functions: clean(formData.get("central_functions")), multisite_sampling_method: samplingMethod,
    updated_at: new Date().toISOString(),
  }).eq("id", programmeId).eq("owner_id", user.id);
  if (error) throw new Error(error.message);
  const { error: linkError } = await supabase.from("internal_audit_programme_standards").upsert(
    standardIds.map((standardId) => ({ owner_id: user.id, programme_id: programmeId, standard_id: standardId })),
    { onConflict: "programme_id,standard_id" }
  );
  if (linkError) throw new Error(linkError.message);
  await supabase.from("internal_audit_programme_events").insert({
    owner_id: user.id, programme_id: programmeId, event_type: "programme_mandate_updated",
    summary: "Programme mandate and controlled scope updated by the lead auditor", created_by: user.id,
    event_data: { previous_structure: existing.site_structure, site_structure: siteStructure, system_model: systemModel, standards: standardIds },
  });
  revalidatePath("/portal/internal-audit-programme");
  redirect(`/portal/internal-audit-programme?programme=${programmeId}&updated=1`);
}

export async function addProgrammeSite(formData) {
  const { supabase, user } = await context();
  const programmeId = clean(formData.get("programme_id"));
  await ownedProgramme(supabase, user.id, programmeId);
  const siteCode = clean(formData.get("site_code"));
  const siteName = clean(formData.get("site_name"));
  const scopeSummary = clean(formData.get("scope_summary"));
  const standardIds = [...new Set(formData.getAll("standard_ids").map(clean).filter(Boolean))];
  if (!siteCode || !siteName || !scopeSummary || !standardIds.length) {
    throw new Error("Site code, site name, scope and at least one applicable standard are required.");
  }
  const { data: allowedRows, error: allowedError } = await supabase.from("internal_audit_programme_standards")
    .select("standard_id").eq("programme_id", programmeId).eq("owner_id", user.id);
  if (allowedError) throw new Error(allowedError.message);
  const allowed = new Set((allowedRows || []).map((row) => row.standard_id));
  if (standardIds.some((id) => !allowed.has(id))) throw new Error("A selected standard is outside this programme.");
  const frequency = numberInRange(formData.get("minimum_frequency_months"), 3, 36);
  if (![3, 6, 12, 18, 24, 36].includes(frequency)) throw new Error("Select a controlled audit frequency.");
  const { data: site, error } = await supabase.from("internal_audit_programme_sites").insert({
    owner_id: user.id, programme_id: programmeId, site_code: siteCode, site_name: siteName,
    country: clean(formData.get("country")), business_unit: clean(formData.get("business_unit")),
    scope_summary: scopeSummary, site_type: clean(formData.get("site_type")) || "operational",
    sampling_status: clean(formData.get("sampling_status")) || "in_scope",
    sampling_rationale: clean(formData.get("sampling_rationale")), minimum_frequency_months: frequency,
  }).select("id").single();
  if (error || !site) throw new Error(error?.message || "Unable to add the programme location.");
  const { error: standardsError } = await supabase.from("internal_audit_programme_site_standards").insert(
    standardIds.map((standardId) => ({ owner_id: user.id, programme_id: programmeId, site_id: site.id, standard_id: standardId }))
  );
  if (standardsError) throw new Error(standardsError.message);
  await supabase.from("internal_audit_programme_events").insert({
    owner_id: user.id, programme_id: programmeId, event_type: "programme_site_added",
    summary: `${siteName} added to the multisite audit universe`, created_by: user.id,
    event_data: { site_id: site.id, standards: standardIds, frequency_months: frequency },
  });
  revalidatePath("/portal/internal-audit-programme");
  redirect(`/portal/internal-audit-programme?programme=${programmeId}&saved=site#sites`);
}

export async function addFmeaRisk(formData) {
  const { supabase, user } = await context();
  const programmeId = clean(formData.get("programme_id"));
  await ownedProgramme(supabase, user.id, programmeId);
  const siteId = clean(formData.get("site_id"));
  if (siteId) {
    const { data: site, error: siteError } = await supabase.from("internal_audit_programme_sites")
      .select("id").eq("id", siteId).eq("programme_id", programmeId).eq("owner_id", user.id).maybeSingle();
    if (siteError) throw new Error(siteError.message);
    if (!site) throw new Error("The selected location is outside this programme.");
  }
  const severity = numberInRange(formData.get("severity"), 1, 10);
  const occurrence = numberInRange(formData.get("occurrence"), 1, 10);
  const detection = numberInRange(formData.get("detection"), 1, 10);
  const processArea = clean(formData.get("process_area"));
  const failureMode = clean(formData.get("failure_mode"));
  const potentialEffect = clean(formData.get("potential_effect"));
  const potentialCause = clean(formData.get("potential_cause"));
  if (!processArea || !failureMode || !potentialEffect || !potentialCause || !severity || !occurrence || !detection) {
    throw new Error("Complete the FMEA process, failure mode, effect, cause and all three scores.");
  }
  const { error } = await supabase.from("internal_audit_programme_risks").insert({
    owner_id: user.id, programme_id: programmeId, process_area: processArea,
    site_or_function: clean(formData.get("site_or_function")), failure_mode: failureMode,
    potential_effect: potentialEffect, potential_cause: potentialCause,
    current_controls: clean(formData.get("current_controls")), severity, occurrence, detection,
    priority_override: clean(formData.get("priority_override")), rationale: clean(formData.get("rationale")),
    site_id: siteId, scope_level: clean(formData.get("scope_level")) || "process",
    required_frequency_months: Number(formData.get("required_frequency_months")) || 36,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/portal/internal-audit-programme");
  redirect(`/portal/internal-audit-programme?programme=${programmeId}&saved=risk#fmea`);
}

export async function addPlannedAudit(formData) {
  const { supabase, user } = await context();
  const programmeId = clean(formData.get("programme_id"));
  const programme = await ownedProgramme(supabase, user.id, programmeId);
  const title = clean(formData.get("title"));
  const processArea = clean(formData.get("process_area"));
  const plannedStart = clean(formData.get("planned_start"));
  const plannedEnd = clean(formData.get("planned_end"));
  const rationale = clean(formData.get("rationale"));
  const clauseValues = [...new Set(formData.getAll("clauses").map(clean).filter(Boolean))];
  if (!title || !processArea || !plannedStart || !plannedEnd || !rationale || clauseValues.length === 0) {
    throw new Error("Title, process, dates, risk rationale and at least one standard clause are required.");
  }
  const start = new Date(`${plannedStart}T00:00:00Z`);
  const end = new Date(`${plannedEnd}T00:00:00Z`);
  const cycleStart = new Date(`${programme.cycle_start}T00:00:00Z`);
  const cycleEnd = new Date(`${programme.cycle_end}T23:59:59Z`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start || start < cycleStart || end > cycleEnd) {
    throw new Error("Planned dates must be ordered and fall within the three-year cycle.");
  }
  let yearNo = start.getUTCFullYear() - cycleStart.getUTCFullYear() + 1;
  if (start < new Date(Date.UTC(cycleStart.getUTCFullYear() + yearNo - 1, cycleStart.getUTCMonth(), cycleStart.getUTCDate()))) yearNo -= 1;
  yearNo = Math.max(1, Math.min(3, yearNo));
  const parsedClauses = clauseValues.map((value) => {
    const [standardId, ...clauseParts] = value.split("|");
    return { standard_id: clean(standardId), clause: clean(clauseParts.join("|")) };
  }).filter((row) => row.standard_id && row.clause);
  if (parsedClauses.length !== clauseValues.length) throw new Error("One or more selected clauses are invalid.");
  const { data: programmeStandards, error: programmeStandardsError } = await supabase
    .from("internal_audit_programme_standards").select("standard_id")
    .eq("programme_id", programmeId).eq("owner_id", user.id);
  if (programmeStandardsError) throw new Error(programmeStandardsError.message);
  const allowedStandardIds = new Set((programmeStandards || []).map((row) => row.standard_id));
  if (parsedClauses.some((row) => !allowedStandardIds.has(row.standard_id))) {
    throw new Error("A selected clause is outside the controlled programme standards.");
  }
  const { data: validClauseRows, error: validClausesError } = await supabase
    .from("internal_audit_question_scope_links").select("standard_id,clause")
    .in("standard_id", [...allowedStandardIds]);
  if (validClausesError) throw new Error(validClausesError.message);
  const validClauseKeys = new Set((validClauseRows || []).map((row) => `${row.standard_id}|${row.clause}`));
  if (parsedClauses.some((row) => !validClauseKeys.has(`${row.standard_id}|${row.clause}`))) {
    throw new Error("A selected clause is not available in the controlled audit criteria bank.");
  }
  const riskId = clean(formData.get("risk_id"));
  if (riskId) {
    const { data: ownedRisk, error: riskError } = await supabase.from("internal_audit_programme_risks")
      .select("id").eq("id", riskId).eq("programme_id", programmeId).eq("owner_id", user.id).maybeSingle();
    if (riskError) throw new Error(riskError.message);
    if (!ownedRisk) throw new Error("The selected FMEA risk does not belong to this programme.");
  }
  const siteIds = [...new Set(formData.getAll("site_ids").map(clean).filter(Boolean))];
  if (!siteIds.length) throw new Error("Select at least one controlled programme location.");
  const { data: ownedSites, error: siteError } = await supabase.from("internal_audit_programme_sites")
    .select("id").eq("programme_id", programmeId).eq("owner_id", user.id).in("id", siteIds);
  if (siteError) throw new Error(siteError.message);
  if ((ownedSites || []).length !== siteIds.length) throw new Error("One or more selected locations are outside this programme.");
  const { data: plannedAudit, error } = await supabase.from("internal_audit_programme_audits").insert({
    owner_id: user.id, programme_id: programmeId, risk_id: riskId,
    title, process_area: processArea, site_or_function: clean(formData.get("site_or_function")),
    planned_start: plannedStart, planned_end: plannedEnd, year_no: yearNo,
    audit_method: clean(formData.get("audit_method")) || "onsite",
    priority: clean(formData.get("priority")) || "medium", status: "planned",
    lead_auditor_name: clean(formData.get("lead_auditor_name")) || programme.lead_auditor_name,
    rationale, estimated_days: Number(formData.get("estimated_days")) || 1,
    integrated_audit: formData.get("integrated_audit") === "on",
    scope_type: clean(formData.get("scope_type")) || "site_and_process",
    audit_team: clean(formData.get("audit_team")),
    site_sampling_rationale: clean(formData.get("site_sampling_rationale")),
    central_control_review: formData.get("central_control_review") === "on",
  }).select("id").single();
  if (error || !plannedAudit) throw new Error(error?.message || "Unable to add the planned audit.");
  const { error: clauseError } = await supabase.from("internal_audit_programme_audit_clauses").insert(
    parsedClauses.map((row) => ({ owner_id: user.id, programme_id: programmeId, programme_audit_id: plannedAudit.id, ...row }))
  );
  if (clauseError) throw new Error(clauseError.message);
  const { error: auditSitesError } = await supabase.from("internal_audit_programme_audit_sites").insert(
    siteIds.map((siteId) => ({ owner_id: user.id, programme_id: programmeId, programme_audit_id: plannedAudit.id, site_id: siteId, sample_reason: clean(formData.get("site_sampling_rationale")) }))
  );
  if (auditSitesError) throw new Error(auditSitesError.message);
  await supabase.from("internal_audit_programme_events").insert({
    owner_id: user.id, programme_id: programmeId, event_type: "audit_planned",
    summary: `${title} added to Year ${yearNo}`, created_by: user.id,
    event_data: { planned_audit_id: plannedAudit.id, clause_count: parsedClauses.length, priority: clean(formData.get("priority")) || "medium" },
  });
  revalidatePath("/portal/internal-audit-programme");
  redirect(`/portal/internal-audit-programme?programme=${programmeId}&saved=audit#gantt`);
}

export async function approveProgramme(formData) {
  const { supabase, user } = await context();
  const programmeId = clean(formData.get("programme_id"));
  await ownedProgramme(supabase, user.id, programmeId);
  const [{ count: riskCount }, { count: auditCount }, { count: clauseCount }, { data: sites }, { data: auditSites }] = await Promise.all([
    supabase.from("internal_audit_programme_risks").select("id", { count: "exact", head: true }).eq("programme_id", programmeId).eq("owner_id", user.id),
    supabase.from("internal_audit_programme_audits").select("id", { count: "exact", head: true }).eq("programme_id", programmeId).eq("owner_id", user.id),
    supabase.from("internal_audit_programme_audit_clauses").select("id", { count: "exact", head: true }).eq("programme_id", programmeId).eq("owner_id", user.id),
    supabase.from("internal_audit_programme_sites").select("id,sampling_status").eq("programme_id", programmeId).eq("owner_id", user.id),
    supabase.from("internal_audit_programme_audit_sites").select("site_id").eq("programme_id", programmeId).eq("owner_id", user.id),
  ]);
  if (!riskCount || !auditCount || !clauseCount) throw new Error("Record FMEA risks, planned audits and clause coverage before approval.");
  if (!(sites || []).length) throw new Error("Register the programme sites and central functions before approval.");
  const scheduledSiteIds = new Set((auditSites || []).map((row) => row.site_id));
  const uncovered = (sites || []).filter((site) => ["in_scope", "sampled"].includes(site.sampling_status) && !scheduledSiteIds.has(site.id));
  if (uncovered.length) throw new Error("Every in-scope or sampled location must be allocated to at least one planned audit.");
  const now = new Date().toISOString();
  const { error } = await supabase.from("internal_audit_programmes").update({ status: "active", approved_at: now, updated_at: now })
    .eq("id", programmeId).eq("owner_id", user.id);
  if (error) throw new Error(error.message);
  await supabase.from("internal_audit_programme_events").insert({ owner_id: user.id, programme_id: programmeId, event_type: "programme_approved", summary: "Three-year programme approved by lead auditor", created_by: user.id });
  revalidatePath("/portal/internal-audit-programme");
  redirect(`/portal/internal-audit-programme?programme=${programmeId}&approved=1`);
}
