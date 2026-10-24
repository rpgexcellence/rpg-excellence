import { getIncidentEntitlement } from "./incidents";
import { incidentRows } from "./incident-data";
import { canReadIncident } from "./incident-policy.mjs";
export async function loadIncidentTasks(admin, access) {
  if (!access.organization) return [];
  const entitlement = await getIncidentEntitlement(access);
  if (!entitlement.core) return [];
  let reports;
  try {
    reports = await incidentRows(
      admin,
      "incident_reports",
      access.organization.id,
    );
  } catch (error) {
    if (["42P01", "PGRST205"].includes(error.code)) return [];
    throw error;
  }
  const cases = new Map(
    reports.filter((r) => canReadIncident(access, r)).map((r) => [r.id, r]),
  );
  if (!cases.size) return [];
  const rows = await incidentRows(
    admin,
    "incident_tasks",
    access.organization.id,
  );
  return rows
    .filter((t) => cases.has(t.incident_id))
    .map((t) => ({
      id: "incident:" + t.id,
      source: "incident",
      module: "Accident, Incident & Near Misses",
      title: t.title,
      status: t.status,
      due: t.due_at,
      assignee:
        t.status === "awaiting_verification"
          ? t.verifier_person_id
          : t.owner_person_id,
      verifier: null,
      site: cases.get(t.incident_id).location_label,
      href: "/portal/incidents/" + t.incident_id,
      updated: t.updated_at,
      ownerName: "",
    }));
}
