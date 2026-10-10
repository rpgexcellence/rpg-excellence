import { redirect } from "next/navigation";
import { createClient } from "../../../lib/supabase/server";
import { requirePlanAccess } from "../../../lib/plan-access";
import { headers } from "next/headers";

export default async function RcaLayout({ children }) {
  const s = await createClient(); const { data: { user } } = await s.auth.getUser();
  if (!user) redirect("/portal/login?next=/portal/rca");
  const pathname = (await headers()).get("x-rpg-pathname") || "";
  const personalTrainingRoute = pathname.startsWith("/portal/rca/training");
  if (!personalTrainingRoute) {
    await requirePlanAccess(user, "professional", "CAPA 8D");
  }
  return children;
}
