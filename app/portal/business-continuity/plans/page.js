// VERIFIED_BCP_PLAN_PAGE_DRAFT_20261021: explicit conditions and unique draft keys.
import ControlledDeviceDrafts from "../../../../components/ControlledDeviceDrafts";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "../../../../lib/supabase/server";
import { PLAN_SOURCE_TABLES } from "../../../../lib/bcpPlanEngine";
import BCPPlan from "../../../../components/BCPPlan";
import { saveBCPPlan } from "./actions";
export const dynamic = "force-dynamic";
export const metadata = {
  "title": "Module 10 · BCP Plan | RPG Excellence"
};
export default async function PlansPage({
  searchParams
}) {
  const params = await searchParams;
  const s = await createClient();
  const {
    data: {
      user
    }
  } = await s.auth.getUser();
  if (!user) redirect("/portal/login?next=/portal/business-continuity/plans");
  const {
    data: org,
    error: orgError
  } = await s.from("organizations").select("id,name").eq("owner_id", user.id).order("created_at").limit(1).maybeSingle();
  if (!org || orgError) return <main style={{
    "padding": 30
  }}>Create an organisation before starting Module 10. <Link href="/portal">Product Dashboard</Link></main>;
  const specs = Object.entries(PLAN_SOURCE_TABLES);
  const results = await Promise.all([...specs.map(([, table]) => s.from(table).select("*").eq("organization_id", org.id).neq("status", "archived").order("updated_at", {
    "ascending": false
  })), s.from("organization_people").select("*").eq("organization_id", org.id).not("account_status", "in", "(suspended,closed)").order("last_name"), s.from("bcp_plans").select("*").eq("organization_id", org.id).order("updated_at", {
    "ascending": false
  })]);
  const options = Object.fromEntries(specs.map(([key], i) => [key, results[i].data || []]));
  const people = results[specs.length].data || [],
    plans = results[specs.length + 1].data || [];
  const errors = results.map((r, i) => (() => {
    if (r.error) {
      return "" + (() => {
        if (i < specs.length) {
          return specs[i][1];
        }
        return (() => {
          if (i === specs.length) {
            return "Company Users";
          }
          return "Module 10 tables";
        })();
      })() + ": " + r.error.message + "";
    }
    return "";
  })()).filter(Boolean);
  const initial = (() => {
    if (params?.new === "1") {
      return null;
    }
    return (() => {
      if (params?.id) {
        return plans.find(r => r.id === params.id);
      }
      return plans[0] || null;
    })();
  })();
  if (params?.id && !initial && params?.new !== "1") errors.push("The requested plan could not be found. Choose a plan from the register or create a new plan.");
  return <ControlledDeviceDrafts userId={user.id} organizationId={org.id} recordKey={'bcp-plan:' + (initial?.id || 'new')} label="Business continuity plan" baseline={{
    "options": options,
    "people": people,
    "initial": initial,
    "plans": plans
  }}><main style={{
      "minHeight": "100vh",
      "padding": "24px 2vw 80px",
      "background": "#edf3f8",
      "fontFamily": "Arial,sans-serif"
    }}><div style={{
        "maxWidth": 1600,
        "margin": "auto"
      }}><BCPPlan action={saveBCPPlan} options={options} people={people} initial={initial} plans={plans} organisationName={org.name} loadErrors={errors} /></div></main></ControlledDeviceDrafts>;
}
