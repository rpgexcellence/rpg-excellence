import "server-only";
// Supabase's default response limit must not silently truncate incident totals.
export async function incidentRows(
  admin,
  table,
  organizationId,
  columns = "*",
) {
  if (
    !organizationId ||
    !["incident_reports", "incident_tasks"].includes(table)
  )
    throw Error("Invalid incident data scope.");
  const rows = [];
  for (let start = 0; ; start += 500) {
    const result = await admin
      .from(table)
      .select(columns)
      .eq("organization_id", organizationId)
      .order("id")
      .range(start, start + 499);
    if (result.error)
      throw Object.assign(Error(result.error.message), {
        code: result.error.code,
      });
    rows.push(...(result.data || []));
    if ((result.data || []).length < 500) return rows;
  }
}
