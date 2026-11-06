// Asset Management requires its own module allocation.
export const ASSET_WRITE_LEVELS = new Set([
  "contribute",
  "review",
  "approve",
  "admin",
  "owner",
]);

export function assetPermission(context) {
  const denied = {
    allowed: false,
    canWrite: false,
    level: "none",
  };

  if (!context?.user || !context.organization) {
    return denied;
  }

  if (context.isOwner) {
    return {
      allowed: true,
      canWrite: true,
      level: "owner",
    };
  }

  if (
    context.person?.account_type !== "system" ||
    context.person?.account_status !== "active"
  ) {
    return denied;
  }

  const permissions = context.permissions || [];

  const administrator =
    context.isCompanyAdministrator &&
    permissions.some(
      (permission) =>
        permission.module_key === "people_access" &&
        permission.access_level === "admin"
    );

  const level = administrator
    ? "admin"
    : permissions.find(
        (permission) =>
          permission.module_key === "asset_management"
      )?.access_level || "none";

  return {
    level,
    allowed: ["view", ...ASSET_WRITE_LEVELS].includes(level),
    canWrite: ASSET_WRITE_LEVELS.has(level),
  };
}
