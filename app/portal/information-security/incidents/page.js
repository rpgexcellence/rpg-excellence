import { requireOrganizationAccess } from "../../../../lib/organization-access";
import { createAdminClient } from "../../../../lib/supabase/admin";
import { siteToday } from "../../../../lib/zone-policy.mjs";
import { incidentPersonName } from "../../../../lib/ismsSecurityIncidents";
import SecurityIncidentRegister from "./SecurityIncidentRegister";

export const dynamic = "force-dynamic";
export const metadata = { title:"Security Incident Register | RPG Excellence" };

async function allRows(query) {
  const records = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await query.range(offset, offset+499);
    if (error) throw new Error(error.message);
    records.push(...(data || []));
    if (!data || data.length < 500) return records;
  }
}

export default async function SecurityIncidentRegisterPage() {
  const { organization, level } = await requireOrganizationAccess("information_security","view","/portal/information-security/incidents");
  const admin = createAdminClient();
  const [records, people] = await Promise.all([
    allRows(admin.from("isms_security_incidents")
      .select("id,incident_reference,title,incident_type,severity,status,detected_at,administration_location_label,target_recovery_date,incident_lead_person_id")
      .eq("organization_id",organization.id).order("updated_at",{ascending:false}).order("id")),
    allRows(admin.from("organization_people").select("id,first_name,last_name").eq("organization_id",organization.id).order("id")),
  ]);
  const names = new Map(people.map(person => [person.id,incidentPersonName(person)]));
  return <SecurityIncidentRegister organization={organization.name} today={siteToday("Europe/London")}
    records={records.map(row => ({...row,lead:names.get(row.incident_lead_person_id) || "Not assigned"}))}
    canCreate={["contribute","review","approve","admin","owner"].includes(level)}/>;
}
