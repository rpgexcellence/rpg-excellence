"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "../../../lib/supabase/server";
import {
  getUserSubscription,
  hasActiveSubscription,
} from "../../../lib/subscription";

import {loadRcaCompanyLinks,resolveRcaSource} from "../../../lib/rcaCompanyLinks";

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

export async function createRcaCase(previousState,formData) {
  try {
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
  const caseType = clean(formData.get("case_type"))?.toLowerCase();

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
  if (!['capa','8d'].includes(caseType)) throw new Error("Select CAPA or 8D.");

  const {
    data: organization,
    error: organizationError,
  } = await supabase
    .from("organizations")
    .select("*")
    .eq("id", organizationId)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (organizationError || !organization) {
    throw new Error("Organisation not found.");
  }

  if (["audit","supplier"].includes(sourceType)) {
    const options=await loadRcaCompanyLinks(organization);
    const link=resolveRcaSource(options,formData);
    const {data:caseId,error}=await supabase.rpc("rca_open_linked_nc_case",{
      p_organization_id:organizationId,p_source_type:sourceType,p_audit_id:link.audit?.id || null,
      p_supplier_id:link.supplier?.id || null,p_finding_id:link.finding.id,p_title:title,p_problem:problemStatement,p_severity:severity
    });
    if(error || !caseId)throw new Error(error?.message || "Unable to open the linked NC case.");
    await supabase.from("rca_cases").update({case_type:caseType,capa_current_stage:caseType==="capa"?"correction":null}).eq("id",caseId).eq("owner_id",user.id);
    revalidatePath("/portal/rca");redirect(`/portal/rca/${caseId}`);
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
      case_type: caseType,
      capa_current_stage: caseType === "capa" ? "correction" : null,
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
        case_type: caseType,
      },
    });

  if (eventError) {
    throw new Error(eventError.message);
  }

  revalidatePath("/portal/rca");
  redirect(`/portal/rca/${rcaCase.id}`);
  } catch(error) {if(error?.digest?.startsWith("NEXT_REDIRECT"))throw error;return {error:error.message || "Unable to create case."};}
}
