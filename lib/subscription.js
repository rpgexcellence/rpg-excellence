import { createAdminClient } from "./supabase/admin";

const ACTIVE_STATUSES = [
  "trialing",
  "active",
];

const PLAN_LEVELS = {
  starter: 1,
  professional: 2,
  consultant: 3,
};

export async function getUserSubscription(
  userId
) {
  if (!userId) {
    return null;
  }

  const supabase =
    createAdminClient();

  const {
    data,
    error,
  } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("owner_id", userId)
    .in(
      "status",
      ACTIVE_STATUSES
    )
    .order("created_at", {
      ascending: false,
    })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error(
      "Unable to load subscription:",
      error
    );

    return null;
  }

  return data ?? null;
}

export function hasActiveSubscription(
  subscription
) {
  return Boolean(
    subscription &&
      ACTIVE_STATUSES.includes(
        subscription.status
      )
  );
}

export function hasPlanAccess(
  subscription,
  requiredPlan
) {
  if (
    !hasActiveSubscription(
      subscription
    )
  ) {
    return false;
  }

  const currentLevel =
    PLAN_LEVELS[
      subscription.plan
    ] ?? 0;

  const requiredLevel =
    PLAN_LEVELS[
      requiredPlan
    ] ?? 0;

  return (
    currentLevel >= requiredLevel
  );
}

export function getPlanLabel(
  plan
) {
  switch (plan) {
    case "starter":
      return "Starter";

    case "professional":
      return "Professional";

    case "consultant":
      return "Consultant";

    default:
      return "No Plan";
  }
}
