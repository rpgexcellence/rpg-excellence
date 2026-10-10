import { redirect } from "next/navigation";
import { createAdminClient } from "./supabase/admin";
import { createClient } from "./supabase/server";

const ranks = { none: 0, view: 1, contribute: 2, review: 3, approve: 4, admin: 5, owner: 6 };

function isCurrentCompanyAdministrator(functions) {
  const today = new Date().toISOString().slice(0, 10);

  return functions.some(
    (item) =>
      item.function_key === "company_administrator" &&
      item.status === "authorised" &&
      (!item.expires_at || item.expires_at >= today),
  );
}

export async function getOrganizationAccess(moduleKey = null, minimumLevel = "view") {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { user: null, organization: null, person: null, level: "none", allowed: false, permissions: [], functions: [] };
  const admin = createAdminClient();
  const { data: owned } = await admin.from("organizations").select("*").eq("owner_id", user.id).order("created_at").limit(1).maybeSingle();
  if (owned) return { user, organization: owned, person: null, level: "owner", allowed: true, permissions: [], functions: [], isOwner: true };
  const { data: person } = await admin.from("organization_people").select("*").eq("user_id", user.id).eq("account_status", "active").order("created_at").limit(1).maybeSingle();
  if (!person) return { user, organization: null, person: null, level: "none", allowed: false, permissions: [], functions: [] };
  const [{ data: organization }, { data: permissions = [] }, { data: functions = [] }] = await Promise.all([
    admin.from("organizations").select("*").eq("id", person.organization_id).single(),
    admin.from("organization_person_permissions").select("*").eq("person_id", person.id),
    admin.from("organization_person_authorizations").select("*").eq("person_id", person.id),
  ]);
  const isCompanyAdministrator = isCurrentCompanyAdministrator(functions);
  const permission = moduleKey ? permissions.find((item) => item.module_key === moduleKey) : null;
  const level = isCompanyAdministrator
    ? "admin"
    : moduleKey
      ? permission?.access_level || "none"
      : "view";
  return {
    user,
    organization,
    person,
    level,
    allowed:
      !moduleKey ||
      isCompanyAdministrator ||
      (ranks[level] || 0) >= (ranks[minimumLevel] || 1),
    permissions,
    functions,
    isOwner: false,
    isCompanyAdministrator,
  };
}

export async function requireOrganizationAccess(moduleKey, minimumLevel = "view", next = "/portal/my-access") {
  const context = await getOrganizationAccess(moduleKey, minimumLevel);
  if (!context.user) redirect(`/portal/login?next=${encodeURIComponent(next)}`);
  if (!context.organization || !context.allowed) redirect("/portal/my-access?error=access");
  return context;
}

