import { redirect } from "next/navigation";

import { getUserSubscription, hasPlanAccess } from "./subscription";

export async function requirePlanAccess(userId, requiredPlan, feature) {
  const subscription = await getUserSubscription(userId);

  if (!hasPlanAccess(subscription, requiredPlan)) {
    const query = new URLSearchParams({ upgrade: requiredPlan, feature });
    redirect(`/en/pricing?${query.toString()}#subscriptions`);
  }

  return subscription;
}
