import { redirect } from "next/navigation";

import { createAdminClient } from "./supabase/admin";
import {
  getUserSubscription,
  hasPlanAccess,
} from "./subscription";

function configuredValues(name) {
  return new Set(
    String(process.env[name] || "")
      .split(",")
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean),
  );
}

function isPlatformOwner(user) {
  const userId =
    typeof user === "string"
      ? user
      : user?.id;

  const userEmail =
    typeof user === "object"
      ? user?.email
      : null;

  const ownerIds =
    configuredValues(
      "RPG_PLATFORM_OWNER_IDS",
    );

  if (
    ownerIds.has(
      String(userId).toLowerCase(),
    )
  ) {
    return true;
  }

  const ownerEmails =
    configuredValues(
      "RPG_PLATFORM_OWNER_EMAILS",
    );

  return Boolean(
    userEmail &&
      ownerEmails.has(
        userEmail.toLowerCase(),
      ),
  );
}

async function isPortalAdministrator(
  user,
) {
  const userId =
    typeof user === "string"
      ? user
      : user?.id;

  if (!userId) {
    return false;
  }

  try {
    const admin =
      createAdminClient();

    const {
      data: adminAccess,
      error: adminAccessError,
    } = await admin
      .from("portal_admins")
      .select("role, active")
      .eq("user_id", userId)
      .eq("role", "admin")
      .eq("active", true)
      .maybeSingle();

    if (adminAccessError) {
      console.error(
        "Plan access: unable to check administrator status",
        {
          userId,
          message:
            adminAccessError.message,
          code:
            adminAccessError.code,
        },
      );

      return false;
    }

    return Boolean(adminAccess);
  } catch (error) {
    console.error(
      "Plan access: administrator check failed",
      {
        userId,
        message:
          error instanceof Error
            ? error.message
            : String(error),
      },
    );

    return false;
  }
}

export async function requirePlanAccess(
  user,
  requiredPlan,
  feature,
) {
  if (isPlatformOwner(user)) {
    return {
      plan: "platform_owner",
      status: "active",
    };
  }

  if (
    await isPortalAdministrator(user)
  ) {
    return {
      plan: "platform_admin",
      status: "active",
    };
  }

  const userId =
    typeof user === "string"
      ? user
      : user?.id;

  const subscription =
    await getUserSubscription(userId);

  if (
    !hasPlanAccess(
      subscription,
      requiredPlan,
    )
  ) {
    const query =
      new URLSearchParams({
        upgrade: requiredPlan,
        feature,
      });

    redirect(
      `/en/pricing?${query.toString()}#subscriptions`,
    );
  }

  return subscription;
}
