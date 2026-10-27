"use server";

// RPG INTERNAL AUDIT PLAN GATE — NO SAMPLING APPROVAL DEPENDENCY — 2026-08-24

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createHash, randomBytes, randomUUID } from "node:crypto";

import { createClient } from "../../../../lib/supabase/server";
import { createAdminClient } from "../../../../lib/supabase/admin";
import { buildAuditFieldworkScope, buildAuditFieldworkCoverage, readCompleteAuditRows, auditClauseMatches, parseAuditClauseScope } from "../../../../lib/nonconformity-reporting.mjs";
import { loadAdministrationLocations } from "../../../../lib/rcaCompanyLinks";

const clean = (value) =>
  typeof value === "string" && value.trim()
    ? value.trim()
    : null;

const AUDIT_EVIDENCE_BUCKET = "internal-audit-evidence";
const MAX_FINDING_EVIDENCE_BYTES = 10 * 1024 * 1024;
const ALLOWED_FINDING_EVIDENCE_TYPES = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "text/plain",
  "text/csv",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

function safeEvidenceFileName(name) {
  return String(name || "evidence")
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 120) || "evidence";
}

async function context(caseId) {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect(
      `/portal/login?next=/portal/internal-audits/${caseId}`
    );
  }

  const {
    data: audit,
    error: auditError,
  } = await supabase
    .from("internal_audits")
    .select(
      "id, audit_reference, organization_id, supplier_id, audit_type, administration_location_id, administration_location_label, title, current_gate, status, scope_approved, plan_approved, planned_start_at, planned_end_at, auditee_contact_name, auditee_contact_email, scope_statement, sites, processes, exclusion_justification"
    )
    .eq("id", caseId)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (auditError || !audit) {
    throw new Error(
      "Internal audit not found."
    );
  }

  return {
    supabase,
    user,
    audit,
  };
}

function returnTo(
  auditId,
  gate,
  saved = "1"
) {
  revalidatePath(
    `/portal/internal-audits/${auditId}`
  );

  revalidatePath(
    "/portal/internal-audits"
  );

  redirect(
    `/portal/internal-audits/${auditId}?gate=${gate}&saved=${saved}`
  );
}

function returnTeamWarning(auditId, warning) {
  revalidatePath(`/portal/internal-audits/${auditId}`);
  redirect(`/portal/internal-audits/${auditId}?gate=team&team_warning=${warning}`);
}

export async function saveAuditScope(
  formData
) {
  const auditId = clean(
    formData.get("audit_id")
  );

  const intent =
    clean(formData.get("intent")) ??
    "save";

  if (!auditId) {
    throw new Error(
      "Missing audit ID."
    );
  }

  const {
    supabase,
    user,
    audit,
  } = await context(auditId);

  const administrationLocationId = clean(formData.get("administration_location_id"));
  const { data: organization, error: organizationError } = await supabase.from("organizations")
    .select("id,name,address_line_1,address_line_2,city,region,postal_code,country,business_site_mode,business_additional_sites")
    .eq("id", audit.organization_id).eq("owner_id", user.id).maybeSingle();
  if (organizationError || !organization) throw new Error("The linked organisation is unavailable.");
  const administrationLocations = await loadAdministrationLocations(organization);
  const administrationLocation = administrationLocations
    .find((item) => item.id === administrationLocationId);
  if (!administrationLocation?.label) {
    throw new Error("Select a current site from Administration → Site Profile.");
  }

  const purpose = clean(
    formData.get("purpose")
  );

  const scopeStatement = clean(
    formData.get("scope_statement")
  );

  const objectives = clean(
    formData.get("objectives")
  );

  const criteriaSummary = clean(
    formData.get("criteria_summary")
  );

  if (
    intent === "approve" &&
    (
      !purpose ||
      !scopeStatement ||
      !objectives ||
      !criteriaSummary
    )
  ) {
    throw new Error(
      "Purpose, objectives, scope and criteria are required before scope approval."
    );
  }

  const approved =
    intent === "approve";

  const { error } = await supabase
    .from("internal_audits")
    .update({
      purpose,
      objectives,

      scope_statement:
        scopeStatement,

      scope_boundaries:
        clean(
          formData.get(
            "scope_boundaries"
          )
        ),

      exclusions:
        clean(
          formData.get(
            "exclusions"
          )
        ),

      exclusion_justification:
        clean(
          formData.get(
            "exclusion_justification"
          )
        ),

      criteria_summary:
        criteriaSummary,

      administration_location_id: administrationLocation.id,
      administration_location_label: administrationLocation.label,
      sites: administrationLocation.label,

      departments:
        clean(
          formData.get(
            "departments"
          )
        ),

      processes:
        clean(
          formData.get(
            "processes"
          )
        ),

      products_services:
        clean(
          formData.get(
            "products_services"
          )
        ),

      legal_customer_contractual_criteria:
        clean(
          formData.get(
            "legal_customer_contractual_criteria"
          )
        ),

      confidentiality_requirements:
        clean(
          formData.get(
            "confidentiality_requirements"
          )
        ),

      known_risks_changes:
        clean(
          formData.get(
            "known_risks_changes"
          )
        ),

      previous_audit_summary:
        clean(
          formData.get(
            "previous_audit_summary"
          )
        ),

      feasibility_confirmed:
        formData.get(
          "feasibility_confirmed"
        ) === "on",

      scope_approved:
        approved,

      current_gate:
        approved
          ? "team"
          : "scope",

      status:
        approved
          ? "team_assignment"
          : "scope_review",

      updated_at:
        new Date().toISOString(),
    })
    .eq("id", auditId)
    .eq("owner_id", user.id);

  if (error) {
    throw new Error(
      error.message
    );
  }

  await supabase
    .from("internal_audit_events")
    .insert({
      owner_id:
        user.id,

      audit_id:
        auditId,

      event_type:
        approved
          ? "scope_approved"
          : "scope_updated",

      summary:
        approved
          ? "Audit scope approved"
          : "Audit scope updated",

      event_data: {
        gate:
          approved
            ? "team"
            : "scope",
      },

      created_by:
        user.id,
    });

  returnTo(
    auditId,
    approved
      ? "team"
      : "scope"
  );
}

export async function addAuditTeamMember(
  formData
) {
  const auditId = clean(
    formData.get("audit_id")
  );

  const auditorRegisterId = clean(formData.get("auditor_register_id"));
  const assignedStandardIds = [...new Set(formData.getAll("assigned_standard_ids").map(clean).filter(Boolean))];

  if (
    !auditId ||
    !auditorRegisterId
  ) {
    throw new Error(
      "Select a verified internal auditor."
    );
  }

  const {
    supabase,
    user,
    audit,
  } = await context(auditId);

  if (!audit.scope_approved) {
    throw new Error(
      "Approve the audit scope before assigning the audit team."
    );
  }

  const today = new Date().toISOString().slice(0, 10);
  const [{ data: controlledAuditor, error: auditorError }, { data: selectedStandards, error: standardsError }] = await Promise.all([
    supabase.from("internal_auditor_register").select("id, full_name, email, verification_status, verified_until, active, standards_competence:internal_auditor_standard_authorisations(standard_id, authorisation_status, authorised_until)").eq("id", auditorRegisterId).eq("owner_id", user.id).eq("organization_id", audit.organization_id).maybeSingle(),
    supabase.from("internal_audit_selected_standards").select("standard_id").eq("audit_id", auditId).eq("owner_id", user.id),
  ]);
  if (auditorError || standardsError) throw new Error(auditorError?.message || standardsError?.message);
  if (!controlledAuditor || !controlledAuditor.active || controlledAuditor.verification_status !== "verified" || !controlledAuditor.verified_until || controlledAuditor.verified_until < today) {
    throw new Error("This person is not currently verified and confirmed for audit assignment.");
  }
  const authorised = new Set((controlledAuditor.standards_competence || []).filter((item) => item.authorisation_status === "authorised" && (!item.authorised_until || item.authorised_until >= today)).map((item) => item.standard_id));
  const auditStandardIds = new Set((selectedStandards || []).map((item) => item.standard_id));
  if (!assignedStandardIds.length) throw new Error("Assign at least one audit standard to this auditor.");
  if (assignedStandardIds.some((standardId) => !auditStandardIds.has(standardId))) throw new Error("An assigned standard is not part of this audit.");
  if (assignedStandardIds.some((standardId) => !authorised.has(standardId))) throw new Error("The auditor is not currently authorised for one or more assigned standards. Select only standards within their verified competence scope.");
  const memberName = controlledAuditor.full_name;
  const email = controlledAuditor.email;

  const auditRole =
    clean(
      formData.get(
        "audit_role"
      )
    ) ?? "auditor";

  const allowedRoles = [
    "lead_auditor",
    "auditor",
    "technical_expert",
    "observer",
    "trainee",
    "independent_reviewer",
  ];

  if (
    !allowedRoles.includes(
      auditRole
    )
  ) {
    throw new Error(
      "Invalid audit role."
    );
  }

  const { error } = await supabase
    .from(
      "internal_audit_team_members"
    )
    .insert({
      owner_id:
        user.id,

      audit_id:
        auditId,

      auditor_register_id:
        auditorRegisterId,

      assigned_standard_ids:
        assignedStandardIds,

      member_name:
        memberName,

      email,

      audit_role:
        auditRole,

      assigned_scope:
        clean(
          formData.get(
            "assigned_scope"
          )
        ),

      competence_confirmed: true,

      independence_confirmed:
        formData.get(
          "independence_confirmed"
        ) === "on",

      confidentiality_confirmed:
        formData.get(
          "confidentiality_confirmed"
        ) === "on",
    });

  if (error) {
    throw new Error(
      error.message
    );
  }

  returnTo(
    auditId,
    "team"
  );
}

export async function approveAuditTeam(
  formData
) {
  const auditId = clean(
    formData.get("audit_id")
  );

  if (!auditId) {
    throw new Error(
      "Missing audit ID."
    );
  }

  const {
    supabase,
    user,
    audit,
  } = await context(auditId);

  if (!audit.scope_approved) {
    throw new Error(
      "The scope must be approved first."
    );
  }

  const {
    data: team,
    error: teamError,
  } = await supabase
    .from(
      "internal_audit_team_members"
    )
    .select(
      "id, audit_role, assigned_standard_ids, competence_confirmed, independence_confirmed, confidentiality_confirmed"
    )
    .eq("audit_id", auditId)
    .eq("owner_id", user.id);

  if (teamError) {
    throw new Error(
      teamError.message
    );
  }

  if (
    !team?.some(
      (member) =>
        member.audit_role ===
        "lead_auditor"
    )
  ) {
    returnTeamWarning(auditId, "lead_required");
  }

  if (
    team.some(
      (member) =>
        !member.competence_confirmed ||
        !member.independence_confirmed ||
        !member.confidentiality_confirmed
    )
  ) {
    returnTeamWarning(auditId, "governance_required");
  }

  const { data: selectedStandards, error: standardsError } = await supabase
    .from("internal_audit_selected_standards")
    .select("standard_id")
    .eq("audit_id", auditId)
    .eq("owner_id", user.id);
  if (standardsError) throw new Error(standardsError.message);
  const coveredStandards = new Set(team.flatMap((member) => member.assigned_standard_ids || []));
  if ((selectedStandards || []).some((item) => !coveredStandards.has(item.standard_id))) {
    returnTeamWarning(auditId, "standards_coverage");
  }

  const { error } = await supabase
    .from("internal_audits")
    .update({
      current_gate:
        "plan",

      status:
        "plan_review",

      updated_at:
        new Date().toISOString(),
    })
    .eq("id", auditId)
    .eq("owner_id", user.id);

  if (error) {
    throw new Error(
      error.message
    );
  }

  await supabase
    .from("internal_audit_events")
    .insert({
      owner_id:
        user.id,

      audit_id:
        auditId,

      event_type:
        "team_approved",

      summary:
        "Audit team approved",

      event_data: {
        member_count:
          team.length,
      },

      created_by:
        user.id,
    });

  returnTo(
    auditId,
    "plan"
  );
}

function emails(value) {
  return (
    clean(value) ?? ""
  )
    .split(/[;,\n]/)
    .map(
      (item) =>
        item.trim()
    )
    .filter(Boolean);
}

export async function addAuditScheduleItem(
  formData
) {
  const auditId = clean(
    formData.get("audit_id")
  );

  if (!auditId) {
    throw new Error(
      "Missing audit ID."
    );
  }

  const {
    supabase,
    user,
    audit,
  } = await context(auditId);

  if (
    !audit.scope_approved ||
    audit.current_gate ===
      "team"
  ) {
    throw new Error(
      "Approve the scope and audit team before building the agenda."
    );
  }

  const startsAt = clean(
    formData.get("starts_at")
  );

  const endsAt = clean(
    formData.get("ends_at")
  );

  const activityType = clean(
    formData.get(
      "activity_type"
    )
  );

  const title = clean(
    formData.get("title")
  );

  const processOrScope = clean(
    formData.get(
      "process_or_scope"
    )
  );

  const allowedTypes = [
    "opening_meeting",
    "interview",
    "process_audit",
    "site_walk",
    "document_review",
    "sample_review",
    "team_review",
    "break",
    "closing_meeting",
    "other",
  ];

  if (
    !startsAt ||
    !endsAt ||
    !activityType ||
    !title ||
    !processOrScope ||
    !allowedTypes.includes(
      activityType
    )
  ) {
    throw new Error(
      "A valid activity, title, scope, start and end are required."
    );
  }

  const startDate =
    new Date(startsAt);

  const endDate =
    new Date(endsAt);

  if (
    endDate <= startDate
  ) {
    throw new Error(
      "Agenda activity end must be after its start."
    );
  }

  if (
    (
      audit.planned_start_at &&
      startDate <
        new Date(
          audit.planned_start_at
        )
    ) ||
    (
      audit.planned_end_at &&
      endDate >
        new Date(
          audit.planned_end_at
        )
    )
  ) {
    throw new Error(
      "Agenda activity must remain within the approved audit window."
    );
  }

  const memberId = clean(
    formData.get(
      "lead_team_member_id"
    )
  );

  if (memberId) {
    const {
      data: member,
    } = await supabase
      .from(
        "internal_audit_team_members"
      )
      .select("id")
      .eq("id", memberId)
      .eq("audit_id", auditId)
      .eq("owner_id", user.id)
      .maybeSingle();

    if (!member) {
      throw new Error(
        "The selected lead auditor is not assigned to this audit."
      );
    }
  }

  const { error } = await supabase
    .from(
      "internal_audit_schedule_items"
    )
    .insert({
      owner_id:
        user.id,

      audit_id:
        auditId,

      starts_at:
        startDate.toISOString(),

      ends_at:
        endDate.toISOString(),

      activity_type:
        activityType,

      title,

      location_or_link:
        clean(
          formData.get(
            "location_or_link"
          )
        ),

      process_or_scope:
        processOrScope,

      lead_team_member_id:
        memberId,

      expected_attendees:
        clean(
          formData.get(
            "expected_attendees"
          )
        ),

      notes:
        clean(
          formData.get("notes")
        ),
    });

  if (error) {
    throw new Error(
      error.message
    );
  }

  returnTo(
    auditId,
    "plan"
  );
}

export async function saveAuditNotification(
  formData
) {
  const auditId = clean(
    formData.get("audit_id")
  );

  if (!auditId) {
    throw new Error(
      "Missing audit ID."
    );
  }

  const {
    supabase,
    user,
    audit,
  } = await context(auditId);

  if (
    !audit.scope_approved ||
    audit.current_gate ===
      "team"
  ) {
    throw new Error(
      "Approve the scope and audit team before preparing notification."
    );
  }

  const recipients = emails(
    formData.get("recipients")
  );

  const ccRecipients = emails(
    formData.get(
      "cc_recipients"
    )
  );

  const subject = clean(
    formData.get("subject")
  );

  const body = clean(
    formData.get(
      "requested_information"
    )
  );

  if (
    !recipients.length ||
    !subject ||
    !body
  ) {
    throw new Error(
      "Recipient, subject and requested information are required."
    );
  }

  const {
    data: existing,
    error: existingError,
  } = await supabase
    .from(
      "internal_audit_notifications"
    )
    .select("id")
    .eq("audit_id", auditId)
    .eq("owner_id", user.id)
    .eq(
      "notification_type",
      "audit_notification"
    )
    .order("updated_at", {
      ascending: false,
    })
    .limit(1)
    .maybeSingle();

  if (existingError) {
    throw new Error(
      existingError.message
    );
  }

  const payload = {
    recipients,

    cc_recipients:
      ccRecipients,

    subject,

    body,

    status:
      "draft",

    updated_at:
      new Date().toISOString(),
  };

  const result = existing
    ? await supabase
        .from(
          "internal_audit_notifications"
        )
        .update(payload)
        .eq("id", existing.id)
        .eq("owner_id", user.id)
    : await supabase
        .from(
          "internal_audit_notifications"
        )
        .insert({
          owner_id:
            user.id,

          audit_id:
            auditId,

          notification_type:
            "audit_notification",

          ...payload,
        });

  if (result.error) {
    throw new Error(
      result.error.message
    );
  }

  revalidatePath(
    `/portal/internal-audits/${auditId}`
  );

  revalidatePath(
    "/portal/internal-audits"
  );

  redirect(
    `/portal/internal-audits/${auditId}?gate=plan&saved=notification#notification-draft`
  );
}

export async function approveAuditPlan(
  formData
) {
  const auditId = clean(
    formData.get("audit_id")
  );

  if (!auditId) {
    throw new Error(
      "Missing audit ID."
    );
  }

  if (
    formData.get(
      "plan_confirmation"
    ) !== "on"
  ) {
    throw new Error(
      "Human plan confirmation is required."
    );
  }

  const {
    supabase,
    user,
    audit,
  } = await context(auditId);

  if (
    !audit.scope_approved ||
    audit.current_gate ===
      "team"
  ) {
    throw new Error(
      "Scope and team approval are required first."
    );
  }

  const { data: selectedStandards, error: selectedStandardsError } = await supabase
    .from("internal_audit_selected_standards")
    .select("standard_id, full_or_partial, internal_audit_standard_catalogue(standard_code)")
    .eq("audit_id", auditId)
    .eq("owner_id", user.id);

  if (selectedStandardsError) {
    throw new Error(selectedStandardsError.message);
  }

  const selectedStandardIds = (selectedStandards ?? []).map((item) => item.standard_id).filter(Boolean);
  const [{ data: questionLinks, error: questionLinksError }, { data: selectedProcesses, error: selectedProcessesError }] = await Promise.all([
    selectedStandardIds.length ? supabase
        .from("internal_audit_question_scope_links")
        .select("question_id, standard_id, scope_key")
        .in("standard_id", selectedStandardIds) : Promise.resolve({ data: [], error: null }),
    supabase.from("internal_audit_selected_processes")
      .select("standard_id, scope_key")
      .eq("audit_id", auditId)
      .eq("owner_id", user.id),
  ]);

  if (questionLinksError) {
    throw new Error(questionLinksError.message);
  }
  if (selectedProcessesError) {
    throw new Error(selectedProcessesError.message);
  }

  const selectedProcessPairs = new Set((selectedProcesses ?? [])
    .map((item) => `${item.standard_id}:${item.scope_key}`));
  const scopedQuestionIds = [...new Set((questionLinks ?? [])
    .filter((link) => selectedProcessPairs.size === 0 || selectedProcessPairs.has(`${link.standard_id}:${link.scope_key}`))
    .map((link) => link.question_id)
    .filter(Boolean))];
  const questionCoverageResult = selectedStandardIds.length
    ? await supabase.from("internal_audit_questions")
        .select("id, standard_id")
        .in("standard_id", selectedStandardIds)
        .eq("active", true)
    : { data: [], error: null };

  const questionCoverage = {
    error: questionCoverageResult.error,
    count: (questionCoverageResult.data ?? []).filter((question) =>
      scopedQuestionIds.includes(question.id)
    ).length,
  };

  if (questionCoverage.error) {
    throw new Error(questionCoverage.error.message);
  }

  const [
    schedule,
    notification,
  ] = await Promise.all([
    supabase
      .from(
        "internal_audit_schedule_items"
      )
      .select(
        "id",
        {
          count: "exact",
          head: true,
        }
      )
      .eq("audit_id", auditId)
      .eq("owner_id", user.id),

    supabase
      .from(
        "internal_audit_notifications"
      )
      .select(
        "id",
        {
          count: "exact",
          head: true,
        }
      )
      .eq("audit_id", auditId)
      .eq("owner_id", user.id)
      .eq(
        "notification_type",
        "audit_notification"
      ),
  ]);

  if (
    schedule.error ||
    notification.error
  ) {
    throw new Error(
      schedule.error?.message ||
      notification.error?.message
    );
  }

  if (
    (schedule.count ?? 0) < 2
  ) {
    redirect(
      `/portal/internal-audits/${auditId}?gate=plan&plan_error=agenda`
    );
  }

  if (
    (notification.count ?? 0) < 1
  ) {
    redirect(
      `/portal/internal-audits/${auditId}?gate=plan&plan_error=notification`
    );
  }

  if ((questionCoverage.count ?? 0) < 1) {
    redirect(
      `/portal/internal-audits/${auditId}?gate=plan&plan_error=questions`
    );
  }

  const now =
    new Date().toISOString();

  const { error } = await supabase
    .from("internal_audits")
    .update({
      plan_approved:
        true,

      current_gate:
        "fieldwork",

      status:
        "scheduled",

      updated_at:
        now,
    })
    .eq("id", auditId)
    .eq("owner_id", user.id);

  if (error) {
    throw new Error(
      error.message
    );
  }

  await supabase
    .from(
      "internal_audit_notifications"
    )
    .update({
      status:
        "approved",

      updated_at:
        now,
    })
    .eq("audit_id", auditId)
    .eq("owner_id", user.id)
    .eq(
      "notification_type",
      "audit_notification"
    );

  await supabase
    .from("internal_audit_events")
    .insert({
      owner_id:
        user.id,

      audit_id:
        auditId,

      event_type:
        "plan_approved",

      summary:
        "Audit plan approved; fieldwork unlocked",

      event_data: {
        schedule_item_count:
          schedule.count,
        question_count:
          questionCoverage.count,
      },

      created_by:
        user.id,
    });

  returnTo(
    auditId,
    "fieldwork"
  );
}

const ANSWER_RESULTS = [
  "not_assessed",
  "conformity",
  "major_nc",
  "minor_nc",
  "observation",
  "ofi",
  "positive_practice",
  "unable_to_verify",
  "not_applicable",
];

const RISK_LEVELS = [
  "low",
  "medium",
  "high",
  "critical",
];

const CONFIDENCE_LEVELS = [
  "low",
  "medium",
  "high",
];

// Reuse the controlled Assessment bank for guidance and clause references.
// No edition is inferred from a generic ISO number: exact catalogue labels or
// a catalogue edition value must resolve to one existing Assessment bank.
function auditReferenceBankNames(selection) {
  const relation=selection.internal_audit_standard_catalogue;
  const catalogue=Array.isArray(relation)?relation[0]:relation;
  const code=clean(catalogue?.standard_code),name=clean(catalogue?.display_name),edition=clean(catalogue?.edition_label);
  const names=[code,name];
  if(code&&edition&&/^\d{4}(?:\/.*)?$/.test(edition)&&!/:\d{4}/.test(code))names.push(`${code}:${edition}`);
  return [...new Set(names.filter(Boolean))];
}

async function loadAuditFieldworkState(supabase,user,audit,options={}) {
  const read=(factory,label,orderKeys)=>readCompleteAuditRows(factory,{label,orderKeys});
  const [selectedStandards,selectedProcesses]=await Promise.all([
    read(()=>supabase.from('internal_audit_selected_standards').select('*,internal_audit_standard_catalogue(*)').eq('audit_id',audit.id).eq('owner_id',user.id),'Selected audit standards'),
    read(()=>supabase.from('internal_audit_selected_processes').select('*').eq('audit_id',audit.id).eq('owner_id',user.id),'Selected audit processes'),
  ]);
  const standardIds=[...new Set(selectedStandards.map(row=>row.standard_id).filter(Boolean))];
  const bankNames=[...new Set(selectedStandards.flatMap(auditReferenceBankNames))];
  const [links,nativeQuestions,assessmentQuestions,answers,evidence,findings]=await Promise.all([
    standardIds.length?read(()=>supabase.from('internal_audit_question_scope_links').select('question_id,standard_id,scope_key,clause,requirement_summary').in('standard_id',standardIds),'Audit question mappings',['standard_id','question_id','scope_key','clause']):[],
    standardIds.length?read(()=>supabase.from('internal_audit_questions').select('*').in('standard_id',standardIds),'Audit question bank'):[],
    bankNames.length?read(()=>supabase.from('assessment_questions').select('*').in('standard',bankNames).eq('active',true),'Controlled Assessment reference bank'):[],
    read(()=>supabase.from('internal_audit_answers').select('*').eq('audit_id',audit.id).eq('owner_id',user.id),'Audit answers'),
    read(()=>supabase.from('internal_audit_evidence').select('*').eq('audit_id',audit.id).eq('owner_id',user.id),'Audit evidence'),
    read(()=>supabase.from('internal_audit_findings').select('*').eq('owner_id',user.id).or(`audit_id.eq.${audit.id},source_audit_id.eq.${audit.id}`),'Linked audit findings'),
  ]);
  const bank=new Map(nativeQuestions.map(question=>[question.id,question]));
  const missingIds=[...new Set(links.map(link=>link.question_id).filter(id=>id&&!bank.has(id)))];
  for(let start=0;start<missingIds.length;start+=100){
    const rows=await read(()=>supabase.from('internal_audit_questions').select('*').in('id',missingIds.slice(start,start+100)),'Cross-standard audit questions');
    rows.forEach(row=>bank.set(row.id,row));
  }
  const referenceCriteria=[],guidanceByQuestion={},referenceBanks=[];
  const refMatches=(a,b)=>{
    const left=parseAuditClauseScope(a),right=parseAuditClauseScope(b);
    return left.selectors.length===1&&right.selectors.length===1&&
      (auditClauseMatches(a,right.selectors[0])||auditClauseMatches(b,left.selectors[0]));
  };
  for(const selection of selectedStandards){
    const allowedNames=auditReferenceBankNames(selection);
    const names=[...new Set(assessmentQuestions.filter(row=>allowedNames.includes(row.standard)).map(row=>row.standard))];
    // A generic catalogue label must not silently combine standards/editions.
    if(names.length!==1){referenceBanks.push({standardId:selection.standard_id,status:names.length?'ambiguous':'missing',names});continue;}
    referenceBanks.push({standardId:selection.standard_id,status:'available',names});
    for(const reference of assessmentQuestions.filter(row=>row.standard===names[0])){
      const clause=clean(reference.clause_reference)||clean(reference.question_number);
      if(!clause)continue;
      const matches=links.filter(link=>link.standard_id===selection.standard_id&&
        (refMatches(link.clause,clause)||(bank.get(link.question_id)?.standard_id===selection.standard_id&&refMatches(bank.get(link.question_id)?.clause,clause))));
      referenceCriteria.push({...reference,standard_id:selection.standard_id,clause_reference:clause,scope_keys:[...new Set(matches.map(link=>link.scope_key).filter(Boolean))]});
      for(const link of matches){const current=guidanceByQuestion[link.question_id]||[];if(!current.some(item=>item.id===reference.id))current.push(reference);guidanceByQuestion[link.question_id]=current;}
    }
  }
  const scope=buildAuditFieldworkScope({selectedStandards,selectedProcesses,questions:[...bank.values()],links,
    referenceCriteria,referenceInventoryReviewed:options.referenceInventoryReviewed===true,
    exclusionJustification:audit.exclusion_justification});
  for(const reference of referenceBanks.filter(row=>row.status!=='available'))scope.issues.push({
    code:reference.status==='ambiguous'?'assessment_reference_edition_ambiguous':'assessment_reference_bank_missing',
    standardId:reference.standardId,blocking:true,
    message:reference.status==='ambiguous'?'More than one Assessment edition matches this audit standard. Review the catalogue edition.':'No exact Assessment reference bank matches this selected standard. Review the catalogue and clause inventory.',details:reference.names,
  });
  scope.scopeReady=scope.questions.length>0&&!scope.issues.some(item=>item.blocking);
  scope.questions=scope.questions.map(question=>({...question,assessment_guidance:guidanceByQuestion[question.id]||[]}));
  const coverage=buildAuditFieldworkCoverage({scope,answers,evidence,findings,auditId:audit.id,ownerId:user.id,organizationId:audit.organization_id});
  return {auditId:audit.id,ownerId:user.id,organizationId:audit.organization_id,scope,coverage,selectedStandards,selectedProcesses,referenceBanks,answers,evidence,findings};
}

export async function getAuditFieldworkSnapshot(auditId) {
  const {supabase,user,audit}=await context(auditId);
  return loadAuditFieldworkState(supabase,user,audit);
}

async function verifyAuditQuestion(supabase,userId,auditId,questionId) {
  const {data:audit,error}=await supabase.from('internal_audits').select('id,organization_id,exclusion_justification').eq('id',auditId).eq('owner_id',userId).maybeSingle();
  if(error||!audit)throw new Error('Internal audit not found.');
  const state=await loadAuditFieldworkState(supabase,{id:userId},audit);
  const question=state.scope.questions.find(row=>row.id===questionId);
  if(!question)throw new Error('The question is outside the approved audit scope or is not active.');
  return question;
}

export async function openAuditFinding(formData) {
  const auditId=clean(formData.get('audit_id'));
  if(!auditId)throw new Error('The source audit is required.');
  const {supabase,user,audit}=await context(auditId);
  if(!audit.plan_approved||audit.current_gate!=='fieldwork'||audit.status==='closed')throw new Error('Approved, open audit fieldwork is required to raise a new finding.');
  let questionId=clean(formData.get('question_id'));
  if(!questionId&&clean(formData.get('answer_id'))){
    const {data:answer,error}=await supabase.from('internal_audit_answers').select('question_id').eq('id',clean(formData.get('answer_id'))).eq('audit_id',auditId).eq('owner_id',user.id).maybeSingle();
    if(error)throw new Error('The source assessment could not be checked.');
    questionId=answer?.question_id;
  }
  if(!questionId)throw new Error('Select the originating audit question before raising a finding.');
  const state=await loadAuditFieldworkState(supabase,user,audit);
  const row=state.coverage.rows.find(item=>item.questionId===questionId);
  if(!row)throw new Error('The source question is outside the approved audit scope.');
  const existing=row.linkedFindings[0];
  if(existing&&formData.get('create_additional_finding')!=='on')redirect(`/portal/internal-audit-actions?record=${encodeURIComponent(existing.id)}`);
  const findingType=clean(formData.get('finding_type'))||clean(formData.get('result'))||'minor_nc';
  if(!['major_nc','minor_nc','observation','ofi'].includes(findingType))throw new Error('Choose Major NC, Minor NC, Observation or OFI.');
  // This is a working audit note, not a second finding form. Preserve the
  // previous conclusion until the shared Findings form confirms submission.
  const evidence=clean(formData.get('conclusion'))||clean(formData.get('objective_evidence'))||row.answer?.conclusion||null;
  if(evidence&&evidence.length>16000)throw new Error('Keep the working evidence note within 16,000 characters.');
  if(evidence!==null){
    const {error}=await supabase.from('internal_audit_answers').upsert({
      owner_id:user.id,audit_id:auditId,question_id:questionId,
      result:row.answer?.result||'not_assessed',conclusion:evidence,
      auditor_notes:row.answer?.auditor_notes||null,
      assigned_team_member_id:row.answer?.assigned_team_member_id||null,
      risk_level:row.answer?.risk_level||'medium',confidence_level:row.answer?.confidence_level||'medium',
      applicable:row.answer?.applicable!==false,not_applicable_justification:row.answer?.not_applicable_justification||null,
    },{onConflict:'audit_id,question_id'});
    if(error)throw new Error('The source working note could not be retained. Your finding has not been submitted.');
  }
  revalidatePath(`/portal/internal-audits/${auditId}`);
  const query=new URLSearchParams({raise:'1',audit_id:auditId,question_id:questionId,finding_type:findingType});
  if(formData.get('create_additional_finding')==='on')query.set('new_draft',randomUUID());
  redirect(`/portal/internal-audit-actions?${query}`);
}

export async function saveAuditAnswer(
  formData
) {
  if(['major_nc','minor_nc','observation','ofi'].includes(clean(formData.get('result'))))return openAuditFinding(formData);

  const auditId = clean(
    formData.get("audit_id")
  );

  const questionId = clean(
    formData.get("question_id")
  );

  const result =
    clean(
      formData.get("result")
    ) ?? "not_assessed";

  const riskLevel = clean(
    formData.get(
      "risk_level"
    )
  );

  const confidenceLevel = clean(
    formData.get(
      "confidence_level"
    )
  );

  if (
    !auditId ||
    !questionId ||
    !ANSWER_RESULTS.includes(
      result
    )
  ) {
    throw new Error(
      "Select a valid audit conclusion."
    );
  }

  if (
    riskLevel &&
    !RISK_LEVELS.includes(
      riskLevel
    )
  ) {
    throw new Error(
      "Select a valid risk level."
    );
  }

  if (
    confidenceLevel &&
    !CONFIDENCE_LEVELS.includes(
      confidenceLevel
    )
  ) {
    throw new Error(
      "Select a valid evidence confidence."
    );
  }

  const {
    supabase,
    user,
    audit,
  } = await context(auditId);

  if (!audit.plan_approved) {
    throw new Error(
      "The audit plan must be approved before fieldwork."
    );
  }

  await verifyAuditQuestion(
    supabase,
    user.id,
    auditId,
    questionId
  );

  const justification = clean(
    formData.get(
      "not_applicable_justification"
    )
  );

  if (
    result ===
      "not_applicable" &&
    !justification
  ) {
    redirect(
      `/portal/internal-audits/${auditId}?gate=fieldwork&answer_error=na_justification&question=${questionId}#question-${questionId}`
    );
  }


  if(audit.current_gate!=='fieldwork'||audit.status==='closed')throw new Error('Fieldwork is locked. Use the controlled audit revision process to amend assessments.');
  const currentState=await loadAuditFieldworkState(supabase,user,audit);
  const controlled=currentState.coverage.rows.find(row=>row.questionId===questionId)?.linkedFindings||[];
  if(controlled.length)throw new Error('Manage this finding in Findings & Actions. Its classification and progress are shown in Fieldwork.');
  if(['conformity','positive_practice'].includes(result)&&!clean(formData.get('conclusion')))throw new Error('Record objective evidence supporting the audit conclusion.');
  if(result==='unable_to_verify'&&!clean(formData.get('conclusion'))&&!clean(formData.get('auditor_notes')))throw new Error('Record what could not be verified and the required follow-up.');
  const payload = {
    owner_id:
      user.id,

    audit_id:
      auditId,

    question_id:
      questionId,

    assigned_team_member_id:
      clean(
        formData.get(
          "assigned_team_member_id"
        )
      ),

    result,

    conclusion:
      clean(
        formData.get(
          "conclusion"
        )
      ),

    auditor_notes:
      clean(
        formData.get(
          "auditor_notes"
        )
      ),

    risk_level:
      riskLevel,

    confidence_level:
      confidenceLevel,

    applicable:
      result !==
      "not_applicable",

    not_applicable_justification:
      justification,
  };

  const { error } = await supabase
    .from(
      "internal_audit_answers"
    )
    .upsert(
      payload,
      {
        onConflict:
          "audit_id,question_id",
      }
    );

  if (error) {
    throw new Error(
      error.message
    );
  }

  returnTo(
    auditId,
    "fieldwork",
    "answer"
  );
}

export async function addAuditEvidence(
  formData
) {
  const auditId = clean(
    formData.get("audit_id")
  );

  const title = clean(
    formData.get("title")
  );

  const evidenceType = clean(
    formData.get(
      "evidence_type"
    )
  );

  const allowedTypes = [
    "document",
    "record",
    "interview",
    "observation",
    "photograph",
    "screenshot",
    "system_record",
    "measurement",
    "test_result",
    "external_confirmation",
    "other",
  ];

  if (
    !auditId ||
    !title ||
    !evidenceType ||
    !allowedTypes.includes(
      evidenceType
    )
  ) {
    throw new Error(
      "Evidence title and valid type are required."
    );
  }

  const {
    supabase,
    user,
    audit,
  } = await context(auditId);

  if (!audit.plan_approved) {
    throw new Error(
      "The audit plan must be approved before evidence capture."
    );
  }

  const sourceType = clean(formData.get("source_type")) ?? "document";
  const allowedSourceTypes = ["interview", "recording", "document", "controlled_record", "system", "observation", "external_confirmation", "other"];
  if (!allowedSourceTypes.includes(sourceType)) throw new Error("Select a valid evidence source.");
  const sourcePersonId = clean(formData.get("source_person_id"));
  const sourceSupplierContactId = clean(formData.get("source_supplier_contact_id"));
  let sourceName = clean(formData.get("source_name"));
  if (audit.audit_type === "supplier") {
    if (sourcePersonId) throw new Error("Supplier-audit evidence sources must use the linked supplier contact list.");
    if (sourceSupplierContactId) {
      const { data: contact } = await supabase.from("supplier_contacts").select("id,first_name,last_name,email").eq("id", sourceSupplierContactId).eq("supplier_id", audit.supplier_id).eq("owner_id", user.id).eq("is_active", true).maybeSingle();
      if (!contact) throw new Error("Select a current contact from the linked supplier.");
      sourceName = [contact.first_name, contact.last_name].filter(Boolean).join(" ") || contact.email;
    }
  } else if (sourcePersonId) {
    if (sourceSupplierContactId) throw new Error("Select one controlled evidence source only.");
    const { data: person } = await supabase.from("organization_people").select("id,first_name,last_name,email").eq("id", sourcePersonId).eq("organization_id", audit.organization_id).eq("account_status", "active").maybeSingle();
    if (!person) throw new Error("Select an active Company User as the interviewee or source.");
    sourceName = [person.first_name, person.last_name].filter(Boolean).join(" ") || person.email;
  }

  const evidenceFile = formData.get("evidence_file");
  const hasEvidenceFile = typeof File !== "undefined" && evidenceFile instanceof File && evidenceFile.size > 0;
  if (hasEvidenceFile && evidenceFile.size > MAX_FINDING_EVIDENCE_BYTES) throw new Error("The evidence file exceeds the 10 MB limit.");
  if (hasEvidenceFile && !ALLOWED_FINDING_EVIDENCE_TYPES.has(evidenceFile.type)) throw new Error("The evidence file type is not accepted.");
  let attachmentPath = null;
  if (hasEvidenceFile) {
    attachmentPath = `${user.id}/${auditId}/evidence/${crypto.randomUUID()}-${safeEvidenceFileName(evidenceFile.name)}`;
    const { error: uploadError } = await supabase.storage.from(AUDIT_EVIDENCE_BUCKET).upload(attachmentPath, evidenceFile, { contentType: evidenceFile.type, upsert: false });
    if (uploadError) throw new Error(`Unable to upload evidence: ${uploadError.message}`);
  }

  const answerId = clean(
    formData.get("answer_id")
  );

  if (answerId) {
    const {
      data,
    } = await supabase
      .from(
        "internal_audit_answers"
      )
      .select("id")
      .eq("id", answerId)
      .eq("audit_id", auditId)
      .eq("owner_id", user.id)
      .maybeSingle();

    if (!data) {
      throw new Error(
        "The selected audit answer is unavailable."
      );
    }
  }

  const evidenceReference =
    `EV-${crypto.randomUUID()
      .slice(0, 8)
      .toUpperCase()}`;

  const { error } = await supabase
    .from(
      "internal_audit_evidence"
    )
    .insert({
      owner_id:
        user.id,

      audit_id:
        auditId,

      answer_id:
        answerId,

      evidence_reference:
        evidenceReference,

      evidence_type:
        evidenceType,

      title,

      description:
        clean(
          formData.get(
            "description"
          )
        ),

      source_name: sourceName,
      source_type: sourceType,
      source_person_id: sourcePersonId,
      source_supplier_contact_id: sourceSupplierContactId,

      source_date:
        clean(
          formData.get(
            "source_date"
          )
        ),

      evidence_owner: user.user_metadata?.full_name || user.user_metadata?.name || user.email,

      process_area:
        clean(
          formData.get(
            "process_area"
          )
        ),

      external_url:
        clean(
          formData.get(
            "external_url"
          )
        ),

      confidentiality:
        clean(
          formData.get(
            "confidentiality"
          )
        ) ?? "internal",

      reliability:
        clean(
          formData.get(
            "reliability"
          )
        ) ?? "medium",
      attachment_name: hasEvidenceFile ? evidenceFile.name : null,
      attachment_path: attachmentPath,
      attachment_type: hasEvidenceFile ? evidenceFile.type : null,
      attachment_size: hasEvidenceFile ? evidenceFile.size : null,
    });

  if (error) {
    if (attachmentPath) await supabase.storage.from(AUDIT_EVIDENCE_BUCKET).remove([attachmentPath]);
    throw new Error(
      error.message
    );
  }

  returnTo(
    auditId,
    "fieldwork",
    "evidence"
  );
}

export async function linkAuditFindingToAnswer(formData) {
  const auditId = clean(formData.get("audit_id"));
  const findingId = clean(formData.get("finding_id"));
  const answerId = clean(formData.get("answer_id"));

  if (!auditId || !findingId || !answerId) {
    throw new Error("Select an assessed criterion to link to the finding.");
  }

  const { supabase, user, audit } = await context(auditId);
  if (!audit.plan_approved) {
    throw new Error("The approved audit plan is required.");
  }

  const [findingResult, answerResult] = await Promise.all([
    supabase.from("internal_audit_findings").select("id, answer_id")
      .eq("id", findingId).eq("audit_id", auditId).eq("owner_id", user.id).maybeSingle(),
    supabase.from("internal_audit_answers").select("id")
      .eq("id", answerId).eq("audit_id", auditId).eq("owner_id", user.id).maybeSingle(),
  ]);

  if (findingResult.error || !findingResult.data) {
    throw new Error("Controlled finding not found.");
  }
  if (answerResult.error || !answerResult.data) {
    throw new Error("The selected assessed criterion is unavailable.");
  }

  const { error } = await supabase.from("internal_audit_findings")
    .update({ answer_id: answerId, updated_at: new Date().toISOString() })
    .eq("id", findingId).eq("audit_id", auditId).eq("owner_id", user.id);

  if (error) throw new Error(error.message);

  await supabase.from("internal_audit_events").insert({
    owner_id: user.id,
    audit_id: auditId,
    event_type: "finding_linked_to_assessment",
    summary: "Controlled finding linked to assessed audit criterion",
    event_data: { finding_id: findingId, answer_id: answerId },
    created_by: user.id,
  });

  returnTo(auditId, "fieldwork", "finding_linked");
}

export async function addAuditFinding(formData) {
  return openAuditFinding(formData);
}

export async function completeAuditFieldwork(formData) {
  const auditId=clean(formData.get('audit_id'));
  if(!auditId||formData.get('fieldwork_confirmation')!=='on')throw new Error('Human fieldwork completion and criterion-inventory review are required.');
  const {supabase,user,audit}=await context(auditId);
  if(!audit.plan_approved||audit.current_gate!=='fieldwork'||audit.status==='closed')throw new Error('Approved, open fieldwork is required.');
  const state=await loadAuditFieldworkState(supabase,user,audit,{referenceInventoryReviewed:true});
  if(!state.coverage.canCompleteFieldwork){
    const reason=!state.scope.scopeReady?'scope_coverage':'outstanding_questions';
    redirect(`/portal/internal-audits/${auditId}?gate=fieldwork&fieldwork_error=${reason}#fieldwork-requirements`);
  }
  const now=new Date().toISOString();
  const {error:eventError}=await supabase.from('internal_audit_events').insert({owner_id:user.id,audit_id:auditId,
    event_type:'fieldwork_coverage_reviewed',summary:'Human fieldwork scope and evidence review recorded',
    event_data:{required:state.coverage.required,accounted_for:state.coverage.accountedFor,
      justified_not_applicable:state.coverage.justifiedNotApplicable,controlled_findings:state.coverage.linkedFindingCount,
      reference_banks:state.referenceBanks,human_scope_review:true},created_by:user.id});
  if(eventError)throw new Error('The fieldwork review history could not be recorded. The report gate remains locked.');
  const {data:advanced,error}=await supabase.from('internal_audits').update({current_gate:'report',status:'report_draft',updated_at:now})
    .eq('id',auditId).eq('owner_id',user.id).eq('current_gate','fieldwork').eq('plan_approved',true).neq('status','closed').select('id');
  if(error)throw new Error(error.message);
  if(!advanced?.length)throw new Error('The audit changed during the review. Refresh Fieldwork before continuing.');
  returnTo(auditId,'report');
}

export async function verifyAuditFindingEffectiveness(
  formData
) {
  const auditId = clean(formData.get("audit_id"));
  const findingId = clean(formData.get("finding_id"));
  const result = clean(formData.get("effectiveness_result"));
  const conclusion = clean(formData.get("effectiveness_conclusion"));
  const verificationMethod = clean(formData.get("verification_method"));

  if (
    !auditId ||
    !findingId ||
    !["effective", "partially_effective", "ineffective"].includes(result) ||
    !conclusion ||
    !verificationMethod ||
    formData.get("human_verification") !== "on"
  ) {
    throw new Error(
      "A documented effectiveness result and human verification are required."
    );
  }

  const { supabase, user } = await context(auditId);

  const { data: finding, error: findingError } = await supabase
    .from("internal_audit_findings")
    .select("id, finding_reference, finding_type, linked_rca_case_id")
    .eq("id", findingId)
    .eq("audit_id", auditId)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (
    findingError ||
    !finding ||
    !["major_nc", "minor_nc"].includes(finding.finding_type) ||
    !finding.linked_rca_case_id
  ) {
    throw new Error("A linked audit nonconformity and 8D case are required.");
  }

  const [rcaResult, actionsResult] = await Promise.all([
    supabase
      .from("rca_cases")
      .select("id, status, current_discipline")
      .eq("id", finding.linked_rca_case_id)
      .eq("owner_id", user.id)
      .maybeSingle(),
    supabase
      .from("rca_actions")
      .select("id, status, effectiveness_result")
      .eq("case_id", finding.linked_rca_case_id)
      .eq("owner_id", user.id)
      .eq("discipline", 5)
      .eq("selection_status", "selected"),
  ]);

  if (rcaResult.error || !rcaResult.data || actionsResult.error) {
    throw new Error(
      rcaResult.error?.message ||
      actionsResult.error?.message ||
      "The linked 8D case could not be verified."
    );
  }

  const actions = actionsResult.data ?? [];
  const allActionsComplete =
    actions.length > 0 &&
    actions.every((action) => ["effective", "effective_verified"].includes(action.effectiveness_result) && action.status === "verified");
  const rcaAtEffectivenessGate =
    Number(rcaResult.data.current_discipline) >= 8 ||
    ["effectiveness_review", "closed"].includes(rcaResult.data.status);

  if (
    result === "effective" &&
    (!allActionsComplete || !rcaAtEffectivenessGate)
  ) {
    redirect(`/portal/internal-audits/${auditId}?gate=closing&closure_error=capa#verify-${findingId}`);
  }

  const effective = result === "effective";
  const now = new Date().toISOString();

  const { error: updateError } = await supabase
    .from("internal_audit_findings")
    .update({
      status: effective ? "closed" : "action_in_progress",
      closure_verified: effective,
      closure_verified_by: effective ? user.id : null,
      closure_verified_at: effective ? now : null,
      closed_at: effective ? now : null,
      updated_at: now,
    })
    .eq("id", findingId)
    .eq("audit_id", auditId)
    .eq("owner_id", user.id);

  if (updateError) throw new Error(updateError.message);

  const { error: rcaUpdateError } = await supabase
    .from("rca_cases")
    .update({
      status: effective ? "closed" : "effectiveness_review",
      closed_at: effective ? now : null,
      closure_summary: conclusion,
      updated_at: now,
    })
    .eq("id", finding.linked_rca_case_id)
    .eq("owner_id", user.id);

  if (rcaUpdateError) throw new Error(rcaUpdateError.message);

  const actionStatus = effective
    ? "verified_effective"
    : result === "partially_effective"
      ? "verified_partially_effective"
      : "verified_ineffective";
  const { error: accessUpdateError } = await supabase.from("internal_audit_action_access").update({
    status: actionStatus,
    verification_method: verificationMethod,
    verification_evidence: conclusion,
    effectiveness_result: result,
    verified_at: now,
    verified_by: user.id,
    updated_at: now,
  }).eq("finding_id", findingId).eq("audit_id", auditId).eq("owner_id", user.id);
  if (accessUpdateError) throw new Error(accessUpdateError.message);

  await supabase.from("internal_audit_events").insert({
    owner_id: user.id,
    audit_id: auditId,
    event_type: "capa_effectiveness_verified",
    summary: `${finding.finding_reference}: ${result}`,
    event_data: {
      finding_id: findingId,
      rca_case_id: finding.linked_rca_case_id,
      effectiveness_result: result,
      conclusion,
    },
    created_by: user.id,
  });

  returnTo(auditId, "closing", "effectiveness");
}

export async function verifyD6CorrectiveAction(formData) {
  const auditId = clean(formData.get("audit_id"));
  const findingId = clean(formData.get("finding_id"));
  const accessId = clean(formData.get("action_access_id"));
  const actionId = clean(formData.get("action_id"));
  const result = clean(formData.get("effectiveness_result"));
  const verificationMethod = clean(formData.get("effectiveness_verification_method"));
  const conclusion = clean(formData.get("effectiveness_verification_conclusion"));
  const allowedResults = ["effective_verified", "partially_effective", "not_effective", "unable_to_verify"];
  if (!auditId || !findingId || !accessId || !actionId || !allowedResults.includes(result) || !verificationMethod || !conclusion || formData.get("independent_verification") !== "on") {
    throw new Error("A complete independent D6 effectiveness decision is required.");
  }
  const { supabase, user } = await context(auditId);
  const { data: finding, error: findingError } = await supabase.from("internal_audit_findings")
    .select("id, finding_reference, linked_rca_case_id").eq("id", findingId).eq("audit_id", auditId).eq("owner_id", user.id).maybeSingle();
  if (findingError || !finding?.linked_rca_case_id) throw new Error(findingError?.message || "Linked CAPA–8D case not found.");
  const { data: access, error: accessError } = await supabase.from("internal_audit_action_access")
    .select("id, rca_case_id").eq("id", accessId).eq("audit_id", auditId).eq("finding_id", findingId).eq("owner_id", user.id).maybeSingle();
  if (accessError || !access || access.rca_case_id !== finding.linked_rca_case_id) throw new Error(accessError?.message || "D6 verification request not found.");
  const { count: linkedEvidenceCount, error: linkedEvidenceError } = await supabase.from("rca_evidence")
    .select("id", { count: "exact", head: true }).eq("case_id", finding.linked_rca_case_id)
    .eq("owner_id", user.id).eq("discipline", 6).eq("action_id", actionId);
  if (linkedEvidenceError) throw new Error(linkedEvidenceError.message);
  if (result === "effective_verified" && !linkedEvidenceCount) {
    throw new Error("This action cannot be confirmed effective because no objective evidence is linked to it.");
  }
  const now = new Date().toISOString();
  const effective = result === "effective_verified";
  // The existing accountable-human trigger uses the canonical value
  // "effective". The form/event retain the clearer "effective_verified" label.
  const storedEffectivenessResult = effective ? "effective" : result;
  const { data: action, error: actionError } = await supabase.from("rca_actions").update({
    effectiveness_result: storedEffectivenessResult,
    implementation_evidence: "Objective evidence linked to this corrective action in the controlled D6 evidence repository.",
    effectiveness_verification_method: verificationMethod,
    effectiveness_verification_conclusion: conclusion,
    verified_by: user.id,
    verified_at: now,
    status: effective ? "verified" : "open",
    updated_at: now,
  }).eq("id", actionId).eq("case_id", finding.linked_rca_case_id).eq("owner_id", user.id)
    .eq("discipline", 5).eq("selection_status", "selected").select("id, title").maybeSingle();
  if (actionError || !action) throw new Error(actionError?.message || "Selected D6 corrective action not found.");
  const { data: selectedActions, error: selectedError } = await supabase.from("rca_actions").select("id, effectiveness_result")
    .eq("case_id", finding.linked_rca_case_id).eq("owner_id", user.id).eq("discipline", 5).eq("selection_status", "selected");
  if (selectedError) throw new Error(selectedError.message);
  const allEffective = (selectedActions ?? []).length > 0 && (selectedActions ?? []).every((item) => ["effective", "effective_verified"].includes(item.effectiveness_result));
  const { error: disciplineError } = await supabase.from("rca_8d_disciplines").update(allEffective ? {
    status: "approved", completion_score: 100, human_approved: true, approved_by: user.id, approved_at: now,
  } : { status: "in_progress", completion_score: 60, human_approved: false, approved_by: null, approved_at: null })
    .eq("case_id", finding.linked_rca_case_id).eq("owner_id", user.id).eq("discipline", 6);
  if (disciplineError) throw new Error(disciplineError.message);
  const { error: caseError } = await supabase.from("rca_cases").update({ current_discipline: allEffective ? 7 : 6, status: "active", updated_at: now })
    .eq("id", finding.linked_rca_case_id).eq("owner_id", user.id);
  if (caseError) throw new Error(caseError.message);
  // D6 verifies the individual corrective actions only. The parent audit
  // action must remain at verification_requested until the auditor records the
  // separate final 8D acceptance, which supplies the accountable closure data.
  const accessVerificationUpdate = allEffective ? {
    status: "verification_requested",
    effectiveness_result: null,
    verified_at: null,
    verified_by: null,
    d6_verification_completed_at: now,
    updated_at: now,
  } : {
    status: "verification_requested",
    effectiveness_result: null,
    verified_at: null,
    verified_by: null,
    d6_verification_completed_at: null,
    updated_at: now,
  };
  const { error: accessUpdateError } = await supabase.from("internal_audit_action_access").update(accessVerificationUpdate)
    .eq("id", accessId).eq("owner_id", user.id);
  if (accessUpdateError) throw new Error(accessUpdateError.message);
  await supabase.from("rca_case_events").insert({ case_id: finding.linked_rca_case_id, owner_id: user.id,
    event_type: "d6_effectiveness_decision", discipline: 6,
    summary: `${action.title}: ${result.replaceAll("_", " ")}`,
    event_data: { action_id: action.id, finding_id: findingId, result, all_actions_effective: allEffective } });
  await supabase.from("internal_audit_events").insert({ owner_id: user.id, audit_id: auditId,
    event_type: "d6_action_effectiveness_decided", summary: `${finding.finding_reference}: ${action.title} — ${result.replaceAll("_", " ")}`,
    event_data: { finding_id: findingId, action_id: action.id, result, all_actions_effective: allEffective }, created_by: user.id });
  returnTo(auditId, "actions", "d6_verification");
}

export async function saveAuditReport(formData) {
  const auditId = clean(formData.get("audit_id"));
  if (!auditId) throw new Error("Audit reference is required.");
  const { supabase, user, audit } = await context(auditId);
  if(['scope','team','plan','fieldwork'].includes(audit.current_gate))throw new Error('Complete the approved fieldwork coverage review before preparing the audit report.');

  const reportReference = clean(formData.get("report_reference")) || `${audit.audit_reference}-RPT`;
  const { data: existingReport, error: existingReportError } = await supabase
    .from("internal_audit_report_controls").select("report_version, status")
    .eq("audit_id", auditId).eq("owner_id", user.id).maybeSingle();
  if (existingReportError) throw new Error(existingReportError.message);
  const payload = {
    owner_id: user.id,
    audit_id: auditId,
    report_reference: reportReference,
    report_version: existingReport?.status === "issued"
      ? (existingReport.report_version || 1) + 1
      : existingReport?.report_version || 1,
    executive_summary: clean(formData.get("executive_summary")),
    methodology_and_sampling: clean(formData.get("methodology_and_sampling")),
    limitations_and_exclusions: clean(formData.get("limitations_and_exclusions")),
    unresolved_differences: clean(formData.get("unresolved_differences")),
    overall_conclusion: clean(formData.get("overall_conclusion")),
    confidentiality_classification: clean(formData.get("confidentiality_classification")) || "controlled",
    distribution_list: clean(formData.get("distribution_list")),
    lead_auditor_name: clean(formData.get("lead_auditor_name")),
    status: "draft",
    approved_at: null,
    approved_by: null,
    issued_at: null,
    issued_by: null,
    updated_at: new Date().toISOString(),
  };
  const { error } = await supabase.from("internal_audit_report_controls")
    .upsert(payload, { onConflict: "audit_id" });
  if (error) throw new Error(error.message);
  const { error: auditError } = await supabase.from("internal_audits").update({
    current_gate: "report", status: "report_draft", updated_at: new Date().toISOString(),
  }).eq("id", auditId).eq("owner_id", user.id);
  if (auditError) throw new Error(auditError.message);
  returnTo(auditId, "report", "report");
}

export async function generateAuditReportGuidedDraft(formData) {
  const auditId = clean(formData.get("audit_id"));
  const replaceExisting = formData.get("replace_existing") === "on";
  if (!auditId) throw new Error("Audit reference is required.");
  const { supabase, user, audit } = await context(auditId);
  if(['scope','team','plan','fieldwork'].includes(audit.current_gate))throw new Error('Complete the approved fieldwork coverage review before preparing the audit report.');

  const [reportResult, answersResult, findingsResult, evidenceResult, teamResult] = await Promise.all([
    supabase.from("internal_audit_report_controls").select("*").eq("audit_id", auditId).eq("owner_id", user.id).maybeSingle(),
    supabase.from("internal_audit_answers").select("result, conclusion, auditor_notes, risk_level, confidence_level, not_applicable_justification, internal_audit_questions(question_code, clause, process_area, question_text)").eq("audit_id", auditId).eq("owner_id", user.id).neq("result", "not_assessed"),
    supabase.from("internal_audit_findings").select("finding_reference, finding_type, risk_level, title, failure_statement, criteria, objective_evidence, process_area, status").eq("audit_id", auditId).eq("owner_id", user.id),
    supabase.from("internal_audit_evidence").select("evidence_reference, evidence_type, title, description, source_name, source_date, evidence_owner, process_area, confidentiality, reliability").eq("audit_id", auditId).eq("owner_id", user.id),
    supabase.from("internal_audit_team_members").select("member_name, audit_role").eq("audit_id", auditId).eq("owner_id", user.id),
  ]);
  for (const result of [reportResult, answersResult, findingsResult, evidenceResult, teamResult]) {
    if (result.error) throw new Error(result.error.message);
  }
  const answers = answersResult.data ?? [];
  if (!answers.length) redirect(`/portal/internal-audits/${auditId}?gate=report&report_error=guided_insufficient_evidence`);
  const findings = findingsResult.data ?? [];
  const evidence = evidenceResult.data ?? [];
  const team = teamResult.data ?? [];
  const tally = (records, field, value) => records.filter((record) => record[field] === value).length;
  const assessed = answers.length;
  const conformity = tally(answers, "result", "conformity");
  const major = Math.max(tally(answers, "result", "major_nc"), tally(findings, "finding_type", "major_nc"));
  const minor = Math.max(tally(answers, "result", "minor_nc"), tally(findings, "finding_type", "minor_nc"));
  const observations = Math.max(tally(answers, "result", "observation"), tally(findings, "finding_type", "observation"));
  const opportunities = Math.max(tally(answers, "result", "ofi"), tally(findings, "finding_type", "ofi"));
  const positives = Math.max(tally(answers, "result", "positive_practice"), tally(findings, "finding_type", "positive_practice"));
  const unable = tally(answers, "result", "unable_to_verify");
  const notApplicable = tally(answers, "result", "not_applicable");
  const lowConfidence = answers.filter((answer) => answer.confidence_level === "low");
  const processAreas = [...new Set(answers.map((answer) => answer.internal_audit_questions?.process_area).filter(Boolean))];
  const evidenceTypes = [...new Set(evidence.map((item) => item.evidence_type).filter(Boolean))].map((item) => item.replaceAll("_", " "));
  const findingReferences = findings.filter((item) => ["major_nc", "minor_nc"].includes(item.finding_type)).map((item) => item.finding_reference).filter(Boolean);
  const scope = audit.scope_statement || audit.processes || "the approved audit scope";
  const sites = audit.sites ? ` at ${audit.sites}` : "";
  const resultSummary = `${conformity} conformity result(s), ${major} major nonconformity(ies), ${minor} minor nonconformity(ies), ${observations} observation(s), ${opportunities} opportunity(ies) for improvement and ${positives} positive practice item(s)`;
  const draft = {
    executive_summary: `This internal audit assessed ${scope}${sites}. ${assessed} criterion assessment(s) were completed and ${evidence.length} item(s) were recorded in the objective-evidence register. The controlled results comprise ${resultSummary}. ${findingReferences.length ? `Formal corrective-action follow-up is required for ${findingReferences.join(", ")}.` : "No Major or Minor nonconformity requiring formal corrective-action follow-up was recorded."} This narrative is generated directly from the controlled audit record and must be reviewed by the lead auditor before approval.`,
    methodology_and_sampling: `The audit was performed by ${team.length || 1} assigned audit team member(s) against the approved scope and question bank. Work covered ${processAreas.length ? processAreas.join(", ") : audit.processes || "the recorded process areas"}. Conclusions were recorded criterion by criterion and supported by ${evidence.length} registered evidence item(s)${evidenceTypes.length ? `, including ${evidenceTypes.join(", ")}` : ""}. Sampling provides assurance only for the activities, records, people, sites and time period actually examined; it does not constitute exhaustive verification of every transaction or control.`,
    limitations_and_exclusions: unable || lowConfidence.length || notApplicable ? `${unable ? `${unable} criterion assessment(s) could not be verified from the evidence available. ` : ""}${lowConfidence.length ? `${lowConfidence.length} assessment(s) were recorded with low evidence confidence and require particular attention during review. ` : ""}${notApplicable ? `${notApplicable} criterion assessment(s) were recorded as not applicable with the justification retained in the controlled record. ` : ""}The lead auditor must confirm that these limitations do not invalidate the overall conclusion and add any access, time, sampling or scope restrictions not captured here.` : "No unable-to-verify or low-confidence assessment was identified in the controlled results. The lead auditor must nevertheless confirm whether any access, time, sampling or scope restriction affected the audit.",
    overall_conclusion: major ? `The audit identified ${major} Major nonconformity(ies), demonstrating a significant failure requiring prompt containment, root-cause analysis, corrective action and independent effectiveness verification. ${minor ? `${minor} Minor nonconformity(ies) were also recorded. ` : ""}The management system cannot be considered fully effective within the audited scope until the controlled actions are implemented and verified. This conclusion must be confirmed by the lead auditor against the complete evidence trail.` : minor ? `The management system was found to be implemented across the audited scope, but ${minor} Minor nonconformity(ies) require controlled correction, root-cause analysis and corrective action. No Major nonconformity was recorded. Effectiveness should be confirmed only after the relevant actions and objective evidence have been independently verified by the auditor.` : unable ? `No Major or Minor nonconformity was recorded; however, ${unable} criterion assessment(s) could not be verified. Assurance is therefore qualified until sufficient objective evidence is obtained and the outstanding criteria are concluded by the auditor.` : `Within the approved scope and subject to the stated sampling limitations, the recorded evidence supports implementation of the management system. No Major or Minor nonconformity was recorded. ${observations || opportunities ? "The observations and opportunities for improvement should be considered to strengthen performance and prevent deterioration." : "Any recorded improvement opportunities and positive practices should be reviewed through normal management-system arrangements."} Final approval remains the responsibility of the lead auditor.`,
  };
  const existing = reportResult.data;
  const choose = (field) => replaceExisting || !clean(existing?.[field]) ? clean(draft[field]) : existing[field];
  const payload = {
    owner_id: user.id, audit_id: auditId,
    report_reference: existing?.report_reference || `${audit.audit_reference}-RPT`,
    report_version: existing?.report_version || 1,
    executive_summary: choose("executive_summary"),
    methodology_and_sampling: choose("methodology_and_sampling"),
    limitations_and_exclusions: choose("limitations_and_exclusions"),
    unresolved_differences: existing?.unresolved_differences || null,
    overall_conclusion: choose("overall_conclusion"),
    confidentiality_classification: existing?.confidentiality_classification || "controlled",
    distribution_list: existing?.distribution_list || null,
    lead_auditor_name: existing?.lead_auditor_name || (teamResult.data ?? []).find((member) => member.audit_role === "lead_auditor")?.member_name || null,
    status: "draft", approved_at: null, approved_by: null, issued_at: null, issued_by: null,
    updated_at: new Date().toISOString(),
  };
  const { error: saveError } = await supabase.from("internal_audit_report_controls").upsert(payload, { onConflict: "audit_id" });
  if (saveError) throw new Error(saveError.message);
  await supabase.from("internal_audit_events").insert({ owner_id: user.id, audit_id: auditId, event_type: "report_guided_draft_generated", summary: "Guided report narrative generated from the controlled audit record", event_data: { replaced_existing: replaceExisting, assessed_criteria: assessed, evidence_records: evidence.length, findings: findings.length }, created_by: user.id });
  revalidatePath(`/portal/internal-audits/${auditId}`);
  redirect(`/portal/internal-audits/${auditId}?gate=report&saved=guided_draft`);
}

export async function approveAuditReport(formData) {
  const auditId = clean(formData.get("audit_id"));
  if (!auditId || formData.get("report_approval_confirmation") !== "on") {
    throw new Error("Lead-auditor report approval is required.");
  }
  const { supabase, user } = await context(auditId);
  const { data: report, error: reportError } = await supabase.from("internal_audit_report_controls")
    .select("id, executive_summary, overall_conclusion, lead_auditor_name")
    .eq("audit_id", auditId).eq("owner_id", user.id).maybeSingle();
  if (reportError) throw new Error(reportError.message);
  if (!report?.executive_summary || !report?.overall_conclusion || !report?.lead_auditor_name) {
    redirect(`/portal/internal-audits/${auditId}?gate=report&report_error=incomplete`);
  }
  const now = new Date().toISOString();
  const { error } = await supabase.from("internal_audit_report_controls").update({
    status: "approved", approved_at: now, approved_by: user.id, updated_at: now,
  }).eq("id", report.id).eq("owner_id", user.id);
  if (error) throw new Error(error.message);
  await supabase.from("internal_audits").update({ current_gate: "actions", status: "report_approved", updated_at: now })
    .eq("id", auditId).eq("owner_id", user.id);
  returnTo(auditId, "actions", "report_approved");
}

export async function issueAuditReport(formData) {
  const auditId = clean(formData.get("audit_id"));
  if (!auditId) throw new Error("Audit reference is required.");
  const { supabase, user } = await context(auditId);
  const { data: report, error: reportReadError } = await supabase.from("internal_audit_report_controls")
    .select("id, status").eq("audit_id", auditId).eq("owner_id", user.id).maybeSingle();
  if (reportReadError) throw new Error(reportReadError.message);
  if (!report || !["approved", "issued"].includes(report.status)) {
    redirect(`/portal/internal-audits/${auditId}?gate=report&report_error=approval_required`);
  }
  const now = new Date().toISOString();
  const { error } = await supabase.from("internal_audit_report_controls").update({
    status: "issued", issued_at: now, issued_by: user.id, updated_at: now,
  }).eq("id", report.id).eq("owner_id", user.id);
  if (error) throw new Error(error.message);
  await supabase.from("internal_audits").update({ current_gate: "actions", status: "capa_monitoring", updated_at: now })
    .eq("id", auditId).eq("owner_id", user.id);
  returnTo(auditId, "actions", "report_issued");
}

export async function assignAuditActionOwner(formData) {
  const auditId = clean(formData.get("audit_id"));
  const findingId = clean(formData.get("finding_id"));
  const assigneeName = clean(formData.get("assignee_name"));
  const assigneeEmail = clean(formData.get("assignee_email"))?.toLowerCase();
  let assigneeUserId = clean(formData.get("assignee_user_id"));
  if (!auditId || !findingId || !assigneeName || !assigneeEmail) {
    throw new Error("Action-owner name and email are required.");
  }
  const { supabase, user } = await context(auditId);
  if (!assigneeUserId) {
    const admin = createAdminClient();
    const { data: usersResult } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    assigneeUserId = usersResult?.users?.find((candidate) => candidate.email?.toLowerCase() === assigneeEmail)?.id || null;
  }
  const { data: finding, error: findingError } = await supabase.from("internal_audit_findings")
    .select("id, linked_rca_case_id, finding_type").eq("id", findingId).eq("audit_id", auditId)
    .eq("owner_id", user.id).maybeSingle();
  if (findingError || !finding || !["major_nc", "minor_nc"].includes(finding.finding_type)) {
    throw new Error(findingError?.message || "Only a controlled nonconformity can be assigned.");
  }
  const token = randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
  const { data: access, error } = await supabase.from("internal_audit_action_access").upsert({
    owner_id: user.id, audit_id: auditId, finding_id: findingId,
    rca_case_id: finding.linked_rca_case_id, assignee_user_id: assigneeUserId,
    assignee_name: assigneeName, assignee_email: assigneeEmail,
    secure_token_hash: tokenHash, secure_token_expires_at: expiresAt,
    status: "assigned", updated_at: new Date().toISOString(),
  }, { onConflict: "finding_id" }).select("id").single();
  if (error || !access) throw new Error(error?.message || "Unable to assign the action owner.");
  revalidatePath(`/portal/internal-audits/${auditId}`);
  redirect(`/portal/internal-audits/${auditId}?gate=actions&saved=owner&access=${access.id}&action_token=${token}#action-${findingId}`);
}

export async function reviewAuditActionResponse(formData) {
  const auditId = clean(formData.get("audit_id"));
  const accessId = clean(formData.get("action_access_id"));
  const decision = clean(formData.get("decision"));
  const response = clean(formData.get("auditor_response"));
  if (!auditId || !accessId || !response || !["accepted", "returned"].includes(decision)) {
    throw new Error("Record an auditor decision and response.");
  }
  const { supabase, user } = await context(auditId);
  const now = new Date().toISOString();
  const { data: access, error: accessLookupError } = await supabase.from("internal_audit_action_access")
    .select("id, finding_id, rca_case_id, status").eq("id", accessId).eq("audit_id", auditId).eq("owner_id", user.id).maybeSingle();
  if (accessLookupError || !access) throw new Error(accessLookupError?.message || "Assigned 8D response not found.");
  if (decision === "accepted" && access.rca_case_id) {
    const { data: selectedActions, error: selectedActionsError } = await supabase.from("rca_actions")
      .select("id, effectiveness_result, status, verified_by, verified_at")
      .eq("case_id", access.rca_case_id).eq("owner_id", user.id)
      .eq("discipline", 5).eq("selection_status", "selected");
    if (selectedActionsError) throw new Error(selectedActionsError.message);
    const allIndependentlyVerified = (selectedActions ?? []).length > 0 && (selectedActions ?? []).every((action) =>
      ["effective", "effective_verified"].includes(action.effectiveness_result) &&
      action.status === "verified" &&
      action.verified_by &&
      action.verified_at
    );
    if (!allIndependentlyVerified) {
      redirect(`/portal/internal-audits/${auditId}?gate=actions&action_error=d6_verification_required#action-${access.finding_id}`);
    }
  }
  const reviewUpdate = decision === "accepted" ? {
    status: "verified_effective",
    effectiveness_result: "effective",
    verification_method: "Independent action-by-action D6 effectiveness verification",
    verification_evidence: response,
    verified_at: now,
    verified_by: user.id,
    auditor_response: response,
    auditor_response_at: now,
    auditor_response_by: user.id,
    updated_at: now,
  } : {
    status: "returned",
    auditor_response: response,
    auditor_response_at: now,
    auditor_response_by: user.id,
    updated_at: now,
  };
  const { error } = await supabase.from("internal_audit_action_access").update(reviewUpdate)
    .eq("id", accessId).eq("audit_id", auditId).eq("owner_id", user.id);
  if (error) throw new Error(error.message);
  if (access.rca_case_id) {
    const stageUpdate = decision === "accepted"
      ? { status: "approved", human_approved: true, approved_by: user.id, approved_at: now }
      : { status: "in_progress", human_approved: false, approved_by: null, approved_at: null };
    const { error: stageError } = await supabase.from("rca_8d_disciplines").update(stageUpdate)
      .eq("case_id", access.rca_case_id).eq("owner_id", user.id);
    if (stageError) throw new Error(stageError.message);
    const { error: caseError } = await supabase.from("rca_cases").update({
      status: decision === "accepted" ? "effectiveness_review" : "active",
      current_discipline: 8,
      updated_at: now,
    }).eq("id", access.rca_case_id).eq("owner_id", user.id);
    if (caseError) throw new Error(caseError.message);
    await supabase.from("rca_case_events").insert({
      case_id: access.rca_case_id, owner_id: user.id,
      event_type: decision === "accepted" ? "final_8d_accepted" : "final_8d_returned",
      discipline: 8,
      summary: decision === "accepted" ? "Final D0-D8 response accepted by auditor" : "Final D0-D8 response returned for revision",
      event_data: { action_access_id: accessId, auditor_response: response },
    });
  }
  returnTo(auditId, "actions", "action_review");
}

export async function completeAuditClosure(formData) {
  const auditId = clean(formData.get("audit_id"));

  if (
    !auditId ||
    formData.get("closure_confirmation") !== "on"
  ) {
    throw new Error("Human audit closure confirmation is required.");
  }

  const { supabase, user } = await context(auditId);

  const { data: report, error: reportError } = await supabase
    .from("internal_audit_report_controls")
    .select("status")
    .eq("audit_id", auditId)
    .eq("owner_id", user.id)
    .maybeSingle();
  if (reportError) throw new Error(reportError.message);
  if (report?.status !== "issued") {
    redirect(`/portal/internal-audits/${auditId}?gate=closing&closure_error=report`);
  }

  const { data: findings, error: findingsError } = await supabase
    .from("internal_audit_findings")
    .select("id, finding_reference, linked_rca_case_id, closure_verified, status")
    .eq("audit_id", auditId)
    .eq("owner_id", user.id)
    .in("finding_type", ["major_nc", "minor_nc"]);

  if (findingsError) throw new Error(findingsError.message);

  const unresolved = (findings ?? []).filter(
    (finding) =>
      !finding.linked_rca_case_id ||
      !finding.closure_verified ||
      finding.status !== "closed"
  );

  if (unresolved.length > 0) {
    redirect(`/portal/internal-audits/${auditId}?gate=closing&closure_error=actions`);
  }

  const now = new Date().toISOString();
  const { error } = await supabase
    .from("internal_audits")
    .update({
      current_gate: "closure",
      status: "closed",
      updated_at: now,
    })
    .eq("id", auditId)
    .eq("owner_id", user.id);

  if (error) throw new Error(error.message);

  await supabase.from("internal_audit_events").insert({
    owner_id: user.id,
    audit_id: auditId,
    event_type: "audit_closed",
    summary: "Audit closed after CAPA effectiveness verification",
    event_data: {
      nonconformity_count: (findings ?? []).length,
    },
    created_by: user.id,
  });

  returnTo(auditId, "closing", "closed");
}
