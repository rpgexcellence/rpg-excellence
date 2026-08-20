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

const FINDING_STATUSES = [
  "open",
  "action_in_progress",
  "verification",
  "closed",
];

const ACTION_STATUSES = [
  "open",
  "in_progress",
  "awaiting_verification",
  "effective",
  "closed",
];

function cleanText(value) {
  if (
    typeof value !== "string" ||
    value.trim() === ""
  ) {
    return null;
  }

  return value.trim();
}

function cleanDate(value) {
  if (
    typeof value !== "string" ||
    value.trim() === ""
  ) {
    return null;
  }

  return value.trim();
}

async function getOwnedAssessment({
  assessmentId,
  userId,
}) {
  const supabase =
    await createClient();

  const {
    data: assessment,
    error,
  } = await supabase
    .from("assessments")
    .select("id, standard")
    .eq(
      "id",
      assessmentId
    )
    .eq(
      "owner_id",
      userId
    )
    .single();

  if (
    error ||
    !assessment
  ) {
    throw new Error(
      "Assessment not found."
    );
  }

  return assessment;
}

export async function updateFindingStatus(
  formData
) {
  const supabase =
    await createClient();

  const {
    data: { user },
  } =
    await supabase.auth.getUser();

  if (!user) {
    redirect(
      "/portal/login"
    );
  }

  const assessmentId =
    formData.get(
      "assessment_id"
    );

  const findingId =
    formData.get(
      "finding_id"
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
    typeof status !==
      "string" ||
    !FINDING_STATUSES.includes(
      status
    )
  ) {
    throw new Error(
      "Invalid finding update."
    );
  }

  await getOwnedAssessment({
    assessmentId,
    userId: user.id,
  });

  const admin =
    createAdminClient();

  /*
   * Formal finding closure is controlled.
   *
   * A finding may only be closed when the
   * latest corrective action:
   *
   * 1. is marked effective;
   * 2. contains verification evidence; and
   * 3. contains an effectiveness review.
   */
  if (status === "closed") {
    const {
      data: correctiveAction,
      error: correctiveError,
    } = await admin
      .from(
        "corrective_actions"
      )
      .select(
        `
          id,
          status,
          verification_evidence,
          effectiveness_review
        `
      )
      .eq(
        "assessment_id",
        assessmentId
      )
      .eq(
        "finding_id",
        findingId
      )
      .eq(
        "owner_id",
        user.id
      )
      .order(
        "created_at",
        {
          ascending: false,
        }
      )
      .limit(1)
      .maybeSingle();

    if (correctiveError) {
      throw new Error(
        correctiveError.message
      );
    }

    if (!correctiveAction) {
      throw new Error(
        "A corrective action is required before this finding can be closed."
      );
    }

    if (
      correctiveAction.status !==
      "effective"
    ) {
      throw new Error(
        "Corrective action effectiveness must be confirmed before the finding can be closed."
      );
    }

    if (
      !cleanText(
        correctiveAction
          .verification_evidence
      )
    ) {
      throw new Error(
        "Verification evidence is required before the finding can be closed."
      );
    }

    if (
      !cleanText(
        correctiveAction
          .effectiveness_review
      )
    ) {
      throw new Error(
        "An effectiveness review is required before the finding can be closed."
      );
    }
  }

  const {
    error,
  } = await admin
    .from(
      "assessment_findings"
    )
    .update({
      status,
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

  if (error) {
    throw new Error(
      error.message
    );
  }

  revalidatePath(
    `/portal/assessments/${assessmentId}/findings`
  );

  revalidatePath(
    `/portal/assessments/${assessmentId}/actions-plan`
  );

  revalidatePath(
    `/portal/assessments/${assessmentId}/summary`
  );

  revalidatePath(
    `/portal/assessments/${assessmentId}/readiness`
  );
}

export async function updateCorrectiveAction(
  formData
) {
  const supabase =
    await createClient();

  const {
    data: { user },
  } =
    await supabase.auth.getUser();

  if (!user) {
    redirect(
      "/portal/login"
    );
  }

  const assessmentId =
    formData.get(
      "assessment_id"
    );

  const findingId =
    formData.get(
      "finding_id"
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
    typeof status !==
      "string" ||
    !ACTION_STATUSES.includes(
      status
    )
  ) {
    throw new Error(
      "Invalid corrective action update."
    );
  }

  await getOwnedAssessment({
    assessmentId,
    userId: user.id,
  });

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
      "id, status"
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
    !finding
  ) {
    throw new Error(
      "Finding not found."
    );
  }

  const verificationEvidence =
    cleanText(
      formData.get(
        "verification_evidence"
      )
    );

  const effectivenessReview =
    cleanText(
      formData.get(
        "effectiveness_review"
      )
    );

  /*
   * "effective" means the corrective action
   * has passed effectiveness review.
   *
   * It does NOT automatically close the
   * formal finding.
   */
  if (
    status === "effective"
  ) {
    if (
      !verificationEvidence
    ) {
      throw new Error(
        "Verification evidence is required before a corrective action can be marked effective."
      );
    }

    if (
      !effectivenessReview
    ) {
      throw new Error(
        "An effectiveness review is required before a corrective action can be marked effective."
      );
    }
  }

  /*
   * Do not use corrective-action status
   * "closed" to bypass formal finding closure.
   *
   * Treat it as verification/effectiveness
   * complete; formal closure still occurs
   * through updateFindingStatus().
   */
  const controlledActionStatus =
    status === "closed"
      ? "effective"
      : status;

  const payload = {
    assessment_id:
      assessmentId,

    finding_id:
      findingId,

    owner_id:
      user.id,

    correction:
      cleanText(
        formData.get(
          "correction"
        )
      ),

    containment_action:
      cleanText(
        formData.get(
          "containment_action"
        )
      ),

    root_cause:
      cleanText(
        formData.get(
          "root_cause"
        )
      ),

    corrective_action:
      cleanText(
        formData.get(
          "corrective_action"
        )
      ),

    action_owner:
      cleanText(
        formData.get(
          "action_owner"
        )
      ),

    target_date:
      cleanDate(
        formData.get(
          "target_date"
        )
      ),

    verification_evidence:
      verificationEvidence,

    effectiveness_review:
      effectivenessReview,

    status:
      controlledActionStatus,

    updated_at:
      new Date().toISOString(),
  };

  const {
    data: existing,
    error: existingError,
  } = await admin
    .from(
      "corrective_actions"
    )
    .select("id")
    .eq(
      "assessment_id",
      assessmentId
    )
    .eq(
      "finding_id",
      findingId
    )
    .eq(
      "owner_id",
      user.id
    )
    .order(
      "created_at",
      {
        ascending: false,
      }
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
      error: updateError,
    } = await admin
      .from(
        "corrective_actions"
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

    if (updateError) {
      throw new Error(
        updateError.message
      );
    }
  } else {
    const {
      error: insertError,
    } = await admin
      .from(
        "corrective_actions"
      )
      .insert(payload);

    if (insertError) {
      throw new Error(
        insertError.message
      );
    }
  }

  /*
   * Corrective-action progress updates the
   * formal finding status, but cannot formally
   * close it.
   */
  let findingStatus =
    "open";

  if (
    controlledActionStatus ===
      "in_progress"
  ) {
    findingStatus =
      "action_in_progress";
  }

  if (
    [
      "awaiting_verification",
      "effective",
    ].includes(
      controlledActionStatus
    )
  ) {
    findingStatus =
      "verification";
  }

  /*
   * Never reopen an already formally closed
   * finding when editing historical corrective
   * action information.
   */
  if (
    finding.status !==
    "closed"
  ) {
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
  }

  revalidatePath(
    `/portal/assessments/${assessmentId}/findings`
  );

  revalidatePath(
    `/portal/assessments/${assessmentId}/actions-plan`
  );

  revalidatePath(
    `/portal/assessments/${assessmentId}/summary`
  );

  revalidatePath(
    `/portal/assessments/${assessmentId}/readiness`
  );
}
