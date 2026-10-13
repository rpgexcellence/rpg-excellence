import { redirect } from "next/navigation";
import { requirePlanAccess } from "../../../../lib/plan-access";
import { createClient } from "../../../../lib/supabase/server";

export default async function AssetManagementLayout({ children }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/portal/login?next=/portal/company/assets");
  }

  await requirePlanAccess(user, "professional", "Asset Management");
  return children;
}
