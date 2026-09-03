"use server";

// RPG INTERNAL AUDIT PLAN GATE — NO SAMPLING APPROVAL DEPENDENCY — 2026-08-24

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createHash, randomBytes } from "node:crypto";

import { createClient } from "../../../../lib/supabase/server";
import { createAdminClient } from "../../../../lib/supabase/admin";

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
      "id, audit_reference, organization_id, title, current_gate, status, scope_approved, plan_approved, planned_start_at, planned_end_at, auditee_contact_name, auditee_contact_email, sites, processes"
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
  } = await context(auditId);

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

      sites:
        clean(
          formData.get("sites")
        ),

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

  const memberName = clean(
    formData.get("member_name")
  );

  const email = clean(
    formData.get("email")
  );

  if (
    !auditId ||
    !memberName ||
    !email
  ) {
    throw new Error(
      "Team member name and email are required."
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

      member_name:
        memberName,

      email,

      audit_role:
        auditRole,

      standards_competence:
        clean(
          formData.get(
            "standards_competence"
          )
        ),

      sector_competence:
        clean(
          formData.get(
            "sector_competence"
          )
        ),

      technical_competence:
        clean(
          formData.get(
            "technical_competence"
          )
        ),

      assigned_scope:
        clean(
          formData.get(
            "assigned_scope"
          )
        ),

      competence_confirmed:
        formData.get(
          "competence_confirmed"
        ) === "on",

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
      "id, audit_role, competence_confirmed, independence_confirmed, confidentiality_confirmed"
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
    .select("standard_id, internal_audit_standard_catalogue(standard_code)")
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
  const questionCoverage = scopedQuestionIds.length
    ? await supabase.from("internal_audit_questions")
        .select("id", { count: "exact", head: true })
        .in("id", scopedQuestionIds)
        .eq("active", true)
    : { count: 0, error: null };

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

async function verifyAuditQuestion(
  supabase,
  userId,
  auditId,
  questionId
) {
  const {
    data: question,
    error,
  } = await supabase
    .from(
      "internal_audit_questions"
    )
    .select(
      "id, clause, process_area, standard_id"
    )
    .eq("id", questionId)
    .eq("active", true)
    .maybeSingle();

  if (
    error ||
    !question
  ) {
    throw new Error(
      "Audit question not found."
    );
  }

  const {
    data: selected,
  } = await supabase
    .from(
      "internal_audit_selected_standards"
    )
    .select("id")
    .eq("audit_id", auditId)
    .eq("owner_id", userId)
    .eq(
      "standard_id",
      question.standard_id
    )
    .maybeSingle();

  if (!selected) {
    throw new Error(
      "The question is outside the approved audit criteria."
    );
  }

  return question;
}

export async function saveAuditAnswer(
  formData
) {
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

      source_name:
        clean(
          formData.get(
            "source_name"
          )
        ),

      source_date:
        clean(
          formData.get(
            "source_date"
          )
        ),

      evidence_owner:
        clean(
          formData.get(
            "evidence_owner"
          )
        ),

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
    });

  if (error) {
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

export async function addAuditFinding(
  formData
) {
  const auditId = clean(
    formData.get("audit_id")
  );

  const findingType = clean(
    formData.get(
      "finding_type"
    )
  );

  const title = clean(
    formData.get("title")
  );

  const criteria = clean(
    formData.get("criteria")
  );

  const objectiveEvidence = clean(
    formData.get(
      "objective_evidence"
    )
  );

  const requirementSource = clean(formData.get("requirement_source"));
  const requirementStandardId = clean(formData.get("requirement_standard_id"));
  const evidenceSource = clean(formData.get("evidence_source"));
  const requirementSources = [
    "management_system_standard",
    "legal_regulatory",
    "customer_contractual",
    "policy_procedure",
    "certification_scheme",
    "other_criteria",
  ];
  const evidenceSources = [
    "document_record",
    "interview",
    "observation",
    "system_record",
    "photograph_screenshot",
    "measurement_test",
    "external_confirmation",
    "multiple_sources",
    "other",
  ];

  const types = [
    "major_nc",
    "minor_nc",
    "observation",
    "ofi",
    "positive_practice",
    "unable_to_verify",
  ];

  if (
    !auditId ||
    !types.includes(
      findingType
    ) ||
    !title ||
    !criteria ||
    !objectiveEvidence ||
    !requirementSources.includes(requirementSource) ||
    !evidenceSources.includes(evidenceSource)
  ) {
    throw new Error(
      "Finding type, title, criteria and objective evidence are required."
    );
  }

  if (requirementSource === "management_system_standard" && !requirementStandardId) {
    throw new Error("Select the applicable management system standard.");
  }

  const failureStatement = clean(
    formData.get(
      "failure_statement"
    )
  );

  if (
    [
      "major_nc",
      "minor_nc",
    ].includes(
      findingType
    ) &&
    !failureStatement
  ) {
    throw new Error(
      "A nonconformity requires a clear failure statement."
    );
  }

  const {
    supabase,
    user,
    audit,
  } = await context(auditId);

  if (!audit.plan_approved) {
    throw new Error(
      "The audit plan must be approved before recording findings."
    );
  }

  if (requirementStandardId) {
    const { data: selectedStandard } = await supabase
      .from("internal_audit_selected_standards")
      .select("id")
      .eq("audit_id", auditId)
      .eq("standard_id", requirementStandardId)
      .eq("owner_id", user.id)
      .maybeSingle();
    if (!selectedStandard) {
      throw new Error("The selected requirement standard is not included in this audit.");
    }
  }

  const findingReference =
    `${audit.audit_reference}-${findingType.toUpperCase()}-${crypto.randomUUID()
      .slice(0, 4)
      .toUpperCase()}`;

  const isNonconformity = [
    "major_nc",
    "minor_nc",
  ].includes(findingType);

  const responsibleOwnerName = clean(
    formData.get("responsible_owner_name")
  );

  const responsibleOwnerEmail = clean(
    formData.get("responsible_owner_email")
  );

  const riskLevel = clean(
    formData.get("risk_level")
  ) ?? "medium";

  const evidenceFile = formData.get("evidence_file");
  const hasEvidenceFile = typeof File !== "undefined" && evidenceFile instanceof File && evidenceFile.size > 0;

  if (hasEvidenceFile && evidenceFile.size > MAX_FINDING_EVIDENCE_BYTES) {
    throw new Error("The evidence attachment exceeds the 10 MB file limit.");
  }
  if (hasEvidenceFile && !ALLOWED_FINDING_EVIDENCE_TYPES.has(evidenceFile.type)) {
    throw new Error("The evidence attachment file type is not accepted.");
  }

  const { data: finding, error } = await supabase
    .from(
      "internal_audit_findings"
    )
    .insert({
      owner_id:
        user.id,

      audit_id:
        auditId,

      answer_id:
        clean(
          formData.get(
            "answer_id"
          )
        ),

      finding_reference:
        findingReference,

      finding_type:
        findingType,

      title,

      criteria,

      requirement_source:
        requirementSource,

      requirement_standard_id:
        requirementStandardId,

      clause:
        clean(
          formData.get(
            "clause"
          )
        ),

      objective_evidence:
        objectiveEvidence,

      evidence_source:
        evidenceSource,

      failure_statement:
        failureStatement,

      positive_practice:
        clean(
          formData.get(
            "positive_practice"
          )
        ),

      process_area:
        clean(
          formData.get(
            "process_area"
          )
        ),

      responsible_owner_name:
        responsibleOwnerName,

      responsible_owner_email:
        responsibleOwnerEmail,

      responsible_owner_phone:
        clean(formData.get("responsible_owner_phone")),

      agreed_date:
        clean(formData.get("agreed_date")),

      risk_level:
        riskLevel,

      status:
        isNonconformity
          ? "response_due"
          : "issued",
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(
      error.message
    );
  }

  let evidenceStoragePath = null;
  if (hasEvidenceFile) {
    evidenceStoragePath = [
      user.id,
      auditId,
      "findings",
      finding.id,
      `${crypto.randomUUID()}-${safeEvidenceFileName(evidenceFile.name)}`,
    ].join("/");

    const { error: uploadError } = await supabase.storage
      .from(AUDIT_EVIDENCE_BUCKET)
      .upload(evidenceStoragePath, evidenceFile, {
        contentType: evidenceFile.type,
        upsert: false,
      });

    if (uploadError) {
      await supabase.from("internal_audit_findings").delete()
        .eq("id", finding.id).eq("owner_id", user.id);
      throw new Error(uploadError.message);
    }

    const { error: attachmentError } = await supabase
      .from("internal_audit_findings")
      .update({
        evidence_attachment_path: evidenceStoragePath,
        evidence_attachment_name: evidenceFile.name,
        evidence_attachment_type: evidenceFile.type,
        evidence_attachment_size: evidenceFile.size,
        updated_at: new Date().toISOString(),
      })
      .eq("id", finding.id)
      .eq("owner_id", user.id);

    if (attachmentError) {
      await supabase.storage.from(AUDIT_EVIDENCE_BUCKET).remove([evidenceStoragePath]);
      await supabase.from("internal_audit_findings").delete()
        .eq("id", finding.id).eq("owner_id", user.id);
      throw new Error(attachmentError.message);
    }
  }

  if (isNonconformity) {
    const rcaReference =
      `8D-${audit.audit_reference}-${crypto.randomUUID()
        .slice(0, 6)
        .toUpperCase()}`;

    const { data: rcaCase, error: rcaError } = await supabase
      .from("rca_cases")
      .insert({
        case_reference: rcaReference,
        owner_id: user.id,
        organization_id: audit.organization_id,
        method: "8d",
        source_type: "audit",
        title: `${findingReference} · ${title}`,
        problem_statement: failureStatement,
        severity: riskLevel,
        status: "draft",
        current_discipline: 0,
        sponsor_name: responsibleOwnerName,
        customer_or_stakeholder:
          audit.auditee_contact_name ||
          audit.auditee_contact_email,
        product_service_process:
          clean(formData.get("process_area")) ||
          audit.processes,
        location: audit.sites,
        detected_at: new Date().toISOString(),
        target_close_date:
          clean(formData.get("agreed_date")) ||
          clean(formData.get("corrective_action_due_date")) ||
          clean(formData.get("response_due_date")),
      })
      .select("id")
      .single();

    if (rcaError || !rcaCase) {
      if (evidenceStoragePath) {
        await supabase.storage.from(AUDIT_EVIDENCE_BUCKET).remove([evidenceStoragePath]);
      }
      await supabase
        .from("internal_audit_findings")
        .delete()
        .eq("id", finding.id)
        .eq("owner_id", user.id);

      throw new Error(
        rcaError?.message ||
        "Unable to create the linked 8D case."
      );
    }

    const { error: linkError } = await supabase
      .from("internal_audit_findings")
      .update({
        linked_rca_case_id: rcaCase.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", finding.id)
      .eq("owner_id", user.id);

    if (linkError) {
      throw new Error(linkError.message);
    }
  }

  await supabase
    .from("internal_audit_events")
    .insert({
      owner_id: user.id,
      audit_id: auditId,
      event_type: "finding_recorded",
      summary: `${findingReference} recorded`,
      event_data: {
        finding_id: finding.id,
        finding_type: findingType,
        rca_required: isNonconformity,
      },
      created_by: user.id,
    });

  returnTo(
    auditId,
    "fieldwork",
    "finding"
  );
}

export async function completeAuditFieldwork(
  formData
) {
  const auditId = clean(
    formData.get("audit_id")
  );

  if (
    !auditId ||
    formData.get(
      "fieldwork_confirmation"
    ) !== "on"
  ) {
    throw new Error(
      "Human fieldwork confirmation is required."
    );
  }

  const {
    supabase,
    user,
    audit,
  } = await context(auditId);

  if (!audit.plan_approved) {
    throw new Error(
      "The approved audit plan is required."
    );
  }

  const [
    answers,
    evidence,
  ] = await Promise.all([
    supabase
      .from(
        "internal_audit_answers"
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
      .neq(
        "result",
        "not_assessed"
      ),

    supabase
      .from(
        "internal_audit_evidence"
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
  ]);

  if (
    answers.error ||
    evidence.error
  ) {
    throw new Error(
      answers.error?.message ||
      evidence.error?.message
    );
  }

  if (
    (answers.count ?? 0) < 1 ||
    (evidence.count ?? 0) < 1
  ) {
    const missing = (answers.count ?? 0) < 1 && (evidence.count ?? 0) < 1
      ? "assessment_and_evidence"
      : (answers.count ?? 0) < 1
        ? "assessment"
        : "evidence";

    redirect(
      `/portal/internal-audits/${auditId}?gate=fieldwork&fieldwork_error=${missing}`
    );
  }

  const now =
    new Date().toISOString();

  const { error } = await supabase
    .from("internal_audits")
    .update({
      current_gate:
        "report",

      status:
        "report_draft",

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
    .from("internal_audit_events")
    .insert({
      owner_id:
        user.id,

      audit_id:
        auditId,

      event_type:
        "fieldwork_completed",

      summary:
        "Fieldwork completed; report gate unlocked",

      event_data: {
        assessed:
          answers.count,

        evidence:
          evidence.count,
      },

      created_by:
        user.id,
    });

  returnTo(
    auditId,
    "report"
  );
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
    actions.every((action) => action.effectiveness_result === "effective_verified" && action.status === "verified");
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
  const residualRisk = clean(formData.get("residual_risk"));
  const verificationMethod = clean(formData.get("effectiveness_verification_method"));
  const conclusion = clean(formData.get("effectiveness_verification_conclusion"));
  const allowedResults = ["effective_verified", "partially_effective", "not_effective", "unable_to_verify"];
  if (!auditId || !findingId || !accessId || !actionId || !allowedResults.includes(result) || !["low", "medium", "high", "critical"].includes(residualRisk) || !verificationMethod || !conclusion || formData.get("independent_verification") !== "on") {
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
  const { data: action, error: actionError } = await supabase.from("rca_actions").update({
    effectiveness_result: result,
    residual_risk: residualRisk,
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
  const allEffective = (selectedActions ?? []).length > 0 && (selectedActions ?? []).every((item) => item.effectiveness_result === "effective_verified");
  const { error: disciplineError } = await supabase.from("rca_8d_disciplines").update(allEffective ? {
    status: "approved", completion_score: 100, human_approved: true, approved_by: user.id, approved_at: now,
  } : { status: "in_progress", completion_score: 60, human_approved: false, approved_by: null, approved_at: null })
    .eq("case_id", finding.linked_rca_case_id).eq("owner_id", user.id).eq("discipline", 6);
  if (disciplineError) throw new Error(disciplineError.message);
  const { error: caseError } = await supabase.from("rca_cases").update({ current_discipline: allEffective ? 7 : 6, status: "active", updated_at: now })
    .eq("id", finding.linked_rca_case_id).eq("owner_id", user.id);
  if (caseError) throw new Error(caseError.message);
  const accessVerificationUpdate = allEffective ? {
    status: "verified_effective",
    effectiveness_result: "effective",
    verification_method: "Independent action-by-action D6 effectiveness verification",
    verification_evidence: "Every selected corrective action is recorded as Effective—verified against its linked objective evidence.",
    verified_at: now,
    verified_by: user.id,
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
    event_data: { action_id: action.id, finding_id: findingId, result, residual_risk: residualRisk, all_actions_effective: allEffective } });
  await supabase.from("internal_audit_events").insert({ owner_id: user.id, audit_id: auditId,
    event_type: "d6_action_effectiveness_decided", summary: `${finding.finding_reference}: ${action.title} — ${result.replaceAll("_", " ")}`,
    event_data: { finding_id: findingId, action_id: action.id, result, all_actions_effective: allEffective }, created_by: user.id });
  returnTo(auditId, "actions", "d6_verification");
}

export async function saveAuditReport(formData) {
  const auditId = clean(formData.get("audit_id"));
  if (!auditId) throw new Error("Audit reference is required.");
  const { supabase, user, audit } = await context(auditId);
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
      action.effectiveness_result === "effective_verified" &&
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
