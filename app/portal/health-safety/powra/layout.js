import { redirect } from "next/navigation";
import { requirePlanAccess } from "../../../../lib/plan-access";
import { createClient } from "../../../../lib/supabase/server";

export default async function PowraLayout({ children }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/portal/login?next=/portal/health-safety/powra");
  await requirePlanAccess(user, "professional", "POWRA");
  return children;
}
