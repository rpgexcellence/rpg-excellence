export function departmentsForSite(departments, siteId) {
  if (!siteId) return [];
  return departments.filter(d=>d.status === "active" && (d.all_sites || d.site_ids?.includes(siteId)));
}
export function requireSiteDepartment(departments, siteId, id, required=false) {
  if (!id && !required) return null;
  const department=departmentsForSite(departments,siteId).find(d=>d.id===id);
  if (!department) throw new Error("Select an active controlled department assigned to the selected company site.");
  return department;
}
