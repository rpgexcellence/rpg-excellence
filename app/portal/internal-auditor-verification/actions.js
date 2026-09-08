"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "../../../lib/supabase/server";
import { AUDITOR_ASSESSMENT_CRITERIA, calculateAuditorAssessment } from "./assessmentModel";

const clean = (value) => typeof value === "string" && value.trim() ? value.trim() : null;
const validEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value || "");
const QUALIFICATION_TYPES = ["lead_auditor_certificate", "internal_auditor_certificate", "standard_specific_certificate", "professional_qualification", "experience_record", "witnessed_audit", "cpd_record", "other"];
const ALLOWED_EVIDENCE_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/msword"];

async function context() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/portal/login?next=/portal/internal-auditor-verification");
  return { supabase, user };
}

function reference(prefix) {
  return `${prefix}-${new Date().getUTCFullYear()}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
}

function quarterKey(date = new Date()) {
  return `${date.getUTCFullYear()}-Q${Math.floor(date.getUTCMonth() / 3) + 1}`;
}

export async function createAuditor(formData) {
  const { supabase, user } = await context();
  const organizationId = clean(formData.get("organization_id"));
  const fullName = clean(formData.get("full_name"));
  const email = clean(formData.get("email"));
  const standardIds = [...new Set(formData.getAll("standard_ids").filter(Boolean))];
  if (!organizationId || !fullName || !validEmail(email)) throw new Error("Organisation, auditor name and a valid email are required.");
  if (!standardIds.length) throw new Error("Select at least one standard competence scope.");

  const { data: auditor, error } = await supabase.from("internal_auditor_register").insert({
    owner_id: user.id, organization_id: organizationId, auditor_reference: reference("AUD"),
    full_name: fullName, email, employee_reference: clean(formData.get("employee_reference")),
    job_title: clean(formData.get("job_title")), sector_competence: clean(formData.get("sector_competence")),
    technical_competence: clean(formData.get("technical_competence")), audit_training: clean(formData.get("audit_training")),
    audit_experience: clean(formData.get("audit_experience")), verification_status: "pending",
  }).select("id").single();
  if (error) throw new Error(error.message);

  const { error: scopeError } = await supabase.from("internal_auditor_standard_authorisations").insert(
    standardIds.map((standardId) => ({ owner_id: user.id, auditor_id: auditor.id, standard_id: standardId, authorisation_status: "pending" }))
  );
  if (scopeError) throw new Error(scopeError.message);
  revalidatePath("/portal/internal-auditor-verification");
  redirect("/portal/internal-auditor-verification?saved=auditor");
}

export async function updateAuditorStatus(formData) {
  const { supabase, user } = await context();
  const auditorId = clean(formData.get("auditor_id"));
  const status = clean(formData.get("status"));
  if (!auditorId || !["pending", "suspended", "unverified"].includes(status)) throw new Error("Invalid auditor status change.");
  const { error } = await supabase.from("internal_auditor_register").update({ verification_status: status, active: status !== "suspended", updated_at: new Date().toISOString() }).eq("id", auditorId).eq("owner_id", user.id);
  if (error) throw new Error(error.message);
  revalidatePath("/portal/internal-auditor-verification");
}

export async function uploadAuditorQualification(formData) {
  const { supabase, user } = await context();
  const auditorId = clean(formData.get("auditor_id"));
  const evidenceType = clean(formData.get("evidence_type"));
  const title = clean(formData.get("title"));
  const file = formData.get("qualification_file");
  if (!auditorId || !title || !QUALIFICATION_TYPES.includes(evidenceType)) throw new Error("Select an auditor, evidence type and evidence title.");
  if (!file || typeof file.arrayBuffer !== "function" || !file.size) throw new Error("Attach the qualification evidence file.");
  if (file.size > 15 * 1024 * 1024) throw new Error("Qualification evidence must not exceed 15 MB.");
  if (!ALLOWED_EVIDENCE_TYPES.includes(file.type)) throw new Error("Upload a PDF, Word document, JPG, PNG or WebP file.");
  const { data: auditor, error: auditorError } = await supabase.from("internal_auditor_register").select("id").eq("id", auditorId).eq("owner_id", user.id).maybeSingle();
  if (auditorError || !auditor) throw new Error(auditorError?.message || "Auditor not found.");
  const safeName = String(file.name || "evidence").replace(/[^a-zA-Z0-9._-]/g, "_");
  const storagePath = `${user.id}/auditor-qualifications/${auditorId}/${crypto.randomUUID()}-${safeName}`;
  const uploaded = await supabase.storage.from("internal-audit-evidence").upload(storagePath, file, { contentType: file.type, upsert: false });
  if (uploaded.error) throw new Error(uploaded.error.message);
  const { error } = await supabase.from("internal_auditor_qualifications").insert({
    owner_id: user.id, auditor_id: auditorId, evidence_type: evidenceType, title,
    issuer: clean(formData.get("issuer")), certificate_number: clean(formData.get("certificate_number")),
    issue_date: clean(formData.get("issue_date")), expiry_date: clean(formData.get("expiry_date")),
    file_name: file.name, storage_path: storagePath, evidence_status: "submitted",
  });
  if (error) {
    await supabase.storage.from("internal-audit-evidence").remove([storagePath]);
    throw new Error(error.message);
  }
  revalidatePath("/portal/internal-auditor-verification");
  redirect("/portal/internal-auditor-verification?saved=qualification");
}

export async function approveInitialAuditor(formData) {
  const { supabase, user } = await context();
  const auditorId = clean(formData.get("auditor_id"));
  const approver = clean(formData.get("approver_name"));
  const rationale = clean(formData.get("approval_basis"));
  const validityMonths = Math.min(36, Math.max(1, Number(formData.get("validity_months")) || 12));
  if (!auditorId || !approver || !rationale || formData.get("approval_confirmation") !== "on") throw new Error("Select the auditor and complete the Lead Auditor approval, rationale and confirmation.");
  const [{ data: auditor, error: auditorError }, { data: qualifications, error: evidenceError }] = await Promise.all([
    supabase.from("internal_auditor_register").select("id, audit_training, audit_experience").eq("id", auditorId).eq("owner_id", user.id).maybeSingle(),
    supabase.from("internal_auditor_qualifications").select("id, evidence_type, expiry_date, evidence_status").eq("auditor_id", auditorId).eq("owner_id", user.id),
  ]);
  if (auditorError || evidenceError) throw new Error(auditorError?.message || evidenceError?.message);
  if (!auditor) throw new Error("Auditor not found.");
  if (!auditor.audit_training || !auditor.audit_experience) throw new Error("Record both audit training and audit experience before initial approval.");
  const today = new Date().toISOString().slice(0, 10);
  const currentEvidence = (qualifications || []).filter((item) => !item.expiry_date || item.expiry_date >= today);
  if (!currentEvidence.length) throw new Error("Upload at least one current certificate or other qualification-evidence record before initial approval.");
  const validUntil = new Date(); validUntil.setUTCMonth(validUntil.getUTCMonth() + validityMonths);
  const now = new Date().toISOString();
  const { error } = await supabase.from("internal_auditor_register").update({
    verification_status: "verified", active: true, verified_at: now, verified_until: validUntil.toISOString().slice(0, 10),
    verified_by_name: approver, approval_basis: rationale, approval_type: "initial_certification_and_experience",
    initially_approved_at: now, initially_approved_by: approver, updated_at: now,
  }).eq("id", auditorId).eq("owner_id", user.id);
  if (error) throw new Error(error.message);
  const { error: authorisationError } = await supabase.from("internal_auditor_standard_authorisations").update({ authorisation_status: "authorised", authorised_at: now, authorised_until: validUntil.toISOString().slice(0, 10) }).eq("auditor_id", auditorId).eq("owner_id", user.id);
  if (authorisationError) throw new Error(authorisationError.message);
  const { error: evidenceUpdateError } = await supabase.from("internal_auditor_qualifications").update({ evidence_status: "accepted", reviewed_by: approver, reviewed_at: now }).eq("auditor_id", auditorId).eq("owner_id", user.id).in("id", currentEvidence.map((item) => item.id));
  if (evidenceUpdateError) throw new Error(evidenceUpdateError.message);
  revalidatePath("/portal/internal-auditor-verification");
  redirect("/portal/internal-auditor-verification?saved=initial_approval");
}

export async function createQuarterlySelection(formData) {
  const { supabase, user } = await context();
  const organizationId = clean(formData.get("organization_id"));
  if (!organizationId) throw new Error("Select an organisation.");
  const quarter = quarterKey();
  const existing = await supabase.from("internal_auditor_quarterly_selections").select("id").eq("owner_id", user.id).eq("organization_id", organizationId).eq("quarter_key", quarter).maybeSingle();
  if (existing.error) throw new Error(existing.error.message);
  if (existing.data) redirect(`/portal/internal-auditor-verification?quarter=${quarter}`);

  const [{ data: auditors, error: auditorError }, { data: audits, error: auditError }] = await Promise.all([
    supabase.from("internal_auditor_register").select("id, full_name, verification_status, verified_until").eq("owner_id", user.id).eq("organization_id", organizationId).eq("active", true),
    supabase.from("internal_audits").select("id, title, planned_end_at, internal_audit_team_members(auditor_register_id)").eq("owner_id", user.id).eq("organization_id", organizationId).in("status", ["report_approved", "capa_monitoring", "effectiveness_review", "closed"]).order("planned_end_at", { ascending: false }).limit(50),
  ]);
  if (auditorError || auditError) throw new Error(auditorError?.message || auditError?.message);
  if (!auditors?.length) throw new Error("Add at least one active auditor before creating the quarterly selection.");

  const prior = await supabase.from("internal_auditor_quarterly_selections").select("auditor_id").eq("owner_id", user.id).eq("organization_id", organizationId).order("selected_at", { ascending: false }).limit(Math.max(1, auditors.length - 1));
  if (prior.error) throw new Error(prior.error.message);
  const recent = new Set((prior.data || []).map((row) => row.auditor_id));
  const pool = auditors.filter((auditor) => !recent.has(auditor.id));
  const candidates = pool.length ? pool : auditors;
  const priority = candidates.filter((auditor) => auditor.verification_status !== "verified" || !auditor.verified_until || auditor.verified_until <= new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10));
  const selectionPool = priority.length ? priority : candidates;
  const selected = selectionPool[Math.floor(Math.random() * selectionPool.length)];
  const sampledAudit = (audits || []).find((audit) => audit.internal_audit_team_members?.some((member) => member.auditor_register_id === selected.id)) || null;
  const due = new Date(); due.setUTCDate(due.getUTCDate() + 30);
  const { error } = await supabase.from("internal_auditor_quarterly_selections").insert({
    owner_id: user.id, organization_id: organizationId, auditor_id: selected.id, sampled_audit_id: sampledAudit?.id || null,
    quarter_key: quarter, due_date: due.toISOString().slice(0, 10), status: "notified",
    selection_reason: priority.includes(selected) ? "Risk-prioritised quarterly selection: verification is absent or due within 90 days." : "Quarterly rotational random selection from auditors not recently sampled.",
  });
  if (error) throw new Error(error.message);
  revalidatePath("/portal/internal-auditor-verification");
  redirect(`/portal/internal-auditor-verification?selected=${selected.id}`);
}

export async function saveVerificationAssessment(formData) {
  const { supabase, user } = await context();
  const auditorId = clean(formData.get("auditor_id"));
  const organizationId = clean(formData.get("organization_id"));
  const sampledAuditId = clean(formData.get("sampled_audit_id"));
  const assessorName = clean(formData.get("assessor_name"));
  const evidence = clean(formData.get("evidence_reviewed"));
  const conclusion = clean(formData.get("assessor_conclusion"));
  const selectionType = clean(formData.get("selection_type")) || "manual";
  const validityMonths = Math.min(36, Math.max(1, Number(formData.get("validity_months")) || 12));
  if (!auditorId || !organizationId || !assessorName || !evidence || !conclusion || formData.get("lead_confirmation") !== "on") throw new Error("Complete the auditor, assessor, evidence, conclusion and lead-auditor confirmation.");

  let total = 0; let maximum = 0; let criticalZeros = 0;
  const results = AUDITOR_ASSESSMENT_CRITERIA.map((criterion) => {
    const raw = clean(formData.get(`score_${criterion.number}`));
    const notes = clean(formData.get(`notes_${criterion.number}`));
    if (!raw || !["0", "1", "2", "na"].includes(raw)) throw new Error(`Score criterion ${criterion.number}.`);
    if (!notes) throw new Error(`Record objective evidence and assessor rationale for criterion ${criterion.number}.`);
    if (raw === "na") {
      return { ...criterion, score: "na", notes };
    }
    const score = Number(raw); total += score * criterion.weight; maximum += 2 * criterion.weight;
    if (criterion.critical && score === 0) criticalZeros += 1;
    return { ...criterion, score, notes };
  });
  const percentage = maximum ? Number(((total / maximum) * 100).toFixed(2)) : 0;
  const requestedOutcome = clean(formData.get("outcome"));
  const calculatedOutcome = percentage >= 50 && criticalZeros === 0 ? "verified" : percentage >= 50 ? "conditional" : "not_verified";
  const automated = calculateAuditorAssessment(Object.fromEntries(results.map((item) => [item.number, item.score])));
  if (requestedOutcome !== calculatedOutcome) throw new Error(`The controlled result is ${calculatedOutcome.replace("_", " ")} (${percentage}%, ${criticalZeros} critical zero(s)). Refresh and confirm that outcome.`);
  const assessmentDate = new Date().toISOString().slice(0, 10);
  const validUntil = new Date(); validUntil.setUTCMonth(validUntil.getUTCMonth() + validityMonths);
  const { data: assessment, error } = await supabase.from("internal_auditor_verification_assessments").insert({
    owner_id: user.id, organization_id: organizationId, auditor_id: auditorId, sampled_audit_id: sampledAuditId,
    assessment_reference: reference("IAVA"), selection_type: selectionType, quarter_key: selectionType === "quarterly_random" ? quarterKey() : null,
    assessor_name: assessorName, assessment_date: assessmentDate, criteria_results: results, weighted_score: total,
    maximum_score: maximum, percentage_score: percentage, critical_zero_count: criticalZeros,
    evidence_reviewed: evidence, assessor_conclusion: `${conclusion}\n\nAutomated score explanation:\n${automated.explanation}`, coaching_actions: clean(formData.get("coaching_actions")),
    outcome: calculatedOutcome, validity_months: validityMonths, confirmed_by_lead_auditor: true, confirmed_at: new Date().toISOString(),
  }).select("id").single();
  if (error) throw new Error(error.message);

  const registerStatus = calculatedOutcome === "verified" ? "verified" : calculatedOutcome === "conditional" ? "conditional" : "unverified";
  const { error: updateError } = await supabase.from("internal_auditor_register").update({
    verification_status: registerStatus, verified_at: calculatedOutcome === "not_verified" ? null : new Date().toISOString(),
    verified_until: calculatedOutcome === "verified" ? validUntil.toISOString().slice(0, 10) : null,
    verified_by_name: assessorName, restrictions: calculatedOutcome === "conditional" ? clean(formData.get("coaching_actions")) : null,
    development_actions: clean(formData.get("coaching_actions")), updated_at: new Date().toISOString(),
  }).eq("id", auditorId).eq("owner_id", user.id);
  if (updateError) throw new Error(updateError.message);

  const authStatus = calculatedOutcome === "verified" ? "authorised" : calculatedOutcome === "conditional" ? "restricted" : "pending";
  await supabase.from("internal_auditor_standard_authorisations").update({ authorisation_status: authStatus, authorised_at: calculatedOutcome === "verified" ? new Date().toISOString() : null, authorised_until: calculatedOutcome === "verified" ? validUntil.toISOString().slice(0, 10) : null }).eq("auditor_id", auditorId).eq("owner_id", user.id);
  if (selectionType === "quarterly_random") await supabase.from("internal_auditor_quarterly_selections").update({ status: "completed", completed_assessment_id: assessment.id }).eq("owner_id", user.id).eq("auditor_id", auditorId).eq("quarter_key", quarterKey());
  revalidatePath("/portal/internal-auditor-verification");
  redirect(`/portal/internal-auditor-verification?saved=assessment&assessment=${assessment.id}`);
}
