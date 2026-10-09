import {
  redirect,
} from "next/navigation";

import {
  createAdminClient,
} from "./supabase/admin";

import {
  createClient,
} from "./supabase/server";

const ranks = {
  none: 0,
  view: 1,
  contribute: 2,
  review: 3,
  approve: 4,
  admin: 5,
  owner: 6,
};

export async function getAssessmentOrganizationAccess(
  assessmentId,
  minimumLevel = "view"
) {
  const supabase =
    await createClient();

  const {
    data: { user },
  } =
    await supabase.auth.getUser();

  if (!user) {
    return {
      allowed: false,
      user: null,
      assessment: null,
      level: "none",
    };
  }

  const admin =
    createAdminClient();

  const {
    data: assessment,
    error,
  } = await admin
    .from("assessments")
    .select("*")
    .eq(
      "id",
      assessmentId
    )
    .maybeSingle();

  if (
    error ||
    !assessment
  ) {
    return {
      allowed: false,
      user,
      assessment: null,
      level: "none",
    };
  }

  if (
    assessment.owner_id ===
    user.id
  ) {
    return {
      allowed: true,
      user,
      assessment,
      level: "owner",
      recordOwnerId:
        assessment.owner_id,
      isOwner: true,
    };
  }

  const {
    data: person,
  } = await admin
    .from(
      "organization_people"
    )
    .select("*")
    .eq(
      "organization_id",
      assessment.organization_id
    )
    .eq(
      "user_id",
      user.id
    )
    .eq(
      "account_status",
      "active"
    )
    .maybeSingle();

  if (!person) {
    return {
      allowed: false,
      user,
      assessment,
      person: null,
      level: "none",
      recordOwnerId:
        assessment.owner_id,
    };
  }

  const {
    data: permission,
  } = await admin
    .from(
      "organization_person_permissions"
    )
    .select("*")
    .eq(
      "person_id",
      person.id
    )
    .eq(
      "module_key",
      "assessments"
    )
    .maybeSingle();

  const level =
    permission?.access_level ||
    "none";

  return {
    allowed:
      (ranks[level] || 0) >=
      (ranks[minimumLevel] || 1),

    user,
    assessment,
    person,
    permission,
    level,

    recordOwnerId:
      assessment.owner_id,

    isOwner: false,
  };
}

export async function requireAssessmentOrganizationAccess(
  assessmentId,
  minimumLevel = "view"
) {
  const context =
    await getAssessmentOrganizationAccess(
      assessmentId,
      minimumLevel
    );

  if (!context.user) {
    redirect(
      `/portal/login?next=${encodeURIComponent(
        `/portal/assessments/${assessmentId}`
      )}`
    );
  }

  if (
    !context.assessment ||
    !context.allowed
  ) {
    redirect(
      "/portal/my-access?error=assessment_access"
    );
  }

  return context;
}
