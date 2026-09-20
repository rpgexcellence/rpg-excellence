import { redirect } from "next/navigation";
import { createClient } from "../../../lib/supabase/server";
import { requirePlanAccess } from "../../../lib/plan-access";

export default async function InternalAuditActionsLayout({ children }) {
  const s = await createClient(); const { data: { user } } = await s.auth.getUser();
  if (!user) redirect("/portal/login?next=/portal/internal-audit-actions");
  await requirePlanAccess(user, "professional", "Internal Audit Findings and Actions");
  return children;
}
