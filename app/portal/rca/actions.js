"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "../../../lib/supabase/server";
import {
  getUserSubscription,
  hasActiveSubscription,
} from "../../../lib/subscription";

const SOURCE_TYPES = [
  "assessment_finding",
  "audit",
  "complaint",
  "incident",
  "defect",
  "supplier",
  "standalone",
];

const SEVERITIES = [
  "critical",
  "high",
  "medium",
  "low",
];

const clean = (value) =>
  typeof value === "string" && value.trim()
    ? value.trim()
    : null;

export async function createRcaCase(formData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/portal/login");
  }

  const subscription =
    await getUserSubscription(user.id);

  if (!hasActiveSubscription(subscription)) {
    redirect("/en/pricing?subscription=required");
  }

  const organizationId = clean(
    formData.get("organization_id")
  );
  const title = clean(formData.get("title"));
  const problemStatement = clean(
    formData.get("problem_statement")
  );
  const rawSourceType = clean(
    formData.get("source_type")
  );
  const rawSeverity = clean(
    formData.get("severity")
  );
  const sourceType = rawSourceType?.toLowerCase();
  const severity = rawSeverity?.toLowerCase();

  if (!organizationId) {
    throw new Error("Organisation is required.");
  }

  if (!title) {
    throw new Error("8D case title is required.");
  }

  if (!SOURCE_TYPES.includes(sourceType)) {
    throw new Error("Invalid case source.");
  }

  if (!SEVERITIES.includes(severity)) {
    throw new Error("Invalid severity.");
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
    data: rcaCase,
    error: caseError,
  } = await supabase
    .from("rca_cases")
    .insert({
      owner_id: user.id,
      organization_id: organizationId,
      method: "8d",
      source_type: sourceType,
      title,
      problem_statement: problemStatement,
      severity,
      status: "draft",
      current_discipline: 0,
      detected_at: new Date().toISOString(),
    })
    .select("id, case_reference")
    .single();

  if (caseError || !rcaCase) {
    throw new Error(
      caseError?.message ?? "Unable to create 8D case."
    );
  }

  const { error: eventError } = await supabase
    .from("rca_case_events")
    .insert({
      case_id: rcaCase.id,
      owner_id: user.id,
      event_type: "case_created",
      discipline: 0,
      summary: `${rcaCase.case_reference} created`,
      event_data: {
        source_type: sourceType,
        severity,
      },
    });

  if (eventError) {
    throw new Error(eventError.message);
  }

  revalidatePath("/portal/rca");
  redirect(`/portal/rca/${rcaCase.id}`);
}
