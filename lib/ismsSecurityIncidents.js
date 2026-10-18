import { createAdminClient } from "./supabase/admin";
import { rcaAdministrationLocations } from "./rcaCompanyLinks";

export const incidentPersonName = (person) =>
  [person?.first_name, person?.last_name].filter(Boolean).join(" ").trim() ||
  person?.email ||
  "Unnamed company user";

export const incidentLabel = (value) =>
  String(value || "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

export async function loadSecurityIncidentOptions(organization) {
  const admin = createAdminClient();
  const [peopleResult, documentsResult, findingsResult, casesResult, mocResult, bcpResult] =
    await Promise.all([
      admin
        .from("organization_people")
        .select("id,user_id,first_name,last_name,email,position,department,site")
        .eq("organization_id", organization.id)
        .eq("account_status", "active")
        .order("last_name"),
      admin
        .from("controlled_documents")
        .select("id,document_number,title,revision,status,standard")
        .eq("status", "Current")
        .eq("standard", "ISO/IEC 27001:2022")
        .order("document_number"),
      admin
        .from("internal_audit_findings")
        .select("id,finding_reference,title,finding_type,status")
        .eq("owner_id", organization.owner_id)
        .in("finding_type", ["major_nc", "minor_nc"])
        .order("created_at", { ascending: false }),
      admin
        .from("rca_cases")
        .select("id,case_reference,title,case_type,status")
        .eq("organization_id", organization.id)
        .order("updated_at", { ascending: false }),
      admin
        .from("hs_moc_changes")
        .select("id,moc_reference,title,status")
        .eq("organization_id", organization.id)
        .order("updated_at", { ascending: false }),
      admin
        .from("bcp_incident_management_assessments")
        .select("id,assessment_reference,assessment_title,status,version")
        .eq("organization_id", organization.id)
        .order("updated_at", { ascending: false }),
    ]);

  const error =
    peopleResult.error ||
    documentsResult.error ||
    findingsResult.error ||
    casesResult.error ||
    mocResult.error;
  if (error) throw new Error(error.message);

  return {
    people: (peopleResult.data || []).map((person) => ({
      ...person,
      name: incidentPersonName(person),
    })),
    sites: rcaAdministrationLocations(organization),
    documents: documentsResult.data || [],
    findings: findingsResult.data || [],
    cases: casesResult.data || [],
    changes: mocResult.data || [],
    // BCP escalation is optional. A user without BCP access must still be
    // able to report and manage an ISMS security incident.
    bcpIncidents: (bcpResult.error ? [] : bcpResult.data || []).map((assessment) => ({
      ...assessment,
      title:
        assessment.assessment_title ||
        assessment.assessment_reference ||
        "BCP incident-management assessment",
    })),
  };
}

export function requireIncidentPerson(people, id, label, { optional = false } = {}) {
  if (!id && optional) return null;
  const person = people.find((row) => row.id === id);
  if (!person) throw new Error(`${label} must be selected from the active Company User list.`);
  return person;
}

export function resolveIncidentSite(sites, id) {
  if (!id) return null;
  const site = sites.find((row) => row.id === id);
  if (!site) throw new Error("Select a current site from Administration â†’ Site Profile.");
  return site;
}
