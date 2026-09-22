import Link from "next/link";
import { redirect } from "next/navigation";
import BCPOutsourcedProcessControl from "../../../../components/BCPOutsourcedProcessControl";
import { createClient } from "../../../../lib/supabase/server";
import { saveOutsourcedProcesses } from "./actions";

export const metadata = {
  title: "Outsourced Process & Supply Chain Control | RPG Excellence",
};

export const dynamic = "force-dynamic";

export default async function OutsourcedProcessesPage({
  searchParams,
}) {
  const params = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(
      "/portal/login?next=/portal/business-continuity/outsourced-processes",
    );
  }

  const { data: organization } = await supabase
    .from("organizations")
    .select("id,name")
    .eq("owner_id", user.id)
    .order("created_at")
    .limit(1)
    .maybeSingle();

  let profiles = [];
  let contexts = [];
  let roles = [];
  let hazards = [];
  let bias = [];
  let initial = null;
  let approvedSuppliers = [];

  if (organization) {
    const fetchRecords = (table) =>
      supabase
        .from(table)
        .select("*")
        .eq("organization_id", organization.id)
        .neq("status", "archived")
        .order("updated_at", { ascending: false });

    const results = await Promise.all([
      fetchRecords("bcp_site_profiles"),
      fetchRecords("bcp_context_assessments"),
      fetchRecords("bcp_role_assessments"),
      fetchRecords("bcp_hazard_assessments"),
      fetchRecords("bcp_bia_assessments"),
    ]);

    [profiles, contexts, roles, hazards, bias] = results.map(
      (result) => result.data || [],
    );

    if (params?.new !== "1") {
      let query = supabase
        .from("bcp_outsourced_process_assessments")
        .select("*")
        .eq("organization_id", organization.id)
        .neq("status", "archived");

      if (params?.id) {
        query = query.eq("id", params.id);
      }

      const result = await query
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      initial = result.data;
    }

    const { data, error } = await supabase
      .from("suppliers")
      .select(
        "id,legal_name,supplier_reference,supply_description,approval_status",
      )
      .eq("organization_id", organization.id)
      .eq("owner_id", user.id)
      .eq("approval_status", "approved")
      .order("legal_name");

    if (error) {
      throw new Error(error.message);
    }

    approvedSuppliers = data || [];
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "26px 2vw 80px",
        background: "#edf3f8",
        fontFamily: "Arial,sans-serif",
      }}
    >
      <div style={{ maxWidth: 1840, margin: "auto" }}>
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 20,
            marginBottom: 20,
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
              BCP HUB · MODULE 7 · ISO 22301 CLAUSE 8.1
            </small>
            <h1
              style={{
                margin: "7px 0",
                color: "#071d3a",
                fontSize: 42,
              }}
            >
              Outsourced Process &amp; Supply Chain Control
            </h1>
            <p style={{ margin: 0, color: "#62788e" }}>
              Connect priority activities and recovery objectives
              to supplier controls, continuity capability,
              performance and accountable improvement.
            </p>
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <Link
              href="/portal/business-continuity/outsourced-processes?new=1"
              style={{
                padding: "11px 14px",
                borderRadius: 8,
                background: "#315fe6",
                color: "#fff",
                textDecoration: "none",
                fontWeight: 850,
              }}
            >
              + New assessment
            </Link>
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
          </div>
        </header>

        <BCPOutsourcedProcessControl
          action={saveOutsourcedProcesses}
          profiles={profiles}
          contexts={contexts}
          roles={roles}
          hazards={hazards}
          bias={bias}
          approvedSuppliers={approvedSuppliers}
          initial={initial}
          organisationName={organization?.name || ""}
          startStep={params?.step || 0}
        />
      </div>
    </main>
  );
}
