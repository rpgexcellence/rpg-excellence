import { redirect } from "next/navigation";
import { requirePlanAccess } from "../../../../lib/plan-access";
import { createClient } from "../../../../lib/supabase/server";

export default async function EnterpriseIntegrationLayout({ children }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/portal/login?next=/portal/company/integrations");
  }

  await requirePlanAccess(user, "consultant", "Enterprise Integration");

  return children;
}
