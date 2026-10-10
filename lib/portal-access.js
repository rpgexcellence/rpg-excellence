import { createAdminClient } from "./supabase/admin";
import { getOrganizationAccess } from "./organization-access";
import { getUserSubscription, hasPlanAccess } from "./subscription";

const MODULE_GROUPS = {
  internal_audit: ["audits", "findings"],
  capa_8d: ["capa"],
  risk_management: ["health"],
  business_continuity: ["bcp"],
  information_security: ["isms"],
  documents: ["evidence"],
  reports: ["reports"],
  supplier_assurance: ["suppliers"],
  people_access: ["people"],
};

const STARTER_GROUPS = ["assessments", "health", "bcp", "evidence", "reports"];
const PROFESSIONAL_GROUPS = ["audits", "findings", "capa", "isms", "suppliers"];

export async function getPortalAccess(user) {
  const base = {
    groups: ["dashboard", "assessments"],
    professionalHealth: false,
    training: { health: false, audit: false, rca: false },
    organization: false,
    platformAdministrator: false,
  };

  if (!user?.id) return base;

  const [subscription, organizationAccess] = await Promise.all([
    getUserSubscription(user.id),
    getOrganizationAccess(),
  ]);

  const platformAdministrator =
    subscription?.access_source === "rpg_platform_administrator";
  const starter = hasPlanAccess(subscription, "starter");
  const professional = hasPlanAccess(subscription, "professional");
  const inherited = subscription?.access_source === "organization_subscription";
  const allowedModules = new Set(
    (organizationAccess.permissions || [])
      .filter((permission) => permission.access_level !== "none")
      .map((permission) => permission.module_key),
  );
  const companyAdministrator = Boolean(
    organizationAccess.isOwner || organizationAccess.isCompanyAdministrator,
  );

  const groups = new Set(base.groups);
  if (organizationAccess.organization) groups.add("administration");
  if (companyAdministrator || allowedModules.has("people_access")) groups.add("people");

  const commerciallyAllowed = new Set([
    ...(starter ? STARTER_GROUPS : []),
    ...(professional ? PROFESSIONAL_GROUPS : []),
  ]);

  if (platformAdministrator || !inherited || companyAdministrator) {
    for (const group of commerciallyAllowed) groups.add(group);
  } else {
    for (const moduleKey of allowedModules) {
      for (const group of MODULE_GROUPS[moduleKey] || []) {
        if (commerciallyAllowed.has(group)) groups.add(group);
      }
    }
  }

  const admin = createAdminClient();
  const { data: enrolments = [], error } = await admin
    .from("hs_training_enrolments")
    .select("expires_at,hs_training_courses!inner(academy_code)")
    .eq("learner_id", user.id)
    .in("status", ["not_started", "in_progress", "assessment_due", "failed", "passed"]);

  if (error) console.error("Unable to load portal training access:", error);

  const now = Date.now();
  const academies = new Set(
    enrolments
      .filter((row) => !row.expires_at || new Date(row.expires_at).getTime() > now)
      .map((row) => row.hs_training_courses?.academy_code)
      .filter(Boolean),
  );
  const training = {
    health: academies.has("health_safety"),
    audit: academies.has("internal_audit"),
    rca: academies.has("rca_8d"),
  };

  const workspaceGroups = [...groups];

  if (training.health) groups.add("health");
  if (training.audit) groups.add("audits");
  if (training.rca) groups.add("capa");

  return {
    groups: [...groups],
    workspaceGroups,
    professionalHealth: platformAdministrator || professional,
    training,
    organization: Boolean(organizationAccess.organization),
    platformAdministrator,
  };
}
