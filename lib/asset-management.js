import { redirect } from "next/navigation";
import { getOrganizationAccess } from "./organization-access";
import { getUserSubscription, hasPlanAccess } from "./subscription";
import { assetPermission } from "./asset-permissions";

const ASSET_ROOT = "/portal/asset-management";

function safeAssetDestination(value) {
  if (typeof value !== "string") return ASSET_ROOT;

  const insideModule =
    value === ASSET_ROOT || value.startsWith(ASSET_ROOT + "/");

  if (!insideModule) return ASSET_ROOT;

  const invalidCharacter = Array.from(value).some(character => {
    const code = character.charCodeAt(0);
    return (
      code < 32 ||
      code === 127 ||
      code === 92 ||
      code === 63 ||
      code === 35
    );
  });

  if (invalidCharacter) return ASSET_ROOT;
  if (value.split("/").includes("..")) return ASSET_ROOT;

  return value;
}

export async function requireAssetAccess(minimum = "view", next = ASSET_ROOT) {
  const context = await getOrganizationAccess("asset_management", minimum);

  if (!context.user) {
    const destination = safeAssetDestination(next);
    redirect("/portal/login?next=" + encodeURIComponent(destination));
  }

  const permission = assetPermission(context);

  if (!permission.allowed || (minimum !== "view" && !permission.canWrite)) {
    redirect("/portal/my-access?error=asset_management");
  }

  const subscription = await getUserSubscription(context.user.id);

  const wrongCompanySubscription =
    subscription?.access_source === "organization_subscription" &&
    subscription.organization_id !== context.organization.id;

  if (!hasPlanAccess(subscription, "professional") || wrongCompanySubscription) {
    redirect(
      "/en/pricing?upgrade=professional&feature=Asset%20Management#subscriptions",
    );
  }

  return { ...context, ...permission, subscription };
}

// Read every company-scoped page instead of silently truncating the results.
export async function loadAssetRows(
  admin,
  table,
  organizationId,
  columns = "*",
) {
  const rows = [];

  for (let offset = 0; ; offset += 500) {
    const { data, error } = await admin
      .from(table)
      .select(columns)
      .eq("organization_id", organizationId)
      .order("id")
      .range(offset, offset + 499);

    if (error) throw new Error(error.message);

    rows.push(...(data || []));
    if (!data || data.length < 500) return rows;
  }
}
