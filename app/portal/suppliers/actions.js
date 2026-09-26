"use server";

import { redirect } from "next/navigation";
import { createClient } from "../../../lib/supabase/server";
import { createAdminClient } from "../../../lib/supabase/admin";
import {
  buildCodeOfConductSections,
  calculateSupplierAssurance,
} from "../../../lib/supplier-assurance";

const clean = (value) => String(value ?? "").trim();

const json = (fd, name, fallback) => {
  try {
    return JSON.parse(clean(fd.get(name)) || JSON.stringify(fallback));
  } catch {
    return fallback;
  }
};

const bool = (value) =>
  value === true ||
  value === "true" ||
  value === "yes" ||
  value === "on";

const futureDate = (months) => {
  const date = new Date();
  date.setUTCMonth(date.getUTCMonth() + months);
  return date.toISOString().slice(0, 10);
};

const uuid = (value) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(clean(value));
const safeFileName = (value) => clean(value).replace(/[^a-zA-Z0-9._-]/g, "-").slice(-140);
const allowedFileTypes = new Set([
  "application/pdf", "image/png", "image/jpeg", "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

async function uploadEvidence(supabase, organizationId, supplierId, file, folder) {
  if (!file || typeof file === "string" || file.size === 0) return null;
  if (file.size > 10 * 1024 * 1024) throw new Error(`${file.name} exceeds the 10 MB evidence limit.`);
  if (!allowedFileTypes.has(file.type)) throw new Error(`${file.name} is not an accepted evidence format.`);
  const path = `${organizationId}/${supplierId}/${folder}/${crypto.randomUUID()}-${safeFileName(file.name)}`;
  const { error } = await supabase.storage.from("supplier-assurance-evidence").upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw new Error(`Evidence upload failed: ${error.message}`);
  return { path, file_name: file.name, mime_type: file.type, size_bytes: file.size };
}

async function context() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/portal/login?next=/portal/suppliers");
  }

  const {
    data: organization,
    error,
  } = await supabase
    .from("organizations")
    .select("*")
    .eq("owner_id", user.id)
    .order("created_at")
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!organization) {
    return { supabase, user, organization: null };
  }

  return { supabase, user, organization };
}

export async function saveSupplier(_state, fd) {
  const { supabase, user, organization } = await context();
  const storageAdmin = createAdminClient();

  if (!organization) {
    return {
      error: "Create your organisation before adding a supplier.",
    };
  }

  const id = clean(fd.get("supplier_id"));
  const intent = clean(fd.get("intent")) || "save";
  const legalName = clean(fd.get("legal_name"));
  const address = clean(fd.get("registered_address"));
  const supplyDescription = clean(fd.get("supply_description"));
  const types = json(fd, "supplier_types", []);
  const standards = json(fd, "applicable_standards", []);
  const answers = json(fd, "due_diligence_answers", {});
  const riskInputs = json(fd, "risk_inputs", {});
  const documents = json(fd, "documents", []);
  const performance = json(fd, "performance", {});
  const sites = json(fd, "supplier_sites", []);
  const subtiers = json(fd, "subtier_suppliers", []);
  const contacts = json(fd, "supplier_contacts", []);
  const criticality = clean(fd.get("criticality")) || "medium";

  if (!legalName || !address || !supplyDescription) {
    return {
      error:
        "Supplier legal name, registered address and supply description are required.",
    };
  }

  if (!types.length) {
    return {
      error: "Select at least one supplier classification.",
    };
  }

  if (!standards.length) {
    return {
      error: "Select at least one applicable standard.",
    };
  }

  const result = calculateSupplierAssurance({
    standards,
    types,
    answers,
    riskInputs,
    criticality,
  });

  if (intent === "approve" && result.blockers.length) {
    return {
      error:
        `Approval is blocked by ${result.blockers.length} unresolved mandatory control` +
        `${result.blockers.length === 1 ? "" : "s"}.`,
    };
  }

  const approverPersonId = clean(fd.get("approved_by_person_id"));
  let approver = null;

  if (intent === "approve" && !approverPersonId) {
    return {
      error: "Select a company user authorised as Approver before approval.",
    };
  }
  if (approverPersonId) {
    const { data: person } = await supabase.from("organization_people").select("id,first_name,last_name,email").eq("id", approverPersonId).eq("organization_id", organization.id).maybeSingle();
    const { data: authorization } = await supabase.from("organization_person_authorizations").select("id,expires_at").eq("person_id", approverPersonId).eq("organization_id", organization.id).eq("function_key", "approver").eq("status", "authorised").maybeSingle();
    const expired = authorization?.expires_at && authorization.expires_at < new Date().toISOString().slice(0, 10);
    if (!person || !authorization || expired) return { error: "The selected company user does not hold a current Approver authorisation." };
    approver = `${person.first_name} ${person.last_name} · ${person.email}`;
  }

  const status =
    intent === "approve"
      ? "approved"
      : intent === "submit"
        ? "pending_approval"
        : intent === "conditional"
          ? "conditionally_approved"
          : intent === "suspend"
            ? "suspended"
            : "draft";

  const reviewMonths =
    Number(fd.get("review_frequency_months")) ||
    result.reviewMonths;

  const now = new Date().toISOString();

  const data = {
    owner_id: user.id,
    organization_id: organization.id,
    legal_name: legalName,
    trading_name: clean(fd.get("trading_name")) || null,
    registered_address: address,
    country: clean(fd.get("country")) || null,
    company_number: clean(fd.get("company_number")) || null,
    website: clean(fd.get("website")) || null,
    primary_contact_name: (() => { const contact = contacts.find((item) => item.is_primary) || contacts[0]; return contact ? `${clean(contact.first_name)} ${clean(contact.last_name)}`.trim() || null : null; })(),
    primary_contact_title: contacts.find((contact) => contact.is_primary)?.business_title || contacts[0]?.business_title || null,
    primary_contact_email: contacts.find((contact) => contact.is_primary)?.email || contacts[0]?.email || null,
    primary_contact_phone: contacts.find((contact) => contact.is_primary)?.telephone || contacts[0]?.telephone || null,
    supply_description: supplyDescription,
    supplier_types: types,
    applicable_standards: standards,
    sites_and_scope: clean(fd.get("sites_and_scope")) || null,
    uses_subtier_suppliers: bool(
      fd.get("uses_subtier_suppliers")
    ),
    criticality,
    risk_inputs: riskInputs,
    risk_result: {
      riskScore: result.riskScore,
      riskBand: result.riskBand,
      recommendation: result.recommendation,
    },
    due_diligence_answers: answers,
    assurance_result: {
      assuranceScore: result.assuranceScore,
      blockers: result.blockers,
      gaps: result.gaps,
      applicableCount: result.applicableCount,
    },
    approval_status: status,
    approval_scope: clean(fd.get("approval_scope")) || null,
    approval_conditions:
      clean(fd.get("approval_conditions")) || null,
    approved_by_person_id: approverPersonId || null,
    approved_by: approver || null,
    approved_at: intent === "approve" ? now : null,
    approval_expiry:
      clean(fd.get("approval_expiry")) ||
      (intent === "approve"
        ? futureDate(reviewMonths)
        : null),
    review_frequency_months: reviewMonths,
    next_review_date:
      clean(fd.get("next_review_date")) ||
      futureDate(reviewMonths),
    monitoring_plan: {
      reviewMonths,
      auditRequired: ["High", "Critical"].includes(
        result.riskBand
      ),
      enhancedMonitoring: ["High", "Critical"].includes(
        result.riskBand
      ),
    },
    documents,
    performance,
    updated_at: now,
  };

  let savedId = id;

  if (id) {
    const { data: existing } = await supabase
      .from("suppliers")
      .select("id,version")
      .eq("id", id)
      .eq("owner_id", user.id)
      .maybeSingle();

    if (!existing) {
      return { error: "Supplier record not found." };
    }

    const { error } = await supabase
      .from("suppliers")
      .update({
        ...data,
        version:
          Number(existing.version || 1) +
          (intent === "approve" ? 1 : 0),
      })
      .eq("id", id)
      .eq("owner_id", user.id);

    if (error) {
      return { error: error.message };
    }
  } else {
    const reference =
      `SUP-${new Date().getUTCFullYear()}-` +
      crypto.randomUUID().slice(0, 6).toUpperCase();

    const { data: created, error } = await supabase
      .from("suppliers")
      .insert({
        ...data,
        supplier_reference: reference,
      })
      .select("id")
      .single();

    if (error) {
      return { error: error.message };
    }

    savedId = created.id;
  }

  const siteRows = sites.filter((site) => clean(site.site_name) || clean(site.address) || clean(site.scope)).map((site) => ({
    ...(uuid(site.id) ? { id: site.id } : {}), supplier_id: savedId, organization_id: organization.id, owner_id: user.id,
    site_name: clean(site.site_name), address: clean(site.address), scope: clean(site.scope),
    approval_status: ["approved", "conditionally_approved", "not_approved", "pending", "suspended"].includes(site.approval_status) ? site.approval_status : "not_approved",
  }));
  if (siteRows.some((site) => !site.site_name || !site.address || !site.scope)) return { error: "Each supplier site requires a name, full address and operational scope." };
  const retainedSiteIds = siteRows.filter((site) => site.id).map((site) => site.id);
  let deleteSites = supabase.from("supplier_sites").delete().eq("supplier_id", savedId);
  if (retainedSiteIds.length) deleteSites = deleteSites.not("id", "in", `(${retainedSiteIds.join(",")})`);
  await deleteSites;
  if (siteRows.length) {
    const { error } = await supabase.from("supplier_sites").upsert(siteRows);
    if (error) return { error: `Supplier saved, but sites could not be saved: ${error.message}` };
  }

  const contactRows = contacts.filter((contact) => clean(contact.first_name) || clean(contact.last_name) || clean(contact.email)).map((contact) => ({
    ...(uuid(contact.id) ? { id: contact.id } : {}), supplier_id: savedId, organization_id: organization.id, owner_id: user.id,
    first_name: clean(contact.first_name), last_name: clean(contact.last_name) || null,
    business_title: clean(contact.business_title) || null, department: clean(contact.department) || null,
    telephone: clean(contact.telephone) || null, mobile: clean(contact.mobile) || null,
    email: clean(contact.email).toLowerCase(), is_primary: Boolean(contact.is_primary), is_active: contact.is_active !== false,
    updated_at: now,
  }));
  if (contactRows.some((contact) => !contact.first_name || !contact.email)) return { error: "Each supplier contact requires a first name and email address." };
  if (contactRows.filter((contact) => contact.is_primary).length > 1) return { error: "Only one supplier contact can be marked as primary." };
  const retainedContactIds = contactRows.filter((contact) => contact.id).map((contact) => contact.id);
  let deleteContacts = supabase.from("supplier_contacts").delete().eq("supplier_id", savedId);
  if (retainedContactIds.length) deleteContacts = deleteContacts.not("id", "in", `(${retainedContactIds.join(",")})`);
  await deleteContacts;
  for (const contact of contactRows.filter((item) => item.id)) {
    const { id: contactId, ...values } = contact;
    const { error } = await supabase.from("supplier_contacts").update(values).eq("id", contactId).eq("supplier_id", savedId).eq("owner_id", user.id);
    if (error) return { error: `Supplier saved, but an existing contact could not be updated: ${error.message}` };
  }
  const newContacts = contactRows.filter((item) => !item.id).map(({ id: _unused, ...values }) => values);
  if (newContacts.length) {
    const { error } = await supabase.from("supplier_contacts").insert(newContacts);
    if (error) return { error: `Supplier saved, but new contacts could not be added: ${error.message}` };
  }

  const retainedSubtierIds = subtiers.filter((supplier) => uuid(supplier.id)).map((supplier) => supplier.id);
  let deleteSubtiers = supabase.from("supplier_subtier_suppliers").delete().eq("supplier_id", savedId);
  if (retainedSubtierIds.length) deleteSubtiers = deleteSubtiers.not("id", "in", `(${retainedSubtierIds.join(",")})`);
  await deleteSubtiers;
  for (const supplier of subtiers.filter((item) => clean(item.legal_name) || clean(item.supply_scope))) {
    if (!clean(supplier.legal_name) || !clean(supplier.supply_scope)) return { error: "Each sub-tier supplier requires its legal name and supply scope." };
    const existingId = uuid(supplier.id) ? supplier.id : null;
    let existing = null;
    if (existingId) {
      const result = await supabase.from("supplier_subtier_suppliers").select("certificate_storage_path,certificate_file_name,reminder_date,reminder_sent_at").eq("id", existingId).eq("supplier_id", savedId).maybeSingle();
      existing = result.data;
    }
    const certificate = await uploadEvidence(storageAdmin, organization.id, savedId, fd.get(`subtier_certificate_${supplier.client_key}`), "subtier-certificates");
    const row = {
      ...(existingId ? { id: existingId } : {}), supplier_id: savedId, organization_id: organization.id, owner_id: user.id,
      legal_name: clean(supplier.legal_name), supply_scope: clean(supplier.supply_scope),
      approval_status: ["approved", "conditionally_approved", "not_approved", "pending", "suspended", "expired"].includes(supplier.approval_status) ? supplier.approval_status : "not_approved",
      certification_standard: clean(supplier.certification_standard) || null, certificate_number: clean(supplier.certificate_number) || null,
      certification_body: clean(supplier.certification_body) || null, certificate_expiry: clean(supplier.certificate_expiry) || null,
      reminder_date: clean(supplier.reminder_date) || null, reminder_sent_at: existing?.reminder_date === clean(supplier.reminder_date) ? existing?.reminder_sent_at : null,
      certificate_storage_path: certificate?.path || existing?.certificate_storage_path || null,
      certificate_file_name: certificate?.file_name || existing?.certificate_file_name || null,
      updated_at: now,
    };
    const { error } = await supabase.from("supplier_subtier_suppliers").upsert(row);
    if (error) return { error: `Supplier saved, but a sub-tier supplier could not be saved: ${error.message}` };
  }

  for (const [name, value] of fd.entries()) {
    if (!name.startsWith("evidence_file_") || !value || typeof value === "string" || value.size === 0) continue;
    const controlId = name.slice("evidence_file_".length).replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 50);
    const uploaded = await uploadEvidence(storageAdmin, organization.id, savedId, value, "due-diligence");
    const { error } = await supabase.from("supplier_evidence_files").insert({ supplier_id: savedId, organization_id: organization.id, owner_id: user.id, control_id: controlId, storage_path: uploaded.path, file_name: uploaded.file_name, mime_type: uploaded.mime_type, size_bytes: uploaded.size_bytes, uploaded_by: user.id });
    if (error) return { error: `Supplier saved, but evidence metadata could not be saved: ${error.message}` };
  }

  redirect(`/portal/suppliers?id=${savedId}&saved=1`);
}

export async function generateSupplierCodeOfConduct(fd) {
  const { supabase, user, organization } = await context();
  const supplierId = clean(fd.get("supplier_id"));

  if (!organization || !supplierId) {
    redirect("/portal/suppliers");
  }

  const { data: supplier, error } = await supabase
    .from("suppliers")
    .select("*")
    .eq("id", supplierId)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (error || !supplier) {
    throw new Error(
      error?.message || "Supplier record not found."
    );
  }

  if (
    !supplier.legal_name ||
    !supplier.registered_address
  ) {
    throw new Error(
      "Complete the supplier name and address before generating the Code of Conduct."
    );
  }

  const { data: latest, error: latestError } =
    await supabase
      .from("supplier_code_of_conduct_documents")
      .select("id,version")
      .eq("supplier_id", supplier.id)
      .eq("owner_id", user.id)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();

  if (latestError) {
    throw new Error(latestError.message);
  }

  const version = Number(latest?.version || 0) + 1;
  const standards =
    supplier.applicable_standards || [];

  const sections = buildCodeOfConductSections({
    standards,
    types: supplier.supplier_types || [],
    supplierName: supplier.legal_name,
  });

  const reference =
    `RPG-SCOC-${new Date().getUTCFullYear()}-` +
    `${supplier.supplier_reference
      .replace(/[^A-Z0-9]/gi, "")
      .slice(-10)}-V${version}`;

  const review = new Date();
  review.setUTCFullYear(review.getUTCFullYear() + 1);

  const {
    data: document,
    error: insertError,
  } = await supabase
    .from("supplier_code_of_conduct_documents")
    .insert({
      supplier_id: supplier.id,
      organization_id: organization.id,
      owner_id: user.id,
      document_reference: reference,
      version,
      status: "issued",
      review_date: review.toISOString().slice(0, 10),
      supplier_snapshot: {
        legalName: supplier.legal_name,
        tradingName: supplier.trading_name,
        address: supplier.registered_address,
        country: supplier.country,
        companyNumber: supplier.company_number,
        contactName: supplier.primary_contact_name,
        contactTitle: supplier.primary_contact_title,
        contactEmail: supplier.primary_contact_email,
        supplyDescription: supplier.supply_description,
        approvalScope: supplier.approval_scope,
        types: supplier.supplier_types,
      },
      organization_snapshot: {
        name: organization.name,
        country: organization.country,
        industry: organization.industry,
      },
      standards_snapshot: standards,
      sections,
      declaration: {
        acknowledgement:
          "The Supplier confirms that it understands and will apply the requirements of this Code throughout the approved scope and relevant supply chain.",
        responseDueDays: 20,
      },
      generated_by: user.email,
    })
    .select("id")
    .single();

  if (insertError) {
    throw new Error(insertError.message);
  }

  if (latest?.id) {
    await supabase
      .from("supplier_code_of_conduct_documents")
      .update({
        status: "superseded",
        updated_at: new Date().toISOString(),
      })
      .eq("id", latest.id)
      .eq("owner_id", user.id);
  }

  redirect(
    `/portal/suppliers/${supplier.id}/code-of-conduct?document=${document.id}`
  );
}
