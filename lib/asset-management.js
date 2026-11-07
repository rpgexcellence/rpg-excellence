import { redirect } from "next/navigation";
import { getOrganizationAccess } from "./organization-access";
import { getUserSubscription, hasPlanAccess } from "./subscription";
import { assetPermission } from "./asset-permissions";

export async function requireAssetAccess(minimum = "view", next = "/portal/asset-management") {
const context = await getOrganizationAccess("asset_management", minimum);
if (!context.user) {
const destination = /^/portal/asset-management(?:/|$)/.test(next) && !/[\\r\n?#]/.test(next) ? next : "/portal/asset-management";
redirect(/portal/login?next=${encodeURIComponent(destination)});
}
const permission = assetPermission(context);
if (!permission.allowed || (minimum !== "view" && !permission.canWrite)) redirect("/portal/my-access?error=asset_management");
const subscription = await getUserSubscription(context.user.id);
if (!hasPlanAccess(subscription, "professional") || (subscription?.access_source === "organization_subscription" && subscription.organization_id !== context.organization.id)) redirect("/en/pricing?upgrade=professional&feature=Asset%20Management#subscriptions");
return { ...context, ...permission, subscription };
}

// All company rows, rather than a silently truncated dashboard count.
export async function loadAssetRows(admin, table, organizationId, columns = "*") {
const rows = [];
for (let offset = 0; ; offset += 500) {
const { data, error } = await admin.from(table).select(columns).eq("organization_id", organizationId).order("id").range(offset, offset + 499);
if (error) throw new Error(error.message);
rows.push(...(data || []));
if (!data || data.length < 500) return rows;
}
}
