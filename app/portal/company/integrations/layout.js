import { redirect } from "next/navigation";
import { createClient } from "../../../../lib/supabase/server";

export default async function EnterpriseIntegrationLayout({ children }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/portal/login?next=/portal/company/integrations");
  }

  // Company-admin authorisation is enforced by the page/actions. Revocation stays available after plan expiry.

  return children;
}
