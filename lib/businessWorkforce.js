import { createAdminClient } from "./supabase/admin";

// Match the company people register: each record counts once, regardless of login status.
export async function businessWorkforceCount(organizationId) {
  if (!organizationId) return null;
  const { count, error } = await createAdminClient().from("organization_people")
    .select("id", { count: "exact", head: true }).eq("organization_id", organizationId);
  return error || !Number.isInteger(count) ? null : count;
}
