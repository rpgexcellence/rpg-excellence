import HealthSafetySectionShell from "../../../components/HealthSafetySectionShell";
import { redirect } from "next/navigation";
import { createClient } from "../../../lib/supabase/server";
import { requirePlanAccess } from "../../../lib/plan-access";

export default async function HealthSafetyLayout({ children }) {
  const s = await createClient();
  const { data: { user } } = await s.auth.getUser();
  if (!user) redirect("/portal/login?next=/portal/health-safety");
  await requirePlanAccess(user, "starter", "Health and Safety");
  return <HealthSafetySectionShell>{children}</HealthSafetySectionShell>;
}
