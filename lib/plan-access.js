import { redirect } from "next/navigation";

import { getUserSubscription, hasPlanAccess } from "./subscription";
function configuredValues(name) {
  return new Set(
    String(process.env[name] || "")
      .split(",")
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean),
  );
}

function isPlatformOwner(user) {
  const userId = typeof user === "string" ? user : user?.id;
  const userEmail = typeof user === "object" ? user?.email : null;
  const ownerIds = configuredValues("RPG_PLATFORM_OWNER_IDS");
  if (ownerIds.has(String(userId).toLowerCase())) return true;

  const ownerEmails = configuredValues("RPG_PLATFORM_OWNER_EMAILS");
  return Boolean(userEmail && ownerEmails.has(userEmail.toLowerCase()));
}

export async function requirePlanAccess(user, requiredPlan, feature) {
  if (isPlatformOwner(user)) {
    return { plan: "platform_owner", status: "active" };
  }

  const userId = typeof user === "string" ? user : user?.id;
  const subscription = await getUserSubscription(userId);

  if (!hasPlanAccess(subscription, requiredPlan)) {
    const query = new URLSearchParams({ upgrade: requiredPlan, feature });
    redirect(`/en/pricing?${query.toString()}#subscriptions`);
  }

  return subscription;
}
