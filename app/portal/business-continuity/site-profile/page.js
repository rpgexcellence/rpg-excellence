import Link from "next/link";
import { redirect } from "next/navigation";
import BCPSiteProfileForm from "../../../../components/BCPSiteProfileForm";
import { createClient } from "../../../../lib/supabase/server";
export const metadata = { title: "BCP Site Profile | RPG Excellence" };
export const dynamic = "force-dynamic";
async function saveProfile(fd) {
  "use server";
  const s = await createClient(),
    {
      data: { user },
    } = await s.auth.getUser();
  if (!user)
    redirect("/portal/login?next=/portal/business-continuity/site-profile");
  const { data: org } = await s
    .from("organizations")
    .select("id")
    .eq("owner_id", user.id)
    .order("created_at")
    .limit(1)
    .maybeSingle();
  if (!org)
    throw new Error("Create an organisation before starting a site profile.");
  const t = (n) => String(fd.get(n) || "").trim(),
    parse = (n) => {
      try {
        return JSON.parse(t(n) || "[]");
      } catch {
        return [];
      }
    };
  const value = parse("value_chain_processes"),
    support = parse("support_processes"),
    people = parse("training_participants");
  const dependencies = {
    people: t("dependency_people"),
    premises: t("dependency_premises"),
    technology: t("dependency_technology"),
    utilities: t("dependency_utilities"),
    suppliers: t("dependency_suppliers"),
    communications: t("dependency_communications"),
  };
  if (
    !t("location_name") ||
    !t("site_leader") ||
    !t("local_facilitator") ||
    !t("operational_description")
  )
    throw new Error(
      "Complete the mandatory site identity and operational fields.",
    );
  const completed = [
    t("location_name") && t("site_leader") && t("local_facilitator"),
    t("operational_description") && t("critical_products_services"),
    value.some((x) => x.name && x.owner),
    support.some((x) => x.name && x.owner),
    Object.values(dependencies).some(Boolean),
    t("infosec_description") || t("remote_support"),
    people.some((x) => x.name && x.role),
  ].filter(Boolean).length;
  const operatingHours = [
    t("operating_pattern"),
    t("core_hours") && `Core hours: ${t("core_hours")}`,
    t("review_frequency") && `Review: ${t("review_frequency")}`,
  ].filter(Boolean).join(" · ");
  const data = {
    owner_id: user.id,
    organization_id: org.id,
    status: t("intent") === "review" ? "ready_for_review" : "draft",
    region: t("region"),
    location_name: t("location_name"),
    country: t("country"),
    address: t("address"),
    headcount: Number(t("headcount")) || null,
    site_leader: t("site_leader"),
    site_leader_email: t("site_leader_email"),
    regional_facilitator: t("regional_facilitator"),
    local_facilitator: t("local_facilitator"),
    operational_description: t("operational_description"),
    critical_products_services: t("critical_products_services"),
    operating_hours: operatingHours,
    value_chain_processes: value,
    support_processes: support,
    site_dependencies: dependencies,
    infosec_description: t("infosec_description"),
    remote_support: t("remote_support"),
    training_participants: people,
    completion_percent: Math.round((completed / 7) * 100),
    review_due_date: t("review_due_date") || null,
    updated_at: new Date().toISOString(),
  };
  const id = t("profile_id");
  let error;
  if (id)
    ({ error } = await s
      .from("bcp_site_profiles")
      .update(data)
      .eq("id", id)
      .eq("owner_id", user.id));
  else
    ({ error } = await s
      .from("bcp_site_profiles")
      .insert({
        ...data,
        profile_reference: `BCP-SP-${new Date().getUTCFullYear()}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`,
      }));
  if (error) throw new Error(error.message);
  redirect("/portal/business-continuity");
}
export default async function SiteProfile() {
  const s = await createClient(),
    {
      data: { user },
    } = await s.auth.getUser();
  if (!user)
    redirect("/portal/login?next=/portal/business-continuity/site-profile");
  const { data: org } = await s
    .from("organizations")
    .select("id,name")
    .eq("owner_id", user.id)
    .order("created_at")
    .limit(1)
    .maybeSingle();
  let initial = null;
  if (org)
    ({ data: initial } = await s
      .from("bcp_site_profiles")
      .select("*")
      .eq("organization_id", org.id)
      .neq("status", "archived")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle());
  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "32px 24px 80px",
        background: "#edf3f8",
        fontFamily: "Arial,sans-serif",
      }}
    >
      <div style={{ maxWidth: 1500, margin: "auto" }}>
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 20,
            alignItems: "start",
            marginBottom: 22,
          }}
        >
          <div>
            <small
              style={{
                color: "#6845d1",
                fontWeight: 900,
                letterSpacing: ".1em",
              }}
            >
              BCP HUB · PART 1
            </small>
            <h1 style={{ margin: "7px 0", color: "#071d3a", fontSize: 36 }}>
              Site Profile Assessment
            </h1>
            <p style={{ margin: 0, color: "#62788e" }}>
              Establish the organisational boundary, accountable roles,
              processes, owners, dependencies and initial learning population.
            </p>
          </div>
          <Link
            href="/portal/business-continuity"
            style={{
              padding: "11px 14px",
              border: "1px solid #c5d3e0",
              borderRadius: 8,
              background: "#fff",
              color: "#173b60",
              textDecoration: "none",
              fontWeight: 850,
            }}
          >
            ← BCP Hub
          </Link>
        </header>
        <BCPSiteProfileForm action={saveProfile} initial={initial} organisationName={org?.name || ""} />
      </div>
    </main>
  );
}
