import { redirect } from "next/navigation";
import { getOrganizationAccess } from "./organization-access";

export function canManageBusinessProfile(context, today = new Date().toISOString().slice(0, 10)) {
  if (!context.user || !context.organization) return false;
  if (context.isOwner && context.organization.owner_id === context.user.id) return true;
  return context.person?.account_status === "active" && context.allowed &&
    context.functions.some(row => row.function_key === "company_administrator" && row.status === "authorised" && (!row.expires_at || row.expires_at.slice(0, 10) >= today));
}

export async function businessProfileContext() {
  const context = await getOrganizationAccess("people_access", "admin");
  if (!context.user) redirect("/portal/login?next=/portal/company/business-profile");
  if (context.organization && !canManageBusinessProfile(context)) redirect("/portal/my-access?error=access");
  return context;
}
