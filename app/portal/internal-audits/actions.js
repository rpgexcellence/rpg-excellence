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

const AUDIT_METHODS = [
  "onsite",
  "remote",
  "hybrid",
];

function clean(value) {
  return typeof value === "string" && value.trim()
    ? value.trim()
    : null;
}

function uniqueClean(values) {
  const seen = new Set();
  const result = [];

  for (const value of values ?? []) {
    const cleaned = clean(value);

    if (!cleaned) {
      continue;
    }

    const identity = cleaned.toLocaleLowerCase("en-GB");

    if (seen.has(identity)) {
      continue;
    }

    seen.add(identity);
    result.push(cleaned);
  }

  return result;
}

function splitManualProcesses(value) {
  const cleaned = clean(value);

  if (!cleaned) {
    return [];
  }

  return uniqueClean(
    cleaned.split(/\r?\n|;/g)
  );
}

function selectedProcessesFrom(formData) {
  /*
   * Supported form contracts:
   *
   * - processes: repeated checkbox values
   * - selected_processes: repeated checkbox values
   * - process_ids: repeated values retained for compatibility
   * - other_processes / processes_other: manual audit trails
   *
   * The controlled database record currently stores the resolved
   * process scope in internal_audits.processes as newline-delimited
   * text. This preserves single- and multi-process selections without
   * requiring a schema migration.
   */
  const selected = uniqueClean([
    ...formData.getAll("processes"),
    ...formData.getAll("selected_processes"),
    ...formData.getAll("process_ids"),
  ]);

  const manual = uniqueClean([
    ...splitManualProcesses(
      formData.get("other_processes")
    ),
    ...splitManualProcesses(
      formData.get("processes_other")
    ),
  ]);

  return uniqueClean([
    ...selected,
    ...manual,
  ]);
}

function selectedProcessScopeFrom(formData, allowedStandardIds) {
  const raw = clean(formData.get("process_scope_json"));
  if (!raw) return [];

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("The selected process scope is invalid. Refresh the page and select the processes again.");
  }

  if (!Array.isArray(parsed) || parsed.length > 250) {
    throw new Error("The selected process scope is invalid.");
  }

  const allowed = new Set(allowedStandardIds);
  const seen = new Set();
  const result = [];

  for (const item of parsed) {
    const standardId = clean(item?.standard_id);
    const scopeKey = clean(item?.scope_key);
    const processName = clean(item?.process_name);

    if (!standardId || !allowed.has(standardId) || !scopeKey || !processName) {
      throw new Error("A selected process does not match the selected audit standards.");
    }
    if (!/^[a-z0-9-]{1,80}$/.test(scopeKey) || processName.length > 180) {
      throw new Error("A selected process contains an invalid controlled value.");
    }

    const identity = `${standardId}:${scopeKey}`;
    if (seen.has(identity)) continue;
    seen.add(identity);
    result.push({ standard_id: standardId, scope_key: scopeKey, process_name: processName });
  }

  return result;
}

function validDate(value) {
  return Boolean(
    value &&
      !Number.isNaN(
        new Date(value).getTime()
      )
  );
}

function validEmail(value) {
  if (!value) {
    return true;
  }

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function referenceFor() {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(
    now.getUTCMonth() + 1
  ).padStart(2, "0");
  const day = String(
    now.getUTCDate()
  ).padStart(2, "0");
  const suffix = crypto
    .randomUUID()
    .slice(0, 6)
    .toUpperCase();

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

async function removeIncompleteAudit(
  supabase,
  auditId,
  userId
) {
  const { error } = await supabase
    .from("internal_audits")
    .delete()
    .eq("id", auditId)
    .eq("owner_id", userId);

  if (error) {
    console.error(
      "Unable to remove incomplete internal audit:",
      error
    );
  }
}

export async function createInternalAudit(formData) {
  const { supabase, user } = await getContext();

  const organizationId = clean(
    formData.get("organization_id")
  );
  const title = clean(formData.get("title"));
  const auditType = clean(
    formData.get("audit_type")
  );
  const auditMethod = clean(
    formData.get("audit_method")
  );
  const plannedStart = clean(
    formData.get("planned_start_at")
  );
  const plannedEnd = clean(
    formData.get("planned_end_at")
  );
  const purpose = clean(
    formData.get("purpose")
  );
  const scopeStatement = clean(
    formData.get("scope_statement")
  );
  const auditeeEmail = clean(
    formData.get("auditee_contact_email")
  );
  const standardIds = uniqueClean(
    formData.getAll("standard_ids")
  );
  const selectedProcesses =
    selectedProcessesFrom(formData);
  const selectedProcessScope = selectedProcessScopeFrom(formData, standardIds);

  if (!organizationId) {
    throw new Error(
      "Organisation is required."
    );
  }

  if (!title) {
    throw new Error(
      "Audit title is required."
    );
  }

  if (
    !auditType ||
    !AUDIT_TYPES.includes(auditType)
  ) {
    throw new Error(
      "Select a valid audit type."
    );
  }

  if (
    !auditMethod ||
    !AUDIT_METHODS.includes(auditMethod)
  ) {
    throw new Error(
      "Select a valid audit method."
    );
  }

  if (
    !validDate(plannedStart) ||
    !validDate(plannedEnd)
  ) {
    throw new Error(
      "Valid planned start and end dates are required."
    );
  }

  const plannedStartDate = new Date(plannedStart);
  const plannedEndDate = new Date(plannedEnd);

  if (plannedEndDate <= plannedStartDate) {
    throw new Error(
      "The planned end must be later than the planned start."
    );
  }

  if (!purpose || !scopeStatement) {
    throw new Error(
      "Audit purpose and initial scope are required."
    );
  }

  if (standardIds.length === 0) {
    throw new Error(
      "Select at least one audit standard."
    );
  }

  if (!validEmail(auditeeEmail)) {
    throw new Error(
      "Enter a valid auditee email address."
    );
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

  if (
    organizationError ||
    !organization
  ) {
    throw new Error(
      "Organisation not found."
    );
  }

  const {
    data: validStandards,
    error: standardsError,
  } = await supabase
    .from(
      "internal_audit_standard_catalogue"
    )
    .select("id, standard_code, edition_label, display_name")
    .in("id", standardIds)
    .eq("active", true);

  if (standardsError) {
    throw new Error(
      standardsError.message
    );
  }

  if (
    (validStandards?.length ?? 0) !==
    standardIds.length
  ) {
    throw new Error(
      "One or more selected standards are unavailable."
    );
  }

  const auditReference = referenceFor();
  const processScope =
    selectedProcesses.length > 0
      ? selectedProcesses.join("\n")
      : null;

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
      objectives: clean(
        formData.get("objectives")
      ),
      scope_statement: scopeStatement,
      sites: clean(
        formData.get("sites")
      ),
      departments: clean(
        formData.get("departments")
      ),
      processes: processScope,
      known_risks_changes: clean(
        formData.get("known_risks_changes")
      ),
      auditee_contact_name: clean(
        formData.get("auditee_contact_name")
      ),
      auditee_contact_email: auditeeEmail,
      planned_start_at:
        plannedStartDate.toISOString(),
      planned_end_at:
        plannedEndDate.toISOString(),
    })
    .select("id")
    .single();

  if (auditError || !audit) {
    throw new Error(
      auditError?.message ??
        "Unable to create the audit."
    );
  }

  const selectedRows = standardIds.map(
    (standardId) => ({
      owner_id: user.id,
      audit_id: audit.id,
      standard_id: standardId,
      full_or_partial: "full",
    })
  );

  const { error: selectedError } =
    await supabase
      .from(
        "internal_audit_selected_standards"
      )
      .insert(selectedRows);

  if (selectedError) {
    await removeIncompleteAudit(
      supabase,
      audit.id,
      user.id
    );

    throw new Error(
      selectedError.message
    );
  }

  if (selectedProcessScope.length > 0) {
    const { error: processScopeError } = await supabase
      .from("internal_audit_selected_processes")
      .insert(selectedProcessScope.map((item) => ({
        owner_id: user.id,
        audit_id: audit.id,
        ...item,
      })));

    if (processScopeError) {
      await removeIncompleteAudit(supabase, audit.id, user.id);
      throw new Error(processScopeError.message);
    }
  }

  const standardSummary =
    (validStandards ?? []).map(
      (standard) => ({
        id: standard.id,
        standard_code:
          standard.standard_code,
        edition_label:
          standard.edition_label,
        display_name:
          standard.display_name,
      })
    );

  const { error: eventError } =
    await supabase
      .from("internal_audit_events")
      .insert({
        owner_id: user.id,
        audit_id: audit.id,
        event_type: "audit_created",
        summary: `${auditReference} created`,
        event_data: {
          audit_type: auditType,
          audit_method: auditMethod,
          standards: standardSummary,
          standard_count:
            standardSummary.length,
          processes: selectedProcesses,
          process_scope: selectedProcessScope,
          process_count:
            selectedProcesses.length,
          scope_basis:
            selectedProcesses.length > 0
              ? "selected_processes"
              : "initial_scope_statement",
        },
        created_by: user.id,
      });

  if (eventError) {
    console.error(
      "Unable to record audit creation event:",
      eventError
    );
  }

  revalidatePath(
    "/portal/internal-audits"
  );
  revalidatePath(
    `/portal/internal-audits/${audit.id}`
  );

  redirect(
    `/portal/internal-audits/${audit.id}?created=1`
  );
}
