"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "../../../../../lib/supabase/server";
import { createAdminClient } from "../../../../../lib/supabase/admin";

const PRIORITIES = [
  "critical",
  "high",
  "medium",
  "low",
];

const STATUSES = [
  "open",
  "in_progress",
  "completed",
  "verified",
];

const clean = (value) =>
  typeof value === "string" &&
  value.trim()
    ? value.trim()
    : null;

function labelFor(type) {
  return (
    {
      major_nc: "Major NC",
      minor_nc: "Minor NC",
      observation: "Observation",
      ofi: "OFI",
    }[type] ?? "Finding"
  );
}

function progressFor(status) {
  switch (status) {
    case "verified":
      return 100;

    case "completed":
      return 90;

    case "in_progress":
      return 50;

    default:
      return 0;
  }
}

export async function updateManagementAction(
  formData
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/portal/login");
  }

  const assessmentId =
    formData.get("assessment_id");

  const findingId =
    formData.get("finding_id");

  const rawPriority =
    formData.get("priority");

  const priority =
    typeof rawPriority === "string"
      ? rawPriority.toLowerCase()
      : rawPriority;

  const status =
    formData.get("status");

  if (
    typeof assessmentId !== "string" ||
    typeof findingId !== "string" ||
    typeof priority !== "string" ||
    typeof status !== "string" ||
    !PRIORITIES.includes(priority) ||
    !STATUSES.includes(status)
  ) {
    throw new Error(
      "Invalid management action."
    );
  }

  const {
    data: assessment,
    error: assessmentError,
  } = await supabase
    .from("assessments")
    .select("id, standard")
    .eq("id", assessmentId)
    .eq("owner_id", user.id)
    .single();

  if (assessmentError || !assessment) {
    throw new Error(
      "Assessment not found."
    );
  }

  const admin = createAdminClient();

  const {
    data: finding,
    error: findingError,
  } = await admin
    .from("assessment_findings")
    .select(
      `
        id,
        finding_type,
        question_number,
        clause,
        finding_statement,
        requirement_summary,
        status
      `
    )
    .eq("id", findingId)
    .eq("assessment_id", assessmentId)
    .eq("owner_id", user.id)
    .single();

  if (
    findingError ||
    !finding ||
    finding.finding_type === "conformity"
  ) {
    throw new Error(
      "Finding not found."
    );
  }

  const actionRequired = clean(
    formData.get("action_required")
  );

  const actionTitle =
    `${
      finding.question_number ?? "Finding"
    } - ${labelFor(finding.finding_type)}`;

  const now = new Date().toISOString();

  const payload = {
    assessment_id: assessmentId,
    owner_id: user.id,
    standard: assessment.standard,
    priority,
    action_title: actionTitle,
    action_description: actionRequired,
    related_clause: finding.clause ?? null,
    related_finding_id: findingId,
    action_owner: clean(
      formData.get("action_owner")
    ),
    target_date: clean(
      formData.get("target_date")
    ),
    progress: progressFor(status),
    resource_decision: clean(
      formData.get("resource_decision")
    ),
    management_commentary: clean(
      formData.get("management_commentary")
    ),
    verification_evidence: clean(
      formData.get("verification_evidence")
    ),
    status,
    updated_at: now,
  };

  const {
    data: existing,
    error: existingError,
  } = await admin
    .from("management_action_plan")
    .select("id")
    .eq("assessment_id", assessmentId)
    .eq("related_finding_id", findingId)
    .eq("owner_id", user.id)
    .limit(1)
    .maybeSingle();

  if (existingError) {
    throw new Error(existingError.message);
  }

  if (existing) {
    const { error } = await admin
      .from("management_action_plan")
      .update(payload)
      .eq("id", existing.id)
      .eq("owner_id", user.id);

    if (error) {
      throw new Error(error.message);
    }
  } else {
    const { error } = await admin
      .from("management_action_plan")
      .insert(payload);

    if (error) {
      throw new Error(error.message);
    }
  }

  /*
   * Completing or verifying a management
   * action moves the finding to verification;
   * it does not formally close the finding.
   */
  const findingStatus =
    status === "completed" ||
    status === "verified"
      ? "verification"
      : status === "in_progress"
        ? "action_in_progress"
        : "open";

  if (finding.status !== "closed") {
    const { error: syncError } = await admin
      .from("assessment_findings")
      .update({
        status: findingStatus,
        updated_at: now,
      })
      .eq("id", findingId)
      .eq("assessment_id", assessmentId)
      .eq("owner_id", user.id);

    if (syncError) {
      throw new Error(syncError.message);
    }
  }

  revalidatePath(
    `/portal/assessments/${assessmentId}/actions-plan`
  );

  revalidatePath(
    `/portal/assessments/${assessmentId}/findings`
  );

  revalidatePath(
    `/portal/assessments/${assessmentId}/summary`
  );

  revalidatePath(
    `/portal/assessments/${assessmentId}/readiness`
  );

  redirect(
    `/portal/assessments/${assessmentId}/actions-plan`
  );
}
