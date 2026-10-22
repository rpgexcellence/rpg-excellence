import IncidentIntakeForm from "../../../../components/IncidentForm";
import { IncidentHeader } from "../../../../components/IncidentUI";
import { incidentContext, checkResult } from "../../../../lib/incidents";
import { submitInternalIncident } from "../actions";
export default async function NewIncident() {
  const c = await incidentContext();
  let q = c.admin
    .from("organization_sites")
    .select("id,site_name")
    .eq("organization_id", c.organization.id)
    .eq("status", "active")
    .order("site_name");
  const permission = c.permissions.find((p) => p.module_key === "incidents");
  if (
    !c.isOwner &&
    !c.isCompanyAdministrator &&
    permission?.scope_type === "site"
  )
    q = q.in("id", permission.scope_values || []);
  const sites = checkResult(await q) || [];
  const zones =
    checkResult(
      await c.admin
        .from("organization_zones")
        .select("id,site_id,reference,name")
        .eq("organization_id", c.organization.id)
        .neq("status", "archived")
        .order("reference"),
    ) || [];
  return (
    <>
      <IncidentHeader
        title="New incident or concern"
        description="Report a site event, digital security concern or disruption. Public area QR reporting remains available without an account."
        admin={c.incidentAdministrator}
      />
      <p className="incidentNotice">
        For immediate danger or active compromise, use emergency and security
        response channels directly. Do not wait for this form.
      </p>
      <section className="incidentCard">
        {sites.length ? (
          <IncidentIntakeForm
            action={submitInternalIncident}
            sites={sites}
            zones={zones}
          />
        ) : (
          <p>
            No active sites are available in your scope. An administrator must
            create a Site Profile first.
          </p>
        )}
      </section>
    </>
  );
}
