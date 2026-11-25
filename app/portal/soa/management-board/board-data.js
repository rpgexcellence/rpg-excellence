const PAGE_SIZE = 500;

export async function readRows(query, source) {
  const rows = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await query().range(offset, offset + PAGE_SIZE - 1);
    if (error) {
      console.error("Management Board source unavailable", source, error.code);
      return null;
    }
    rows.push(...data);
    if (data.length < PAGE_SIZE) return rows;
  }
}

export async function loadSecurityBoard(supabase, admin, organization, ownsOrganization, userId) {
  if (!organization) {
    return { risks: null, methodologies: null, treatments: null, incidents: null, acceptances: null };
  }

  const orgId = organization.id;
  const ownerQuery = (table, columns, organizationColumn = "organization_id") =>
    readRows(
      () => supabase.from(table).select(columns).eq("owner_id", userId).eq(organizationColumn, orgId).order("id"),
      table,
    );
  const [risks, methodologies, treatments, incidents, acceptances] = await Promise.all([
    ownsOrganization && ownerQuery("isms_risks", "id,risk_reference,status,residual_score,methodology_id,review_due_date"),
    ownsOrganization && readRows(
      () => supabase.from("isms_risk_methodologies").select("id,appetite_score").eq("owner_id", userId)
        .eq("organization_id", orgId).eq("status", "approved").order("id"),
      "isms_risk_methodologies",
    ),
    ownsOrganization && ownerQuery("isms_risk_treatments", "id,risk_id,status,target_date,risk:isms_risks!inner(organization_id,risk_reference)", "risk.organization_id"),
    readRows(
      () => admin.from("isms_security_incidents").select("id,incident_reference,status,severity,target_recovery_date")
        .eq("organization_id", orgId).not("status", "in", "(closed,cancelled)").order("id"),
      "isms_security_incidents",
    ),
    ownsOrganization && ownerQuery("isms_risk_acceptances", "id,risk_id,decision,expires_at,risk:isms_risks!inner(organization_id,risk_reference)", "risk.organization_id"),
  ]);
  return { risks: risks || null, methodologies: methodologies || null, treatments: treatments || null, incidents, acceptances: acceptances || null };
}

export async function loadPortfolioHeatMap(supabase, organization, userId, ownsOrganization) {
  if (!organization) return { risks: null, appetite: null };
  const [risks, methodology] = await Promise.all([
    readRows(() => {
      const query = supabase.from("isms_risks")
        .select("id,risk_reference,title,inherent_likelihood,inherent_impact,residual_likelihood,residual_impact,target_likelihood,target_impact")
        .eq("organization_id", organization.id).neq("status", "archived").order("id");
      return ownsOrganization ? query.eq("owner_id", userId) : query;
    }, "ISMS risk heat map"),
    supabase.from("isms_risk_methodologies").select("appetite_score")
      .eq("organization_id", organization.id).eq("status", "approved")
      .order("approved_at", { ascending: false }).order("id").limit(1).maybeSingle(),
  ]);
  return { risks, appetite: methodology.error ? null : methodology.data?.appetite_score ?? null };
}
