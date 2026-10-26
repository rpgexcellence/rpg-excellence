"use server";

import { redirect } from "next/navigation";
import { createClient } from "../../../lib/supabase/server";
import { createAdminClient } from "../../../lib/supabase/admin";
import {
  buildCodeOfConductSections,
  calculateSupplierAssurance,
} from "../../../lib/supplier-assurance";

import { getUserSubscription, hasPlanAccess } from "../../../lib/subscription";
import { getOrganizationAccess } from "../../../lib/organization-access";
import { buildSupplierAnalytics, buildSupplierExecutiveBrief } from "../../../lib/supplier-reporting.mjs";

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
  let answers = json(fd, "due_diligence_answers", {});
  const riskInputs = json(fd, "risk_inputs", {});
  const documents = json(fd, "documents", []);
  const performance = json(fd, "performance", {});
  const sites = json(fd, "supplier_sites", []);
  const subtiers = json(fd, "subtier_suppliers", []);
  const contacts = json(fd, "supplier_contacts", []);
  const criticality = clean(fd.get("criticality")) || "medium";
  const gapContactIds = [...new Set(Object.values(answers).map((gap) => clean(gap?.gap_owner_contact_id)).filter(Boolean))];
  const gapReviewerIds = [...new Set(Object.values(answers).map((gap) => clean(gap?.gap_reviewer_person_id)).filter(Boolean))];
  const [gapContactsResult, gapReviewersResult] = await Promise.all([
    gapContactIds.length && id ? storageAdmin.from("supplier_contacts").select("id,first_name,last_name").eq("organization_id", organization.id).eq("supplier_id", id).in("id", gapContactIds) : { data: [] },
    gapReviewerIds.length ? storageAdmin.from("organization_people").select("id,first_name,last_name").eq("organization_id", organization.id).in("id", gapReviewerIds).in("account_status", ["active", "invited"]) : { data: [] },
  ]);
  if (gapContactsResult.error) return { error: `Supplier contact validation failed: ${gapContactsResult.error.message}` };
  if (gapReviewersResult.error) return { error: `Company reviewer validation failed: ${gapReviewersResult.error.message}` };
  const contactMap = new Map((gapContactsResult.data || []).map((person) => [person.id, person]));
  const reviewerMap = new Map((gapReviewersResult.data || []).map((person) => [person.id, person]));
  answers = Object.fromEntries(Object.entries(answers).map(([controlId, gap]) => {
    const contact = contactMap.get(clean(gap?.gap_owner_contact_id));
    const reviewer = reviewerMap.get(clean(gap?.gap_reviewer_person_id));
    return [controlId, { ...gap, gap_owner_contact_id: contact?.id || "", gap_owner: contact ? `${contact.first_name} ${contact.last_name || ""}`.trim() : "", gap_reviewer_person_id: reviewer?.id || "", gap_reviewer: reviewer ? `${reviewer.first_name} ${reviewer.last_name}` : "" }];
  }));
  const invalidClosedReview = Object.entries(answers).find(([, gap]) => gap?.gap_review_outcome === "effective" && (!gap.gap_reviewer_person_id || !gap.gap_review_date));
  if (invalidClosedReview) return { error: `Control ${invalidClosedReview[0]} requires a company reviewer and review date before it can be verified effective.` };

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

  if (intent === "approve") {
    const uncontrolledGaps = result.gaps.filter((gapId) => {
      const gap = answers[gapId] || {};
      return ["partial", "no"].includes(gap.response) && (!gap.gap_severity || !gap.gap_owner_contact_id || !gap.gap_due_date);
    });
    if (uncontrolledGaps.length) {
      return { error: `Assign severity, owner and due date to assurance gap${uncontrolledGaps.length === 1 ? "" : "s"}: ${uncontrolledGaps.join(", ")}.` };
    }
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

  const reviewMonths = Math.min(60, Math.max(1,
    Number(fd.get("review_frequency_months")) || result.reviewMonths
  ));
  const nextReviewDate = clean(fd.get("next_review_date")) || futureDate(reviewMonths);
  const approvalExpiry = clean(fd.get("approval_expiry")) || (intent === "approve" ? futureDate(reviewMonths) : null);

  if (intent === "approve" && approvalExpiry && nextReviewDate && approvalExpiry < nextReviewDate) {
    return { error: "Approval expiry cannot be earlier than the calculated next review date." };
  }

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
    approval_expiry: approvalExpiry,
    review_frequency_months: reviewMonths,
    next_review_date: nextReviewDate,
    monitoring_plan: {
      reviewMonths,
      engineRecommendedReviewMonths: result.reviewMonths,
      approverOverride: reviewMonths !== result.reviewMonths,
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
  let previousAnswers = {};

  if (id) {
    const { data: existing } = await supabase
      .from("suppliers")
      .select("id,version,due_diligence_answers")
      .eq("id", id)
      .eq("owner_id", user.id)
      .maybeSingle();

    if (!existing) {
      return { error: "Supplier record not found." };
    }
    previousAnswers = existing.due_diligence_answers || {};

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

  const changedControls = Object.keys(answers).filter((controlId) => JSON.stringify(previousAnswers[controlId] || {}) !== JSON.stringify(answers[controlId] || {}));
  if (changedControls.length) {
    const eventRows = changedControls.map((controlId) => {
      const before = previousAnswers[controlId] || null;
      const after = answers[controlId] || {};
      const outcome = after.gap_review_outcome || "open";
      return { supplier_id: savedId, organization_id: organization.id, owner_id: user.id, control_id: controlId,
        event_type: before ? (before.gap_review_outcome !== outcome ? "review_outcome_changed" : "control_updated") : "control_assessed",
        previous_value: before, new_value: after,
        event_summary: `${controlId} saved as ${String(after.response || "unanswered").replaceAll("_", " ")}; owner ${after.gap_owner || "unassigned"}; reviewer ${after.gap_reviewer || "unassigned"}; outcome ${String(outcome).replaceAll("_", " ")}.`,
        actor_user_id: user.id, actor_name: user.email || "Authenticated user" };
    });
    await supabase.from("supplier_due_diligence_events").insert(eventRows);
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

// Read-only board/report access. Existing supplier mutation actions above are
// intentionally retained, including approval authorisations and evidence checks.
async function supplierReportingContext() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect('/portal/login?next=/portal/suppliers?view=board');
  const [subscription, access] = await Promise.all([
    getUserSubscription(user.id), getOrganizationAccess('supplier_assurance', 'view'),
  ]);
  if (!hasPlanAccess(subscription, 'professional')) {
    redirect('/en/pricing?upgrade=professional&feature=Supplier%20Assurance#subscriptions');
  }
  if (!access.allowed || !access.organization || access.user?.id !== user.id) {
    throw new Error('You do not have access to this organisation’s supplier assurance records.');
  }
  if (subscription?.access_source === 'organization_subscription' &&
      subscription.organization_id !== access.organization.id) {
    throw new Error('The company subscription does not match the supplier organisation.');
  }
  return { user, organization: access.organization, subscription };
}

async function supplierReadAll(makeQuery, label) {
  const rows = [];
  let offset = 0, previousLast = null;
  for (;;) {
    const { data, error } = await makeQuery().order('id', { ascending: true }).range(offset, offset + 499);
    if (error) {
      console.error('SUPPLIER_BOARD_READ_FAILED', { source: label, code: error.code || 'query_failed' });
      throw new Error(`Supplier ${label} could not be loaded. No incomplete totals have been displayed.`);
    }
    if (!Array.isArray(data)) throw new Error(`Supplier ${label} returned an invalid result.`);
    if (!data.length) break;
    const last = data[data.length - 1]?.id;
    if (!last || last === previousLast) throw new Error(`Supplier ${label} pagination could not be completed.`);
    rows.push(...data);
    previousLast = last;
    // Advance by the actual returned size: a server may cap below 500 rows.
    offset += data.length;
  }
  return rows;
}

async function loadSupplierReportingSnapshot(ctx) {
  // Admin reads occur only after signed-in identity, company module permission
  // and commercial access checks. Every read is constrained to this company’s
  // owner AND to its authorised supplier IDs; no client-provided owner is used.
  const admin = createAdminClient();
  const org = ctx.organization;
  if (!org.id || !org.owner_id) throw new Error('Supplier organisation ownership is unavailable.');
  const suppliers = await supplierReadAll(() => admin.from('suppliers')
    .select('id,legal_name,trading_name,organization_id,supplier_types,applicable_standards,criticality,risk_result,assurance_result,approval_status,approval_expiry,next_review_date,updated_at')
    .eq('organization_id', org.id).eq('owner_id', org.owner_id), 'register');
  const ids = suppliers.map(s => s.id);
  const child = async (table, columns, label, hasOrganization = false) => {
    const result = [];
    for (let i = 0; i < ids.length; i += 100) {
      const batch = ids.slice(i, i + 100);
      result.push(...await supplierReadAll(() => {
        let query = admin.from(table).select(columns).eq('owner_id', org.owner_id).in('supplier_id', batch);
        if (hasOrganization) query = query.eq('organization_id', org.id);
        return query;
      }, label));
    }
    return result;
  };
  const [reviews, actions, findings, subtiers, audits] = await Promise.all([
    child('supplier_quarterly_business_reviews', 'id,supplier_id,qbr_reference,quarter,review_date,next_qbr_date,status,scorecard,recommended_decision,updated_at', 'completed reviews', true),
    child('supplier_qbr_actions', 'id,supplier_id,qbr_id,action_reference,action_required,due_date,status,closed_at', 'QBR actions', true),
    child('internal_audit_findings', 'id,supplier_id,finding_reference,title,status,linked_rca_case_id,closure_verified,created_at', 'findings'),
    child('supplier_subtier_suppliers', 'id,supplier_id,legal_name,approval_status,certification_standard,certificate_expiry', 'sub-tier assurance'),
    child('internal_audits', 'id,supplier_id,audit_reference,title,status,current_gate,planned_start_at,planned_end_at', 'audits'),
  ]);
  return {
    asOf: new Date().toISOString().slice(0, 10), fetchedAt: new Date().toISOString(),
    organization: { id: org.id, name: org.name || 'Organisation', country: org.country || null },
    suppliers, reviews, actions, findings, subtiers, audits, warnings: [],
    canExecutiveReport: hasPlanAccess(ctx.subscription, 'consultant'),
  };
}

export async function getSupplierManagementBoardSnapshot() {
  const ctx = await supplierReportingContext();
  return loadSupplierReportingSnapshot(ctx);
}

function supplierReportFilters(fd, snapshot) {
  if (!fd || typeof fd.get !== 'function' || typeof fd.getAll !== 'function') throw new Error('Invalid report options.');
  const supplierIds = [...new Set(fd.getAll('supplier_id').map(clean).filter(Boolean))];
  const allowedIds = new Set(snapshot.suppliers.map(s => s.id));
  if (supplierIds.some(id => !allowedIds.has(id))) throw new Error('A selected supplier is outside your authorised portfolio.');
  const risk = clean(fd.get('risk')) || 'all';
  if (!['all','critical','high','medium','low','unassessed'].includes(risk)) throw new Error('Invalid supplier risk filter.');
  const category = clean(fd.get('category')) || 'all';
  const standard = clean(fd.get('standard')) || 'all';
  const values = key => new Set(snapshot.suppliers.flatMap(s => Array.isArray(s[key]) ? s[key] : []));
  if (category !== 'all' && !values('supplier_types').has(category)) throw new Error('Invalid supplier category filter.');
  if (standard !== 'all' && !values('applicable_standards').has(standard)) throw new Error('Invalid supplier standard filter.');
  return { from: clean(fd.get('from')), to: clean(fd.get('to')), supplierIds, risk, category, standard };
}

export async function createSupplierExecutiveReport(fd) {
  // Server actions can be called directly, so authorisation is repeated here.
  const ctx = await supplierReportingContext();
  if (!hasPlanAccess(ctx.subscription, 'consultant')) {
    return { error: 'Executive reporting requires Consultant access or an RPG platform-administrator entitlement.' };
  }
  try {
    const snapshot = await loadSupplierReportingSnapshot(ctx);
    const filters = supplierReportFilters(fd, snapshot);
    const analytics = buildSupplierAnalytics(snapshot, filters);
    return {
      report: {
        reference: `SUP-${crypto.randomUUID()}`,
        generatedAt: new Date().toISOString(), organization: snapshot.organization,
        analytics, brief: buildSupplierExecutiveBrief(analytics),
      },
    };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'The supplier executive report could not be prepared.' };
  }
}
