"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "../../../../lib/supabase/server";

const clean = (value) =>
  typeof value === "string" && value.trim() ? value.trim() : null;

async function context(caseId) {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    redirect(`/portal/login?next=/portal/internal-audits/${caseId}`);
  }

  const { data: audit, error: auditError } = await supabase
    .from("internal_audits")
    .select("id, current_gate, scope_approved, plan_approved")
    .eq("id", caseId)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (auditError || !audit) throw new Error("Internal audit not found.");
  return { supabase, user, audit };
}

function returnTo(auditId, gate, saved = "1") {
  revalidatePath(`/portal/internal-audits/${auditId}`);
  revalidatePath("/portal/internal-audits");
  redirect(`/portal/internal-audits/${auditId}?gate=${gate}&saved=${saved}`);
}

export async function saveAuditScope(formData) {
  const auditId = clean(formData.get("audit_id"));
  const intent = clean(formData.get("intent")) ?? "save";
  if (!auditId) throw new Error("Missing audit ID.");

  const { supabase, user } = await context(auditId);
  const purpose = clean(formData.get("purpose"));
  const scopeStatement = clean(formData.get("scope_statement"));
  const objectives = clean(formData.get("objectives"));
  const criteriaSummary = clean(formData.get("criteria_summary"));

  if (intent === "approve" && (!purpose || !scopeStatement || !objectives || !criteriaSummary)) {
    throw new Error("Purpose, objectives, scope and criteria are required before scope approval.");
  }

  const approved = intent === "approve";
  const { error } = await supabase
    .from("internal_audits")
    .update({
      purpose,
      objectives,
      scope_statement: scopeStatement,
      scope_boundaries: clean(formData.get("scope_boundaries")),
      exclusions: clean(formData.get("exclusions")),
      exclusion_justification: clean(formData.get("exclusion_justification")),
      criteria_summary: criteriaSummary,
      sites: clean(formData.get("sites")),
      departments: clean(formData.get("departments")),
      processes: clean(formData.get("processes")),
      products_services: clean(formData.get("products_services")),
      legal_customer_contractual_criteria: clean(formData.get("legal_customer_contractual_criteria")),
      confidentiality_requirements: clean(formData.get("confidentiality_requirements")),
      known_risks_changes: clean(formData.get("known_risks_changes")),
      previous_audit_summary: clean(formData.get("previous_audit_summary")),
      feasibility_confirmed: formData.get("feasibility_confirmed") === "on",
      scope_approved: approved,
      current_gate: approved ? "team" : "scope",
      status: approved ? "team_assignment" : "scope_review",
      updated_at: new Date().toISOString(),
    })
    .eq("id", auditId)
    .eq("owner_id", user.id);

  if (error) throw new Error(error.message);

  await supabase.from("internal_audit_events").insert({
    owner_id: user.id,
    audit_id: auditId,
    event_type: approved ? "scope_approved" : "scope_updated",
    summary: approved ? "Audit scope approved" : "Audit scope updated",
    event_data: { gate: approved ? "team" : "scope" },
    created_by: user.id,
  });

  returnTo(auditId, approved ? "team" : "scope");
}

export async function addAuditTeamMember(formData) {
  const auditId = clean(formData.get("audit_id"));
  const memberName = clean(formData.get("member_name"));
  const email = clean(formData.get("email"));
  if (!auditId || !memberName || !email) {
    throw new Error("Team member name and email are required.");
  }

  const { supabase, user, audit } = await context(auditId);
  if (!audit.scope_approved) throw new Error("Approve the audit scope before assigning the audit team.");

  const auditRole = clean(formData.get("audit_role")) ?? "auditor";
  const allowedRoles = ["lead_auditor", "auditor", "technical_expert", "observer", "trainee", "independent_reviewer"];
  if (!allowedRoles.includes(auditRole)) throw new Error("Invalid audit role.");

  const { error } = await supabase.from("internal_audit_team_members").insert({
    owner_id: user.id,
    audit_id: auditId,
    member_name: memberName,
    email,
    audit_role: auditRole,
    standards_competence: clean(formData.get("standards_competence")),
    sector_competence: clean(formData.get("sector_competence")),
    technical_competence: clean(formData.get("technical_competence")),
    assigned_scope: clean(formData.get("assigned_scope")),
    competence_confirmed: formData.get("competence_confirmed") === "on",
    independence_confirmed: formData.get("independence_confirmed") === "on",
    confidentiality_confirmed: formData.get("confidentiality_confirmed") === "on",
  });

  if (error) throw new Error(error.message);
  returnTo(auditId, "team");
}

export async function approveAuditTeam(formData) {
  const auditId = clean(formData.get("audit_id"));
  if (!auditId) throw new Error("Missing audit ID.");
  const { supabase, user, audit } = await context(auditId);
  if (!audit.scope_approved) throw new Error("The scope must be approved first.");

  const { data: team, error: teamError } = await supabase
    .from("internal_audit_team_members")
    .select("id, audit_role, competence_confirmed, independence_confirmed, confidentiality_confirmed")
    .eq("audit_id", auditId)
    .eq("owner_id", user.id);

  if (teamError) throw new Error(teamError.message);
  if (!team?.some((member) => member.audit_role === "lead_auditor")) {
    throw new Error("Assign a lead auditor before approving the team.");
  }
  if (team.some((member) => !member.competence_confirmed || !member.independence_confirmed || !member.confidentiality_confirmed)) {
    throw new Error("Confirm competence, independence and confidentiality for every team member.");
  }

  const { error } = await supabase.from("internal_audits").update({
    current_gate: "plan",
    status: "plan_review",
    updated_at: new Date().toISOString(),
  }).eq("id", auditId).eq("owner_id", user.id);

  if (error) throw new Error(error.message);
  await supabase.from("internal_audit_events").insert({
    owner_id: user.id,
    audit_id: auditId,
    event_type: "team_approved",
    summary: "Audit team approved",
    event_data: { member_count: team.length },
    created_by: user.id,
  });

  returnTo(auditId, "plan");
}
