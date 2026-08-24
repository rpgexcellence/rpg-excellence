"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "../../../lib/supabase/server";

const AUDIT_TYPES = [
  "internal_system",
  "internal_process",
  "internal_compliance",
  "supplier",
  "second_party",
  "follow_up",
  "integrated",
];

const AUDIT_METHODS = ["onsite", "remote", "hybrid"];

function clean(value) {
  return typeof value === "string" && value.trim()
    ? value.trim()
    : null;
}

function referenceFor() {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const day = String(now.getUTCDate()).padStart(2, "0");
  const suffix = crypto.randomUUID().slice(0, 6).toUpperCase();

  return `IA-${year}${month}${day}-${suffix}`;
}

async function getContext() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect(
      "/portal/login?next=/portal/internal-audits"
    );
  }

  return { supabase, user };
}

export async function createInternalAudit(formData) {
  const { supabase, user } = await getContext();

  const organizationId = clean(
    formData.get("organization_id")
  );
  const title = clean(formData.get("title"));
  const auditType = clean(formData.get("audit_type"));
  const auditMethod = clean(formData.get("audit_method"));
  const plannedStart = clean(formData.get("planned_start_at"));
  const plannedEnd = clean(formData.get("planned_end_at"));
  const purpose = clean(formData.get("purpose"));
  const scopeStatement = clean(formData.get("scope_statement"));
  const standardIds = formData
    .getAll("standard_ids")
    .filter((value) => typeof value === "string" && value.trim());

  if (!organizationId) {
    throw new Error("Organisation is required.");
  }

  if (!title) {
    throw new Error("Audit title is required.");
  }

  if (!auditType || !AUDIT_TYPES.includes(auditType)) {
    throw new Error("Select a valid audit type.");
  }

  if (!auditMethod || !AUDIT_METHODS.includes(auditMethod)) {
    throw new Error("Select a valid audit method.");
  }

  if (!plannedStart || !plannedEnd) {
    throw new Error("Planned start and end dates are required.");
  }

  if (new Date(plannedEnd) < new Date(plannedStart)) {
    throw new Error("The planned end must not be before the start.");
  }

  if (!purpose || !scopeStatement) {
    throw new Error("Audit purpose and initial scope are required.");
  }

  if (standardIds.length === 0) {
    throw new Error("Select at least one audit standard.");
  }

  const {
    data: organization,
    error: organizationError,
  } = await supabase
    .from("organizations")
    .select("id")
    .eq("id", organizationId)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (organizationError || !organization) {
    throw new Error("Organisation not found.");
  }

  const {
    data: validStandards,
    error: standardsError,
  } = await supabase
    .from("internal_audit_standard_catalogue")
    .select("id")
    .in("id", standardIds)
    .eq("active", true);

  if (standardsError) {
    throw new Error(standardsError.message);
  }

  if ((validStandards?.length ?? 0) !== new Set(standardIds).size) {
    throw new Error("One or more selected standards are unavailable.");
  }

  const auditReference = referenceFor();

  const {
    data: audit,
    error: auditError,
  } = await supabase
    .from("internal_audits")
    .insert({
      owner_id: user.id,
      organization_id: organizationId,
      audit_reference: auditReference,
      title,
      audit_type: auditType,
      audit_method: auditMethod,
      status: "draft",
      current_gate: "scope",
      purpose,
      objectives: clean(formData.get("objectives")),
      scope_statement: scopeStatement,
      sites: clean(formData.get("sites")),
      departments: clean(formData.get("departments")),
      processes: clean(formData.get("processes")),
      known_risks_changes: clean(
        formData.get("known_risks_changes")
      ),
      auditee_contact_name: clean(
        formData.get("auditee_contact_name")
      ),
      auditee_contact_email: clean(
        formData.get("auditee_contact_email")
      ),
      planned_start_at: new Date(plannedStart).toISOString(),
      planned_end_at: new Date(plannedEnd).toISOString(),
    })
    .select("id")
    .single();

  if (auditError || !audit) {
    throw new Error(
      auditError?.message ?? "Unable to create the audit."
    );
  }

  const selectedRows = [...new Set(standardIds)].map(
    (standardId) => ({
      owner_id: user.id,
      audit_id: audit.id,
      standard_id: standardId,
      full_or_partial: "full",
    })
  );

  const { error: selectedError } = await supabase
    .from("internal_audit_selected_standards")
    .insert(selectedRows);

  if (selectedError) {
    await supabase
      .from("internal_audits")
      .delete()
      .eq("id", audit.id)
      .eq("owner_id", user.id);

    throw new Error(selectedError.message);
  }

  await supabase.from("internal_audit_events").insert({
    owner_id: user.id,
    audit_id: audit.id,
    event_type: "audit_created",
    summary: `${auditReference} created`,
    event_data: {
      audit_type: auditType,
      audit_method: auditMethod,
      standard_count: selectedRows.length,
    },
    created_by: user.id,
  });

  revalidatePath("/portal/internal-audits");
  redirect(
    `/portal/internal-audits?created=${audit.id}`
  );
}
