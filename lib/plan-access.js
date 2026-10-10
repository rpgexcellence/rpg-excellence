import { redirect } from "next/navigation";

import {
  getUserSubscription,
  hasPlanAccess,
} from "./subscription";

import {
  getOrganizationAccess,
} from "./organization-access";

const FEATURE_MODULES = {
  "Business Continuity": "business_continuity",
  "Documents and Evidence": "documents",
  "Health and Safety": "risk_management",
  "Management of Change": "risk_management",
  "Permit to Work": "risk_management",
  POWRA: "risk_management",
  "Information Security": "information_security",
  "Internal Audit": "internal_audit",
  "Internal Audit Findings and Actions": "internal_audit",
  "Internal Audit FMEA Planning": "internal_audit",
  "Internal Audit Programme": "internal_audit",
  "Internal Auditor Verification": "internal_audit",
  "CAPA 8D": "capa_8d",
  Reports: "reports",
};

export async function requirePlanAccess(
  user,
  requiredPlan,
  feature,
) {
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

  // A company user may use the organisation owner's subscription only for a
  // module explicitly granted in People, Roles & Access. Direct subscribers
  // and RPG platform administrators retain their existing access behaviour.
  if (subscription?.access_source === "organization_subscription") {
    const moduleKey = FEATURE_MODULES[feature];
    const organizationAccess = moduleKey
      ? await getOrganizationAccess(moduleKey, "view")
      : null;

    if (
      !organizationAccess?.allowed ||
      organizationAccess.organization?.id !== subscription.organization_id
    ) {
      redirect("/portal/my-access?error=module_access");
    }
  }

  return subscription;
}
