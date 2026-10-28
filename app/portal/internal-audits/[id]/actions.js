"use server";

// RPG INTERNAL AUDIT PLAN GATE — NO SAMPLING APPROVAL DEPENDENCY — 2026-08-24

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { randomUUID } from "node:crypto";

import { createClient } from "../../../../lib/supabase/server";
import { buildAuditFieldworkScope, buildAuditFieldworkCoverage, readCompleteAuditRows, auditClauseMatches, parseAuditClauseScope, auditClauseScopesOverlap, auditReferenceBankCandidates, resolveAuditReferenceBank } from "../../../../lib/nonconformity-reporting.mjs";
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
  if(audit.status==='closed')throw new Error('A closed audit requires a controlled revision before its plan can be reopened.');

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
// Prefer the explicit catalogue edition. A same-base-edition bank may be used
// only with a separately recorded human review of the catalogue amendment.
function auditReferenceBankNames(selection) {
  return auditReferenceBankCandidates(selection).names;
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
  // Scope overlap attaches relevant guidance; coverage completeness is still
  // checked separately by the shared engine's stricter child-clause guard.
  const refMatches=(a,b)=>auditClauseScopesOverlap(a,b);
  const effectiveClause=link=>{
    const question=bank.get(link.question_id),mapped=clean(link.clause);
    const native=question?.standard_id===link.standard_id?clean(question.clause):null;
    const m=parseAuditClauseScope(mapped),n=parseAuditClauseScope(native);
    return mapped&&native&&m.selectors.length===1&&!m.selectors[0].end&&!m.invalid.length&&
      n.selectors.length===1&&!n.selectors[0].end&&!n.invalid.length&&auditClauseMatches(native,m.selectors[0])
      ?native:mapped||native;
  };
  for(const selection of selectedStandards){
    const resolution=resolveAuditReferenceBank(selection,[...new Set(assessmentQuestions.map(row=>row.standard))]);
    const {names}=resolution;
    referenceBanks.push({standardId:selection.standard_id,...resolution,
      amendmentReviewConfirmed:resolution.amendmentReviewRequired===true&&options.amendmentReviewConfirmed===true});
    if(resolution.status!=='available')continue;
    for(const reference of assessmentQuestions.filter(row=>row.standard===names[0])){
      const clause=clean(reference.clause_reference)||clean(reference.question_number);
      if(!clause)continue;
      const matches=links.filter(link=>link.standard_id===selection.standard_id&&
        refMatches(effectiveClause(link),clause));
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
  for(const reference of referenceBanks.filter(row=>row.status==='available'&&row.amendmentReviewRequired)){
    scope.issues.push({code:'assessment_amendment_review_required',standardId:reference.standardId,blocking:false,
      message:'The stored reference bank covers the same base edition. The lead auditor must review the catalogue amendment, record the supporting evidence and explicitly confirm that review before completing Fieldwork.',
      details:reference.names});
  }
  scope.scopeReady=scope.questions.length>0&&!scope.issues.some(item=>item.blocking);
  scope.questions=scope.questions.map(question=>({...question,assessment_guidance:guidanceByQuestion[question.id]||[]}));
  const coverage=buildAuditFieldworkCoverage({scope,answers,evidence,findings,auditId:audit.id,ownerId:user.id,organizationId:audit.organization_id});
  return {auditId:audit.id,ownerId:user.id,organizationId:audit.organization_id,scope,coverage,selectedStandards,selectedProcesses,referenceBanks,answers,evidence,findings};
}


// Legacy entry points retain their exports for existing links, but never mutate
// findings, owner credentials or CAPA records outside the canonical workspace.
async function openControlledAuditFinding(formData) {
  const auditId=clean(formData.get('audit_id'));
  if(!auditId)throw new Error('Audit reference is required.');
  const {supabase,user,audit}=await context(auditId);
  let findingId=clean(formData.get('finding_id'));
  if(!findingId){
    const accessId=clean(formData.get('action_access_id'));
    if(!accessId)throw new Error('A controlled finding reference is required.');
    const {data:access,error}=await supabase.from('internal_audit_action_access').select('finding_id')
      .eq('id',accessId).eq('audit_id',audit.id).eq('owner_id',user.id).maybeSingle();
    if(error||!access?.finding_id)throw new Error('The linked owner response is unavailable.');
    findingId=access.finding_id;
  }
  const {data:finding,error}=await supabase.from('internal_audit_findings')
    .select('id,organization_id').eq('id',findingId).eq('owner_id',user.id)
    .or(`audit_id.eq.${audit.id},source_audit_id.eq.${audit.id}`).maybeSingle();
  if(error||!finding||(finding.organization_id&&finding.organization_id!==audit.organization_id))
    throw new Error('The controlled finding does not belong to this audit and company.');
  redirect(`/portal/internal-audit-actions?record=${encodeURIComponent(finding.id)}`);
}

function requireOpenFieldwork(audit) {
  if(audit.status==='closed'||audit.current_gate!=='fieldwork'||!audit.plan_approved)
    throw new Error('Only approved, open Fieldwork can be amended. Reopen the audit through its controlled planning and approval process first.');
}

async function requireReportCoverage(supabase,user,audit) {
  if(audit.status==='closed')throw new Error('The audit is closed. A controlled revision is required before changing or issuing its report.');
  if(!audit.scope_approved||!audit.plan_approved||!['report','actions','closing'].includes(audit.current_gate))
    throw new Error('Complete the approved Fieldwork coverage review before preparing, approving or issuing the audit report.');
  const {data:review,error}=await supabase.from('internal_audit_events').select('id,event_data,created_at')
    .eq('audit_id',audit.id).eq('owner_id',user.id).eq('event_type','fieldwork_coverage_reviewed')
    .order('created_at',{ascending:false}).limit(1).maybeSingle();
  if(error)throw new Error('The saved Fieldwork review could not be checked. Report progression remains locked.');
  if(review?.event_data?.human_scope_review!==true)
    throw new Error('A saved human Fieldwork coverage review is required. Open Plan, reapprove it to reopen Fieldwork, then complete the criterion-inventory review. Existing answers and findings are retained.');
  const state=await loadAuditFieldworkState(supabase,user,audit,{referenceInventoryReviewed:true});
  const savedBanks=Array.isArray(review.event_data?.reference_banks)?review.event_data.reference_banks:[];
  for(const current of state.referenceBanks.filter(row=>row.status==='available')){
    const saved=savedBanks.find(row=>row.standardId===current.standardId);
    if(!saved||JSON.stringify(saved.names)!==JSON.stringify(current.names))
      throw new Error('The controlled reference bank changed or its saved review is missing. Reopen Fieldwork through Plan approval and complete the current criterion-inventory review.');
    if(current.amendmentReviewRequired&&
      (saved.amendmentReviewConfirmed!==true||String(review.event_data.amendment_review_note||'').trim().length<20))
      throw new Error('The selected amendment needs an explicit lead-auditor review with supporting evidence. Reopen Fieldwork through Plan approval and record the amendment review before report progression.');
  }
  if(!state.coverage.canCompleteFieldwork)
    throw new Error('Current audit coverage is incomplete or has unresolved criterion mappings. Reopen Fieldwork through Plan approval, resolve the highlighted items and complete the coverage review.');
  return state;
}

async function requireAuditRowsUpdated(query,message) {
  const {data,error}=await query.select('id');
  if(error)throw new Error(error.message);
  if(!data?.length)throw new Error(message);
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

  requireOpenFieldwork(audit);

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

  requireOpenFieldwork(audit);

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
  return openControlledAuditFinding(formData);
}

export async function addAuditFinding(formData) {
  return openAuditFinding(formData);
}

export async function completeAuditFieldwork(formData) {
  const auditId=clean(formData.get('audit_id'));
  if(!auditId||formData.get('fieldwork_confirmation')!=='on')throw new Error('Human fieldwork completion and criterion-inventory review are required.');
  const {supabase,user,audit}=await context(auditId);
  if(!audit.plan_approved||audit.current_gate!=='fieldwork'||audit.status==='closed')throw new Error('Approved, open fieldwork is required.');
  const amendmentConfirmed=formData.get('amendment_confirmation')==='on';
  const amendmentNote=clean(formData.get('amendment_review_note'));
  const state=await loadAuditFieldworkState(supabase,user,audit,{referenceInventoryReviewed:true,amendmentReviewConfirmed:amendmentConfirmed});
  const amendmentRequired=state.referenceBanks.some(row=>row.status==='available'&&row.amendmentReviewRequired);
  if(amendmentRequired&&(!amendmentConfirmed||!amendmentNote||amendmentNote.length<20||amendmentNote.length>2000))
    throw new Error('Review the applicable amendment and record its supporting evidence (20 to 2,000 characters), then explicitly confirm the amendment review before completing Fieldwork.');
  if(!state.coverage.canCompleteFieldwork){
    const reason=!state.scope.scopeReady?'scope_coverage':'outstanding_questions';
    redirect(`/portal/internal-audits/${auditId}?gate=fieldwork&fieldwork_error=${reason}#fieldwork-requirements`);
  }
  const now=new Date().toISOString();
  const {error:eventError}=await supabase.from('internal_audit_events').insert({owner_id:user.id,audit_id:auditId,
    event_type:'fieldwork_coverage_reviewed',summary:'Human fieldwork scope and evidence review recorded',
    event_data:{required:state.coverage.required,accounted_for:state.coverage.accountedFor,
      justified_not_applicable:state.coverage.justifiedNotApplicable,controlled_findings:state.coverage.linkedFindingCount,
      reference_banks:state.referenceBanks,human_scope_review:true,
      amendment_review_note:amendmentRequired?amendmentNote:null},created_by:user.id});
  if(eventError)throw new Error('The fieldwork review history could not be recorded. The report gate remains locked.');
  const {data:advanced,error}=await supabase.from('internal_audits').update({current_gate:'report',status:'report_draft',updated_at:now})
    .eq('id',auditId).eq('owner_id',user.id).eq('current_gate','fieldwork').eq('plan_approved',true).neq('status','closed').select('id');
  if(error)throw new Error(error.message);
  if(!advanced?.length)throw new Error('The audit changed during the review. Refresh Fieldwork before continuing.');
  returnTo(auditId,'report');
}

export async function verifyAuditFindingEffectiveness(formData) {
  return openControlledAuditFinding(formData);
}

export async function verifyD6CorrectiveAction(formData) {
  return openControlledAuditFinding(formData);
}

export async function saveAuditReport(formData) {
  const auditId = clean(formData.get("audit_id"));
  if (!auditId) throw new Error("Audit reference is required.");
  const { supabase, user, audit } = await context(auditId);
  await requireReportCoverage(supabase,user,audit);

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
  await requireAuditRowsUpdated(supabase.from('internal_audits').update({
    current_gate:'report',status:'report_draft',updated_at:new Date().toISOString(),
  }).eq('id',auditId).eq('owner_id',user.id).eq('current_gate',audit.current_gate).eq('status',audit.status),
    'The audit changed while saving the report. Refresh and review the current audit stage.');
  returnTo(auditId, "report", "report");
}

export async function generateAuditReportGuidedDraft(formData) {
  const auditId = clean(formData.get("audit_id"));
  const replaceExisting = formData.get("replace_existing") === "on";
  if (!auditId) throw new Error("Audit reference is required.");
  const { supabase, user, audit } = await context(auditId);
  const fieldwork=await requireReportCoverage(supabase,user,audit);

  const [reportResult,team]=await Promise.all([
    supabase.from('internal_audit_report_controls').select('*').eq('audit_id',auditId).eq('owner_id',user.id).maybeSingle(),
    readCompleteAuditRows(()=>supabase.from('internal_audit_team_members').select('id,member_name,audit_role')
      .eq('audit_id',auditId).eq('owner_id',user.id),{label:'Audit report team'}),
  ]);
  if(reportResult.error)throw new Error(reportResult.error.message);
  const answers=fieldwork.coverage.rows.map(row=>({...row.answer,result:row.displayResult,
    internal_audit_questions:row.question}));
  const findings=[...new Map(fieldwork.findings.filter(finding=>(!finding.organization_id||finding.organization_id===audit.organization_id)&&
    ['major_nc','minor_nc','observation','ofi'].includes(finding.finding_type)&&
    !['draft','device_draft','pending_submission','withdrawn','cancelled','canceled','deleted','void'].includes(finding.status)).map(finding=>[finding.id,finding])).values()];
  const evidence=fieldwork.evidence;
  const tally = (records, field, value) => records.filter((record) => record[field] === value).length;
  const assessed = fieldwork.coverage.accountedFor;
  const conformity = tally(answers, "result", "conformity");
  const major = tally(findings, "finding_type", "major_nc");
  const minor = tally(findings, "finding_type", "minor_nc");
  const observations = tally(findings, "finding_type", "observation");
  const opportunities = tally(findings, "finding_type", "ofi");
  const positives = tally(answers, "result", "positive_practice");
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
    report_version: existing?.status==='issued'?(existing.report_version||1)+1:existing?.report_version||1,
    executive_summary: choose("executive_summary"),
    methodology_and_sampling: choose("methodology_and_sampling"),
    limitations_and_exclusions: choose("limitations_and_exclusions"),
    unresolved_differences: existing?.unresolved_differences || null,
    overall_conclusion: choose("overall_conclusion"),
    confidentiality_classification: existing?.confidentiality_classification || "controlled",
    distribution_list: existing?.distribution_list || null,
    lead_auditor_name: existing?.lead_auditor_name || team.find((member) => member.audit_role === "lead_auditor")?.member_name || null,
    status: "draft", approved_at: null, approved_by: null, issued_at: null, issued_by: null,
    updated_at: new Date().toISOString(),
  };
  const { error: saveError } = await supabase.from("internal_audit_report_controls").upsert(payload, { onConflict: "audit_id" });
  if (saveError) throw new Error(saveError.message);
  await requireAuditRowsUpdated(supabase.from('internal_audits').update({
    current_gate:'report',status:'report_draft',updated_at:new Date().toISOString(),
  }).eq('id',auditId).eq('owner_id',user.id).eq('current_gate',audit.current_gate).eq('status',audit.status),
    'The audit changed while generating the report. Refresh and review the current audit stage.');
  await supabase.from("internal_audit_events").insert({ owner_id: user.id, audit_id: auditId, event_type: "report_guided_draft_generated", summary: "Guided report narrative generated from the controlled audit record", event_data: { replaced_existing: replaceExisting, assessed_criteria: assessed, evidence_records: evidence.length, findings: findings.length }, created_by: user.id });
  revalidatePath(`/portal/internal-audits/${auditId}`);
  redirect(`/portal/internal-audits/${auditId}?gate=report&saved=guided_draft`);
}

export async function approveAuditReport(formData) {
  const auditId = clean(formData.get("audit_id"));
  if (!auditId || formData.get("report_approval_confirmation") !== "on") {
    throw new Error("Lead-auditor report approval is required.");
  }
  const { supabase, user, audit } = await context(auditId);
  await requireReportCoverage(supabase,user,audit);
  const { data: report, error: reportError } = await supabase.from("internal_audit_report_controls")
    .select("id, status, report_version, updated_at, executive_summary, overall_conclusion, lead_auditor_name")
    .eq("audit_id", auditId).eq("owner_id", user.id).maybeSingle();
  if (reportError) throw new Error(reportError.message);
  if (!report?.executive_summary || !report?.overall_conclusion || !report?.lead_auditor_name) {
    redirect(`/portal/internal-audits/${auditId}?gate=report&report_error=incomplete`);
  }
  const now = new Date().toISOString();
  if(report.status!=='draft')throw new Error('Save a current report draft before approving it. An issued report requires a new controlled version.');
  await requireAuditRowsUpdated(supabase.from('internal_audit_report_controls').update({
    status:'approved',approved_at:now,approved_by:user.id,updated_at:now,
  }).eq('id',report.id).eq('owner_id',user.id).eq('status','draft').eq('report_version',report.report_version)
    .eq('updated_at',report.updated_at),'The report changed during approval. Refresh and review it again.');
  await requireAuditRowsUpdated(supabase.from('internal_audits').update({current_gate:'actions',status:'report_approved',updated_at:now})
    .eq('id',auditId).eq('owner_id',user.id).eq('current_gate',audit.current_gate).eq('status',audit.status)
    .eq('plan_approved',true),'The audit changed during report approval. Refresh before proceeding.');
  returnTo(auditId, "actions", "report_approved");
}

export async function issueAuditReport(formData) {
  const auditId = clean(formData.get("audit_id"));
  if (!auditId) throw new Error("Audit reference is required.");
  const { supabase, user, audit } = await context(auditId);
  await requireReportCoverage(supabase,user,audit);
  const { data: report, error: reportReadError } = await supabase.from("internal_audit_report_controls")
    .select("id, status, report_version, updated_at").eq("audit_id", auditId).eq("owner_id", user.id).maybeSingle();
  if (reportReadError) throw new Error(reportReadError.message);
  if (!report || !["approved", "issued"].includes(report.status)) {
    redirect(`/portal/internal-audits/${auditId}?gate=report&report_error=approval_required`);
  }
  if(!['report_approved','capa_monitoring','effectiveness_review'].includes(audit.status))
    throw new Error('The current audit report must be approved before issue.');
  if(report.status==='issued')returnTo(auditId,'actions','report_already_issued');
  const now=new Date().toISOString();
  await requireAuditRowsUpdated(supabase.from('internal_audit_report_controls').update({
    status:'issued',issued_at:now,issued_by:user.id,updated_at:now,
  }).eq('id',report.id).eq('owner_id',user.id).eq('status','approved').eq('report_version',report.report_version)
    .eq('updated_at',report.updated_at),'The approved report changed before issue. Refresh and review the current version.');
  await requireAuditRowsUpdated(supabase.from('internal_audits').update({current_gate:'actions',status:'capa_monitoring',updated_at:now})
    .eq('id',auditId).eq('owner_id',user.id).eq('current_gate',audit.current_gate).eq('status',audit.status)
    .eq('plan_approved',true),'The audit changed during report issue. Refresh before proceeding.');
  returnTo(auditId, "actions", "report_issued");
}

export async function assignAuditActionOwner(formData) {
  return openControlledAuditFinding(formData);
}

export async function reviewAuditActionResponse(formData) {
  return openControlledAuditFinding(formData);
}

export async function completeAuditClosure(formData) {
  const auditId = clean(formData.get("audit_id"));

  if (
    !auditId ||
    formData.get("closure_confirmation") !== "on"
  ) {
    throw new Error("Human audit closure confirmation is required.");
  }

  const { supabase, user, audit } = await context(auditId);
  await requireReportCoverage(supabase,user,audit);

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

  const findings=await readCompleteAuditRows(()=>supabase.from('internal_audit_findings')
    .select('id,finding_reference,linked_rca_case_id,closure_verified,status')
    .or(`audit_id.eq.${auditId},source_audit_id.eq.${auditId}`).eq('owner_id',user.id)
    .in('finding_type',['major_nc','minor_nc']),{label:'Audit nonconformity closure checks'});

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
