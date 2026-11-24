import { headers } from "next/headers";
import { UUID } from "../../../lib/zone-policy.mjs";
import { redirect } from "next/navigation";
import { createClient } from "../../../lib/supabase/server";
import { requirePlanAccess } from "../../../lib/plan-access";

export default async function InformationSecurityLayout({ children }) {
  const s = await createClient();
  const { data: { user } } = await s.auth.getUser();
  if (!user) {
    const risk = (await headers()).get("x-rpg-isms-risk");
    const next = risk && UUID.test(risk) ? "/portal/information-security/risk-management?risk=" + risk : "/portal/information-security";
    redirect("/portal/login?next=" + encodeURIComponent(next));
  }
  await requirePlanAccess(user, "professional", "Information Security");
  return children;
}
