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
  return data;
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
  const standardIds = [...new Set(formData.getAll("standard_ids").map(clean).filter(Boolean))];
  if (!organizationId || !title || !cycleStart || !leadAuditorName || !objectives) {
    throw new Error("Organisation, title, cycle start, lead auditor and objectives are required.");
  }
  if (standardIds.length !== 5) throw new Error("Select the five controlled programme standards.");
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
  if ((standards || []).length !== 5) throw new Error("One or more programme standards are unavailable.");
  const { data: programme, error } = await supabase.from("internal_audit_programmes").insert({
    owner_id: user.id, organization_id: organizationId, programme_reference: programmeReference(),
    title, cycle_start: cycleStart, cycle_end: end.toISOString().slice(0, 10),
    lead_auditor_name: leadAuditorName, lead_auditor_email: leadAuditorEmail,
    objectives, context_and_change: clean(formData.get("context_and_change")), status: "draft",
  }).select("id").single();
  if (error || !programme) throw new Error(error?.message || "Unable to create the programme.");
  const { error: linkError } = await supabase.from("internal_audit_programme_standards").insert(
    standardIds.map((standardId) => ({ owner_id: user.id, programme_id: programme.id, standard_id: standardId }))
  );
  if (linkError) throw new Error(linkError.message);
  await supabase.from("internal_audit_programme_events").insert({
    owner_id: user.id, programme_id: programme.id, event_type: "programme_created",
    summary: "Three-year internal audit programme created", created_by: user.id,
    event_data: { standards: standards || [], cycle_start: cycleStart, cycle_end: end.toISOString().slice(0, 10) },
  });
  revalidatePath("/portal/internal-audit-programme");
  redirect(`/portal/internal-audit-programme?programme=${programme.id}&created=1`);
}

export async function addFmeaRisk(formData) {
  const { supabase, user } = await context();
  const programmeId = clean(formData.get("programme_id"));
  await ownedProgramme(supabase, user.id, programmeId);
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
  const { data: plannedAudit, error } = await supabase.from("internal_audit_programme_audits").insert({
    owner_id: user.id, programme_id: programmeId, risk_id: riskId,
    title, process_area: processArea, site_or_function: clean(formData.get("site_or_function")),
    planned_start: plannedStart, planned_end: plannedEnd, year_no: yearNo,
    audit_method: clean(formData.get("audit_method")) || "onsite",
    priority: clean(formData.get("priority")) || "medium", status: "planned",
    lead_auditor_name: clean(formData.get("lead_auditor_name")) || programme.lead_auditor_name,
    rationale, estimated_days: Number(formData.get("estimated_days")) || 1,
  }).select("id").single();
  if (error || !plannedAudit) throw new Error(error?.message || "Unable to add the planned audit.");
  const { error: clauseError } = await supabase.from("internal_audit_programme_audit_clauses").insert(
    parsedClauses.map((row) => ({ owner_id: user.id, programme_id: programmeId, programme_audit_id: plannedAudit.id, ...row }))
  );
  if (clauseError) throw new Error(clauseError.message);
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
  const [{ count: riskCount }, { count: auditCount }, { count: clauseCount }] = await Promise.all([
    supabase.from("internal_audit_programme_risks").select("id", { count: "exact", head: true }).eq("programme_id", programmeId).eq("owner_id", user.id),
    supabase.from("internal_audit_programme_audits").select("id", { count: "exact", head: true }).eq("programme_id", programmeId).eq("owner_id", user.id),
    supabase.from("internal_audit_programme_audit_clauses").select("id", { count: "exact", head: true }).eq("programme_id", programmeId).eq("owner_id", user.id),
  ]);
  if (!riskCount || !auditCount || !clauseCount) throw new Error("Record FMEA risks, planned audits and clause coverage before approval.");
  const now = new Date().toISOString();
  const { error } = await supabase.from("internal_audit_programmes").update({ status: "active", approved_at: now, updated_at: now })
    .eq("id", programmeId).eq("owner_id", user.id);
  if (error) throw new Error(error.message);
  await supabase.from("internal_audit_programme_events").insert({ owner_id: user.id, programme_id: programmeId, event_type: "programme_approved", summary: "Three-year programme approved by lead auditor", created_by: user.id });
  revalidatePath("/portal/internal-audit-programme");
  redirect(`/portal/internal-audit-programme?programme=${programmeId}&approved=1`);
}
