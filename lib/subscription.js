import { createAdminClient } from "./supabase/admin";

const ACTIVE_STATUSES = [
  "trialing",
  "active",
];

// Preserve the original platform-owner account as an immutable fallback. More
// RPG-owned administrator accounts may be added through the deployment
// environment without changing or replacing the original entitlement.
const DEFAULT_RPG_PLATFORM_ADMIN_EMAILS = [
  "r.pereszczako@sky.com",
];

function getRpgPlatformAdministratorEmails() {
  const configuredEmails =
    process.env.RPG_PLATFORM_ADMIN_EMAILS
      ?.split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean) ?? [];

  return new Set([
    ...DEFAULT_RPG_PLATFORM_ADMIN_EMAILS,
    ...configuredEmails,
  ]);
}

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

async function loadActiveSubscription(supabase, ownerId) {
  const { data, error } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("owner_id", ownerId)
    .in("status", ACTIVE_STATUSES)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Unable to load subscription:", error);
    return null;
  }

  return data ?? null;
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

  const email = data?.user?.email?.trim().toLowerCase();

  return Boolean(
    email && getRpgPlatformAdministratorEmails().has(email)
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

  // RPG platform-administrator accounts bypass customer subscription tiers.
  // The original owner email remains permanently included. Additional RPG
  // accounts can be configured with RPG_PLATFORM_ADMIN_EMAILS. Customer Super
  // Administrators and scoped portal administrators do not inherit this
  // commercial entitlement.
  if (await isRpgPlatformOwner(supabase, userId)) {
    return platformAdministratorEntitlement(userId);
  }

  const directSubscription = await loadActiveSubscription(supabase, userId);

  if (directSubscription) {
    return {
      ...directSubscription,
      access_source: "direct_subscription",
      subscriber_owner_id: userId,
    };
  }

  const { data: person, error: personError } = await supabase
    .from("organization_people")
    .select("id,organization_id")
    .eq("user_id", userId)
    .eq("account_status", "active")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (personError) {
    console.error("Unable to load company-user membership:", personError);
    return null;
  }

  if (!person) return null;

  const { data: organization, error: organizationError } = await supabase
    .from("organizations")
    .select("id,owner_id")
    .eq("id", person.organization_id)
    .maybeSingle();

  if (organizationError) {
    console.error("Unable to load company subscription owner:", organizationError);
    return null;
  }

  if (!organization?.owner_id) return null;

  const organizationSubscription = await loadActiveSubscription(
    supabase,
    organization.owner_id,
  );

  if (!organizationSubscription) return null;

  return {
    ...organizationSubscription,
    access_source: "organization_subscription",
    subscriber_owner_id: organization.owner_id,
    organization_id: organization.id,
    person_id: person.id,
  };
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
