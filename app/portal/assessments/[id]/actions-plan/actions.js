"use server";

import {
  revalidatePath,
} from "next/cache";

import {
  redirect,
} from "next/navigation";

import {
  createClient,
} from "../../../../../lib/supabase/server";

import {
  createAdminClient,
} from "../../../../../lib/supabase/admin";

const PRIORITIES = [
  "Critical",
  "High",
  "Medium",
  "Low",
];

const STATUSES = [
  "open",
  "in_progress",
  "at_risk",
  "verification",
  "completed",
];

const clean = (value) =>
  typeof value === "string" &&
  value.trim()
    ? value.trim()
    : null;

export async function updateManagementAction(
  formData
) {
  const supabase =
    await createClient();

  const {
    data: { user },
  } =
    await supabase.auth.getUser();

  if (!user) {
    redirect("/portal/login");
  }

  const assessmentId =
    formData.get(
      "assessment_id"
    );

  const findingId =
    formData.get(
      "finding_id"
    );

  const priority =
    formData.get(
      "priority"
    );

  const status =
    formData.get(
      "status"
    );

  if (
    typeof assessmentId !==
      "string" ||
    typeof findingId !==
      "string" ||
    typeof priority !==
      "string" ||
    typeof status !==
      "string" ||
    !PRIORITIES.includes(
      priority
    ) ||
    !STATUSES.includes(
      status
    )
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
    .select("id")
    .eq(
      "id",
      assessmentId
    )
    .eq(
      "owner_id",
      user.id
    )
    .single();

  if (
    assessmentError ||
    !assessment
  ) {
    throw new Error(
      "Assessment not found."
    );
  }

  const admin =
    createAdminClient();

  const {
    data: finding,
    error: findingError,
  } = await admin
    .from(
      "assessment_findings"
    )
    .select(
      "id, finding_type"
    )
    .eq(
      "id",
      findingId
    )
    .eq(
      "assessment_id",
      assessmentId
    )
    .eq(
      "owner_id",
      user.id
    )
    .single();

  if (
    findingError ||
    !finding ||
    finding.finding_type ===
      "conformity"
  ) {
    throw new Error(
      "Finding not found."
    );
  }

  /*
   * The form field is called finding_id,
   * but the database column on
   * management_action_plan is
   * related_finding_id.
   */
  const payload = {
    assessment_id:
      assessmentId,

    related_finding_id:
      findingId,

    owner_id:
      user.id,

    priority,

    action_required:
      clean(
        formData.get(
          "action_required"
        )
      ),

    action_owner:
      clean(
        formData.get(
          "action_owner"
        )
      ),

    target_date:
      clean(
        formData.get(
          "target_date"
        )
      ),

    resource_decision:
      clean(
        formData.get(
          "resource_decision"
        )
      ),

    management_commentary:
      clean(
        formData.get(
          "management_commentary"
        )
      ),

    verification_evidence:
      clean(
        formData.get(
          "verification_evidence"
        )
      ),

    status,

    updated_at:
      new Date().toISOString(),
  };

  const {
    data: existing,
    error: existingError,
  } = await admin
    .from(
      "management_action_plan"
    )
    .select("id")
    .eq(
      "assessment_id",
      assessmentId
    )
    .eq(
      "related_finding_id",
      findingId
    )
    .eq(
      "owner_id",
      user.id
    )
    .limit(1)
    .maybeSingle();

  if (existingError) {
    throw new Error(
      existingError.message
    );
  }

  if (existing) {
    const {
      error,
    } = await admin
      .from(
        "management_action_plan"
      )
      .update(payload)
      .eq(
        "id",
        existing.id
      )
      .eq(
        "owner_id",
        user.id
      );

    if (error) {
      throw new Error(
        error.message
      );
    }
  } else {
    const {
      error,
    } = await admin
      .from(
        "management_action_plan"
      )
      .insert(payload);

    if (error) {
      throw new Error(
        error.message
      );
    }
  }

  /*
   * Keep the underlying formal finding
   * synchronised with management progress.
   */
  const findingStatus =
    status === "completed"
      ? "closed"
      : status ===
          "verification"
        ? "verification"
        : [
            "in_progress",
            "at_risk",
          ].includes(
            status
          )
          ? "action_in_progress"
          : "open";

  const {
    error: syncError,
  } = await admin
    .from(
      "assessment_findings"
    )
    .update({
      status:
        findingStatus,

      updated_at:
        new Date().toISOString(),
    })
    .eq(
      "id",
      findingId
    )
    .eq(
      "assessment_id",
      assessmentId
    )
    .eq(
      "owner_id",
      user.id
    );

  if (syncError) {
    throw new Error(
      syncError.message
    );
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
