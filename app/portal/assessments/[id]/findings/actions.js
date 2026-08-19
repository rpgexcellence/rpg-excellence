"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "../../../../../lib/supabase/server";
import { createAdminClient } from "../../../../../lib/supabase/admin";

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
    .eq("id", assessmentId)
    .eq("owner_id", userId)
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
  } = await supabase.auth.getUser();

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

  const status =
    formData.get("status");

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

  const {
    error,
  } = await admin
    .from("assessment_findings")
    .update({
      status,
      updated_at:
        new Date().toISOString(),
    })
    .eq("id", findingId)
    .eq(
      "assessment_id",
      assessmentId
    )
    .eq("owner_id", user.id);

  if (error) {
    throw new Error(
      error.message
    );
  }

  revalidatePath(
    `/portal/assessments/${assessmentId}/findings`
  );
}

export async function updateCorrectiveAction(
  formData
) {
  const supabase =
    await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

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

  const status =
    formData.get("status");

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
    .from("assessment_findings")
    .select("id")
    .eq("id", findingId)
    .eq(
      "assessment_id",
      assessmentId
    )
    .eq("owner_id", user.id)
    .single();

  if (
    findingError ||
    !finding
  ) {
    throw new Error(
      "Finding not found."
    );
  }

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
      cleanText(
        formData.get(
          "verification_evidence"
        )
      ),

    effectiveness_review:
      cleanText(
        formData.get(
          "effectiveness_review"
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
    .from("corrective_actions")
    .select("id")
    .eq(
      "assessment_id",
      assessmentId
    )
    .eq(
      "finding_id",
      findingId
    )
    .eq("owner_id", user.id)
    .order("created_at", {
      ascending: false,
    })
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
      .from("corrective_actions")
      .update(payload)
      .eq("id", existing.id)
      .eq("owner_id", user.id);

    if (updateError) {
      throw new Error(
        updateError.message
      );
    }
  } else {
    const {
      error: insertError,
    } = await admin
      .from("corrective_actions")
      .insert(payload);

    if (insertError) {
      throw new Error(
        insertError.message
      );
    }
  }

  if (
    status ===
      "in_progress" ||
    status ===
      "awaiting_verification"
  ) {
    await admin
      .from("assessment_findings")
      .update({
        status:
          status ===
          "awaiting_verification"
            ? "verification"
            : "action_in_progress",
        updated_at:
          new Date().toISOString(),
      })
      .eq("id", findingId)
      .eq("owner_id", user.id);
  }

  if (
    status === "closed" ||
    status === "effective"
  ) {
    await admin
      .from("assessment_findings")
      .update({
        status: "closed",
        updated_at:
          new Date().toISOString(),
      })
      .eq("id", findingId)
      .eq("owner_id", user.id);
  }

  revalidatePath(
    `/portal/assessments/${assessmentId}/findings`
  );
}
