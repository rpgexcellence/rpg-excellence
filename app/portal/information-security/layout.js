import { redirect } from "next/navigation";
import { createClient } from "../../../lib/supabase/server";
import { requirePlanAccess } from "../../../lib/plan-access";

export default async function InformationSecurityLayout({ children }) {
  const s = await createClient();
  const { data: { user } } = await s.auth.getUser();
  if (!user) redirect("/portal/login?next=/portal/information-security");
  await requirePlanAccess(user, "professional", "Information Security");
  return children;
}
