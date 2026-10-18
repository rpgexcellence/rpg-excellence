"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireOrganizationAccess } from "../../../../lib/organization-access";
import {
  loadSecurityIncidentOptions,
  requireIncidentPerson,
  resolveIncidentSite,
} from "../../../../lib/ismsSecurityIncidents";
import { createAdminClient } from "../../../../lib/supabase/admin";

const text = (formData, key, max = 10000) => {
  const value = String(formData.get(key) || "").trim();
  if (value.length > max) throw new Error(`${key.replaceAll("_", " ")} is too long.`);
  return value || null;
};
const checked = (formData, key) => formData.get(key) === "true";
const optionalBoolean = (formData, key) => {
  const value = String(formData.get(key) || "");
  return value === "yes" ? true : value === "no" ? false : null;
};
const INCIDENT_TYPES = new Set(["security_event","unauthorised_access","data_breach","malware","phishing","service_disruption","api_integration","supplier_incident","vulnerability","other"]);
const SEVERITIES = new Set(["low","medium","high","critical"]);
const STATUSES = new Set(["reported","triage","contained","investigating","recovery","action_required","awaiting_verification","closed","cancelled"]);
const EVIDENCE_TYPES = new Set(["log","screenshot","request_id","configuration","communication","specialist_report","other"]);
const MAX_FILE_BYTES = 10 * 1024 * 1024;

function selected(options, key, value, label) {
  if (!value) return null;
  const row = options[key].find((item) => item.id === value);
  if (!row) throw new Error(`Select a current ${label}.`);
  return row;
}

export async function saveSecurityIncident(formData) {
  const access = await requireOrganizationAccess(
    "information_security",
    "contribute",
    "/portal/information-security/incidents",
  );
  const { user, organization } = access;
  const admin = createAdminClient();
  const options = await loadSecurityIncidentOptions(organization);
  const id = text(formData, "id", 80);
  const title = text(formData, "title", 220);
  const description = text(formData, "description", 8000);
  const incidentType = text(formData, "incident_type", 60);
  const severity = text(formData, "severity", 20);
  const status = text(formData, "status", 40) || "reported";
  const detectedAt = text(formData, "detected_at", 40);
  if (!title || !description || !detectedAt || !INCIDENT_TYPES.has(incidentType) || !SEVERITIES.has(severity) || !STATUSES.has(status)) {
    throw new Error("Complete the incident title, description, type, severity and detection date.");
  }

  const incidentLead = requireIncidentPerson(options.people, text(formData,"incident_lead_person_id",80), "Incident lead");
  const technicalLead = requireIncidentPerson(options.people, text(formData,"technical_lead_person_id",80), "Technical lead", { optional: true });
  const privacyLead = requireIncidentPerson(options.people, text(formData,"privacy_lead_person_id",80), "Privacy lead", { optional: true });
  const communicationsLead = requireIncidentPerson(options.people, text(formData,"communications_lead_person_id",80), "Communications lead", { optional: true });
  const verifier = requireIncidentPerson(options.people, text(formData,"verifier_person_id",80), "Independent verifier", { optional: true });
  const closureApprover = requireIncidentPerson(options.people, text(formData,"closure_approved_by_person_id",80), "Closure approver", { optional: true });
  if (verifier && verifier.id === incidentLead.id) throw new Error("The incident lead cannot independently verify their own incident.");

  const site = resolveIncidentSite(options.sites, text(formData,"administration_location_id",100));
  const linkedFinding = selected(options,"findings",text(formData,"linked_finding_id",80),"Finding");
  const linkedCase = selected(options,"cases",text(formData,"linked_rca_case_id",80),"CAPA-8D case");
  const linkedMoc = selected(options,"changes",text(formData,"linked_moc_id",80),"Management of Change record");
  const linkedBcp = selected(options,"bcpIncidents",text(formData,"linked_bcp_incident_id",80),"BCP incident-management assessment");

  if (status === "closed" && (!verifier || !closureApprover || !text(formData,"recovery_summary",8000))) {
    throw new Error("Recovery evidence, an independent verifier and a closure approver are required before closure.");
  }

  const payload = {
    organization_id: organization.id,
    owner_id: organization.owner_id,
    title,
    description,
    incident_type: incidentType,
    severity,
    status,
    detected_at: detectedAt,
    awareness_at: text(formData,"awareness_at",40),
    administration_location_id: site?.id || null,
    administration_location_label: site?.label || null,
    affected_service: text(formData,"affected_service",2000),
    affected_organization: text(formData,"affected_organization",1000),
    affected_data: text(formData,"affected_data",4000),
    immediate_impact: text(formData,"immediate_impact",4000),
    continuing_risk: text(formData,"continuing_risk",4000),
    incident_lead_person_id: incidentLead.id,
    technical_lead_person_id: technicalLead?.id || null,
    privacy_lead_person_id: privacyLead?.id || null,
    communications_lead_person_id: communicationsLead?.id || null,
    verifier_person_id: verifier?.id || null,
    personal_data_involved: checked(formData,"personal_data_involved"),
    notification_assessment: text(formData,"notification_assessment",5000),
    ico_notification_required: optionalBoolean(formData,"ico_notification_required"),
    ico_notified_at: text(formData,"ico_notified_at",40),
    affected_people_notification_required: optionalBoolean(formData,"affected_people_notification_required"),
    affected_people_notified_at: text(formData,"affected_people_notified_at",40),
    ncsc_reported_at: text(formData,"ncsc_reported_at",40),
    containment_summary: text(formData,"containment_summary",8000),
    investigation_summary: text(formData,"investigation_summary",8000),
    recovery_summary: text(formData,"recovery_summary",8000),
    root_cause_summary: text(formData,"root_cause_summary",8000),
    lessons_learned: text(formData,"lessons_learned",8000),
    linked_finding_id: linkedFinding?.id || null,
    linked_rca_case_id: linkedCase?.id || null,
    linked_moc_id: linkedMoc?.id || null,
    linked_bcp_incident_id: linkedBcp?.id || null,
    target_recovery_date: text(formData,"target_recovery_date",20),
    closed_at: status === "closed" ? new Date().toISOString() : null,
    closure_approved_by_person_id: closureApprover?.id || null,
    updated_by_user_id: user.id,
    updated_at: new Date().toISOString(),
  };

  let incident;
  if (id) {
    const { data, error } = await admin.from("isms_security_incidents").update(payload)
      .eq("id",id).eq("organization_id",organization.id).select("id,incident_reference").single();
    if (error || !data) throw new Error(error?.message || "The security incident could not be updated.");
    incident = data;
  } else {
    const now = new Date();
    payload.incident_reference = `SEC-INC-${now.getUTCFullYear()}${String(now.getUTCMonth()+1).padStart(2,"0")}${String(now.getUTCDate()).padStart(2,"0")}-${randomUUID().slice(0,6).toUpperCase()}`;
    payload.created_by_user_id = user.id;
    const { data, error } = await admin.from("isms_security_incidents").insert(payload).select("id,incident_reference").single();
    if (error || !data) throw new Error(error?.message || "The security incident could not be created.");
    incident = data;
  }

  const documentIds = [...new Set(formData.getAll("controlled_document_ids").map(String).filter(Boolean))];
  const validDocuments = options.documents.filter((document) => documentIds.includes(document.id));
  await admin.from("isms_security_incident_documents").delete().eq("incident_id",incident.id).eq("organization_id",organization.id);
  if (validDocuments.length) {
    const { error } = await admin.from("isms_security_incident_documents").insert(validDocuments.map((document) => ({
      organization_id: organization.id,
      incident_id: incident.id,
      controlled_document_id: document.id,
      link_purpose: document.document_number === "RPG-SEC-PRO-003" ? "governing_procedure" : "evidence",
      created_by_user_id: user.id,
    })));
    if (error) throw new Error(error.message);
  }

  const evidence = formData.get("evidence_file");
  if (evidence instanceof File && evidence.size > 0) {
    if (evidence.size > MAX_FILE_BYTES) throw new Error("Evidence files must not exceed 10 MB.");
    const evidenceType = text(formData,"evidence_type",40) || "other";
    if (!EVIDENCE_TYPES.has(evidenceType)) throw new Error("Select a valid evidence type.");
    const safeName = evidence.name.replace(/[^a-zA-Z0-9._-]/g,"-");
    const storagePath = `${organization.id}/${incident.id}/${randomUUID()}-${safeName}`;
    const { error: uploadError } = await admin.storage.from("isms-security-incident-evidence").upload(storagePath,evidence,{contentType:evidence.type || "application/octet-stream"});
    if (uploadError) throw new Error(uploadError.message);
    const { error: recordError } = await admin.from("isms_security_incident_evidence").insert({
      organization_id: organization.id,
      incident_id: incident.id,
      evidence_type: evidenceType,
      description: text(formData,"evidence_description",1000),
      storage_path: storagePath,
      original_file_name: evidence.name,
      mime_type: evidence.type || null,
      file_size_bytes: evidence.size,
      uploaded_by_user_id: user.id,
    });
    if (recordError) throw new Error(recordError.message);
  }

  revalidatePath("/portal/information-security");
  revalidatePath("/portal/information-security/incidents");
  redirect(`/portal/information-security/incidents/${incident.id}?saved=1`);
}
