import { redirect } from "next/navigation";
import { requirePlanAccess } from "../../../../lib/plan-access";
import { createClient } from "../../../../lib/supabase/server";

export default async function PermitsLayout({ children }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/portal/login?next=/portal/health-safety/permits");
  await requirePlanAccess(user, "professional", "Permit to Work");
  return children;
}
