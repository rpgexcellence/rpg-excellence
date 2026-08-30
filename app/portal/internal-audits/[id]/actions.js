"use server";

// RPG INTERNAL AUDIT PLAN GATE — NO SAMPLING APPROVAL DEPENDENCY — 2026-08-24

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "../../../../lib/supabase/server";

const clean = (value) =>
  typeof value === "string" && value.trim()
    ? value.trim()
    : null;

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
    throw new Error(
      "Assign a lead auditor before approving the team."
    );
  }

  if (
    team.some(
      (member) =>
        !member.competence_confirmed ||
        !member.independence_confirmed ||
        !member.confidentiality_confirmed
    )
  ) {
    throw new Error(
      "Confirm competence, independence and confidentiality for every team member."
    );
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
  const { data: availableQuestions, error: questionsError } = selectedStandardIds.length
    ? await supabase
        .from("internal_audit_questions")
        .select("id, question_code, process_area, standard_id")
        .in("standard_id", selectedStandardIds)
        .eq("active", true)
    : { data: [], error: null };

  if (questionsError) {
    throw new Error(questionsError.message);
  }

  const selectedScopeNames = String(audit.processes ?? "")
    .split(/[,;\n]+/)
    .map((value) => value.trim().toLocaleLowerCase("en-GB"))
    .filter(Boolean);

  const scopedQuestions = (availableQuestions ?? []).filter((question) => {
    if (selectedScopeNames.length === 0) return true;
    return selectedScopeNames.includes(String(question.process_area ?? "").toLocaleLowerCase("en-GB"));
  });

  const questionCoverage = { count: scopedQuestions.length };

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
    throw new Error(
      "A not-applicable conclusion requires justification."
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
    !objectiveEvidence
  ) {
    throw new Error(
      "Finding type, title, criteria and objective evidence are required."
    );
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

      clause:
        clean(
          formData.get(
            "clause"
          )
        ),

      objective_evidence:
        objectiveEvidence,

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
          clean(formData.get("corrective_action_due_date")) ||
          clean(formData.get("response_due_date")),
      })
      .select("id")
      .single();

    if (rcaError || !rcaCase) {
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
    throw new Error(
      "Record at least one assessed criterion and one item of objective evidence before closing fieldwork."
    );
  }

  const now =
    new Date().toISOString();

  const { error } = await supabase
    .from("internal_audits")
    .update({
      current_gate:
        "closing",

      status:
        "closing_review",

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
        "Fieldwork completed; close gate unlocked",

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
    "closing"
  );
}

export async function verifyAuditFindingEffectiveness(
  formData
) {
  const auditId = clean(formData.get("audit_id"));
  const findingId = clean(formData.get("finding_id"));
  const result = clean(formData.get("effectiveness_result"));
  const conclusion = clean(formData.get("effectiveness_conclusion"));

  if (
    !auditId ||
    !findingId ||
    !["effective", "partially_effective", "ineffective"].includes(result) ||
    !conclusion ||
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
      .select("id, status")
      .eq("case_id", finding.linked_rca_case_id)
      .eq("owner_id", user.id),
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
    actions.every((action) =>
      ["completed", "verified"].includes(action.status)
    );
  const rcaAtEffectivenessGate =
    Number(rcaResult.data.current_discipline) >= 8 ||
    ["effectiveness_review", "closed"].includes(rcaResult.data.status);

  if (
    result === "effective" &&
    (!allActionsComplete || !rcaAtEffectivenessGate)
  ) {
    throw new Error(
      "The 8D must reach effectiveness review and all corrective actions must be completed or verified before the nonconformity can close."
    );
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

export async function completeAuditClosure(formData) {
  const auditId = clean(formData.get("audit_id"));

  if (
    !auditId ||
    formData.get("closure_confirmation") !== "on"
  ) {
    throw new Error("Human audit closure confirmation is required.");
  }

  const { supabase, user } = await context(auditId);

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
    throw new Error(
      `Close and verify CAPA effectiveness for: ${unresolved
        .map((finding) => finding.finding_reference)
        .join(", ")}.`
    );
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
