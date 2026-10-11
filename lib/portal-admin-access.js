const DEFAULT_PLATFORM_OWNER_EMAILS = [
  "info@rpgexcellence.com",
];

function normaliseEmail(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function configuredOwnerEmails() {
  const configured = String(
    process.env.PLATFORM_OWNER_EMAILS || ""
  )
    .split(",")
    .map(normaliseEmail)
    .filter(Boolean);

  return new Set([
    ...DEFAULT_PLATFORM_OWNER_EMAILS,
    ...configured,
  ]);
}

export function isPlatformOwner(user) {
  const email = normaliseEmail(user?.email);

  return (
    Boolean(email) &&
    configuredOwnerEmails().has(email)
  );
}

export async function resolvePortalAdminAccess({
  admin,
  user,
  allowedRoles = ["admin"],
}) {
  if (!user?.id) {
    return {
      access: null,
      error: null,
      source: "none",
    };
  }

  // Recovery route for the authenticated RPG Excellence
  // platform-owner account if its portal_admins record is
  // removed or its authentication UUID changes.
  if (isPlatformOwner(user)) {
    return {
      access: {
        user_id: user.id,
        role: "admin",
        active: true,
      },
      error: null,
      source: "platform_owner",
    };
  }

  const { data, error } = await admin
    .from("portal_admins")
    .select("user_id,role,active")
    .eq("user_id", user.id)
    .eq("active", true)
    .in("role", allowedRoles)
    .limit(1);

  return {
    access:
      error
        ? null
        : data?.[0] || null,
    error,
    source:
      data?.[0]
        ? "portal_admins"
        : "none",
  };
}
