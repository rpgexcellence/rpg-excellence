"use server";

import { redirect } from "next/navigation";
import { createClient } from "../../../lib/supabase/server";
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

  const approver = clean(fd.get("approved_by"));

  if (intent === "approve" && !approver) {
    return {
      error: "Record the competent approver before approval.",
    };
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
    primary_contact_name:
      clean(fd.get("primary_contact_name")) || null,
    primary_contact_title:
      clean(fd.get("primary_contact_title")) || null,
    primary_contact_email:
      clean(fd.get("primary_contact_email")) || null,
    primary_contact_phone:
      clean(fd.get("primary_contact_phone")) || null,
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
    approved_by: intent === "approve" ? approver : null,
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
