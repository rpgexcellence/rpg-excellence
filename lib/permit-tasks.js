import "server-only";
import { PERMITS_ROOT } from "./permit-register.mjs";
import { effectivePermitStatus } from "./permitLifecycle";

export async function loadPermitTasks(supabase, organizationId) {
  const result = await supabase.from("hs_permits").select("id,permit_reference,task_description,status,valid_until,site_location,issuer_person_id,receiver_person_id,receiver_accepted_at,updated_at")
    .eq("organization_id", organizationId)
    .in("status", ["awaiting_verification", "awaiting_acceptance", "handover_required", "issued", "expired", "awaiting_handback"]);
  if (result.error) return { tasks: [], error: true };
  const now = new Date();
  const tasks = (result.data || []).flatMap(row => {
    const stage = effectivePermitStatus(row, now);
    const assignments = {
      awaiting_verification: ["Verify permit controls", row.issuer_person_id, "awaiting_verification"],
      awaiting_acceptance: row.receiver_accepted_at
        ? ["Authorise and issue", row.issuer_person_id, "awaiting_review"]
        : ["Accept control of work", row.receiver_person_id, "awaiting_review"],
      handover_required: ["Coordinate and record handover", row.issuer_person_id, "awaiting_review", "/controls"],
      expired: ["Request handback after expiry", row.receiver_person_id, "open"],
      awaiting_handback: ["Review handback and close permit", row.issuer_person_id, "awaiting_review"],
    };
    const [action, assignee, status, route = ""] = assignments[stage] ?? [];
    if (!assignee) return [];
    const due = ["awaiting_handback", "expired"].includes(stage) ? "" : row.valid_until;
    return [{
      id: "permit:" + row.id + ":" + stage, source: "permit", module: "Permit to Work", assignee, status, due,
      title: action + " · " + row.permit_reference + " · " + row.task_description,
      site: row.site_location, href: PERMITS_ROOT + "/" + row.id + route, updated: row.updated_at,
    }];
  });
  return { tasks, error: false };
}
