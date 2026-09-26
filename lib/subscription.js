import { createAdminClient } from "./supabase/admin";

const ACTIVE_STATUSES = [
  "trialing",
  "active",
];

const RPG_PLATFORM_OWNER_EMAIL = "r.pereszczako@sky.com";

const PLAN_LEVELS = {
  starter: 1,
  professional: 2,
  consultant: 3,
  platform_admin: 99,
};

function platformAdministratorEntitlement(userId) {
  return {
    id: null,
    owner_id: userId,
    plan: "platform_admin",
    status: "active",
    current_period_end: null,
    trial_end: null,
    privileged_access: true,
    access_source: "rpg_platform_administrator",
  };
}

async function isRpgPlatformOwner(supabase, userId) {
  const {
    data,
    error,
  } = await supabase.auth.admin.getUserById(userId);

  if (error) {
    console.error(
      "Unable to verify RPG Platform Administrator identity:",
      error
    );
    return false;
  }

  return (
    data?.user?.email?.trim().toLowerCase() ===
    RPG_PLATFORM_OWNER_EMAIL
  );
}

export async function getUserSubscription(
  userId
) {
  if (!userId) {
    return null;
  }

  const supabase =
    createAdminClient();

  // Only the named RPG platform-owner account bypasses customer subscription
  // tiers. Customer Super Administrators and other portal administrators do
  // not inherit this commercial entitlement.
  if (await isRpgPlatformOwner(supabase, userId)) {
    return platformAdministratorEntitlement(userId);
  }

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
  const expiresAt =
    subscription?.current_period_end ||
    subscription?.trial_end;

  const accessHasExpired =
    expiresAt &&
    new Date(expiresAt).getTime() <=
      Date.now();

  return Boolean(
    subscription &&
      ACTIVE_STATUSES.includes(
        subscription.status
      ) &&
      !accessHasExpired
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

    case "platform_admin":
      return "RPG Platform Administrator";

    default:
      return "No Plan";
  }
}

export async function getAvailableAssessmentPasses(userId) {
  if (!userId) return [];
  const supabase = createAdminClient();
  const { data, error } = await supabase.from("assessment_passes").select("*").eq("owner_id", userId).eq("product_type", "single_assessment").eq("status", "available").gt("access_expires_at", new Date().toISOString()).order("purchased_at");
  if (error) { console.error("Unable to load assessment passes:", error); return []; }
  return data ?? [];
}

export async function getAvailableStandaloneSoaPasses(userId) {
  if (!userId) return [];
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("assessment_passes")
    .select("*")
    .eq("owner_id", userId)
    .eq("product_type", "standalone_soa")
    .eq("status", "available")
    .gt("access_expires_at", new Date().toISOString())
    .order("purchased_at");
  if (error) {
    console.error("Unable to load standalone SoA passes:", error);
    return [];
  }
  return data ?? [];
}
