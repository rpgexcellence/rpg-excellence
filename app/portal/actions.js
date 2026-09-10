"use server";

import { redirect } from "next/navigation";
import { createClient } from "../../lib/supabase/server";
import {
  getUserSubscription,
  getAvailableAssessmentPasses,
  getAvailableStandaloneSoaPasses,
  hasActiveSubscription,
} from "../../lib/subscription";

const AVAILABLE_ASSESSMENT_STANDARDS = [
  "ISO 9001:2015/Amd 1:2024",
  "ISO 14001:2026",
  "ISO 45001:2018",
  "ISO/IEC 27001:2022",
  "ISO/IEC 17024:2026",
];

export async function createOrganization(formData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/portal/login");
  }

  const name = formData.get("name");
  const industry = formData.get("industry");
  const country = formData.get("country");
  const employeesRaw = formData.get("employees");

  if (
    typeof name !== "string" ||
    name.trim() === ""
  ) {
    throw new Error(
      "Organisation name is required."
    );
  }

  const employees =
    employeesRaw &&
    employeesRaw !== ""
      ? Number(employeesRaw)
      : null;

  if (
    employees !== null &&
    (!Number.isInteger(employees) ||
      employees < 1)
  ) {
    throw new Error(
      "Number of employees must be a positive whole number."
    );
  }

  const { error } = await supabase
    .from("organizations")
    .insert({
      owner_id: user.id,
      name: name.trim(),
      industry:
        typeof industry === "string" &&
        industry.trim() !== ""
          ? industry.trim()
          : null,
      country:
        typeof country === "string" &&
        country.trim() !== ""
          ? country.trim()
          : null,
      employees,
    });

  if (error) {
    throw new Error(error.message);
  }

  redirect("/portal");
}

export async function createAssessment(formData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/portal/login");
  }

  // --------------------------------------------------
  // VERIFY ACTIVE SUBSCRIPTION
  // --------------------------------------------------

  const subscription =
    await getUserSubscription(
      user.id
    );

  const subscribed = hasActiveSubscription(subscription);

  // --------------------------------------------------
  // READ AND VALIDATE FORM VALUES
  // --------------------------------------------------

  const organizationId =
    formData.get(
      "organization_id"
    );

  const standardRaw =
    formData.get("standard");

  if (
    typeof organizationId !==
      "string" ||
    organizationId.trim() === ""
  ) {
    throw new Error(
      "Organisation is required."
    );
  }

  if (
    typeof standardRaw !==
      "string" ||
    standardRaw.trim() === ""
  ) {
    throw new Error(
      "ISO standard is required."
    );
  }

  const standard =
    standardRaw.trim();

  if (
    !AVAILABLE_ASSESSMENT_STANDARDS.includes(
      standard
    )
  ) {
    throw new Error(
      "The selected ISO standard is not available."
    );
  }

  const passes = subscribed ? [] : await getAvailableAssessmentPasses(user.id);
  const pass = passes.find((item) => item.standard === standard) ?? null;
  if (!subscribed && !pass) redirect(`/en/pricing?assessment=required&standard=${encodeURIComponent(standard)}`);

  // --------------------------------------------------
  // VERIFY ORGANISATION OWNERSHIP
  // --------------------------------------------------

  const {
    data: organization,
    error: organizationError,
  } = await supabase
    .from("organizations")
    .select("id")
    .eq(
      "id",
      organizationId
    )
    .eq(
      "owner_id",
      user.id
    )
    .maybeSingle();

  if (
    organizationError ||
    !organization
  ) {
    throw new Error(
      "Organisation not found."
    );
  }

  // --------------------------------------------------
  // CREATE ASSESSMENT
  // --------------------------------------------------

  const {
    data,
    error,
  } = await supabase
    .from("assessments")
    .insert({
      organization_id:
        organizationId,
      owner_id: user.id,
      standard,
      status: "draft",
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(
      error.message
    );
  }

  if (pass) {
    const { createAdminClient } = await import("../../lib/supabase/admin");
    const admin = createAdminClient();
    const now = new Date().toISOString();
    const { data: claimed, error: claimError } = await admin.from("assessment_passes")
      .update({ status: "redeemed", assessment_id: data.id, organization_id: organizationId, redeemed_at: now, updated_at: now })
      .eq("id", pass.id).eq("owner_id", user.id).eq("status", "available").gt("access_expires_at", now).select("id").maybeSingle();
    if (claimError || !claimed) {
      await admin.from("assessments").delete().eq("id", data.id).eq("owner_id", user.id);
      throw new Error("This assessment purchase has already been used or has expired.");
    }
  }

  redirect(
    `/portal/assessments/${data.id}`
  );
}

export async function createStandaloneSoa(formData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/portal/login");

  const organizationId = formData.get("organization_id");
  if (typeof organizationId !== "string" || !organizationId.trim()) {
    throw new Error("Organisation is required.");
  }

  const { data: organization } = await supabase
    .from("organizations")
    .select("id")
    .eq("id", organizationId)
    .eq("owner_id", user.id)
    .maybeSingle();
  if (!organization) throw new Error("Organisation not found.");

  const subscribed = hasActiveSubscription(await getUserSubscription(user.id));
  const passes = subscribed ? [] : await getAvailableStandaloneSoaPasses(user.id);
  const pass = passes[0] ?? null;
  if (!subscribed && !pass) redirect("/en/pricing?soa=required");

  const { data: assessment, error: assessmentError } = await supabase
    .from("assessments")
    .insert({
      organization_id: organizationId,
      owner_id: user.id,
      standard: "ISO/IEC 27001:2022",
      status: "draft",
      workspace_type: "soa_only",
    })
    .select("id")
    .single();
  if (assessmentError || !assessment) throw new Error(assessmentError?.message ?? "Unable to create SoA workspace.");

  const { createAdminClient } = await import("../../lib/supabase/admin");
  const admin = createAdminClient();
  const now = new Date().toISOString();

  if (pass) {
    const { data: claimed, error: claimError } = await admin
      .from("assessment_passes")
      .update({ status: "redeemed", assessment_id: assessment.id, organization_id: organizationId, redeemed_at: now, updated_at: now })
      .eq("id", pass.id)
      .eq("owner_id", user.id)
      .eq("product_type", "standalone_soa")
      .eq("status", "available")
      .gt("access_expires_at", now)
      .select("id")
      .maybeSingle();
    if (claimError || !claimed) {
      await admin.from("assessments").delete().eq("id", assessment.id).eq("owner_id", user.id);
      throw new Error("This SoA purchase has already been used or has expired.");
    }
  }

  const { data: registerId, error: provisionError } = await admin.rpc("provision_iso27001_soa", {
    p_assessment_id: assessment.id,
    p_owner_id: user.id,
    p_organization_id: organizationId,
  });
  if (provisionError || !registerId) {
    throw new Error(provisionError?.message ?? "Unable to provision the 93-control SoA.");
  }

  redirect(`/portal/assessments/${assessment.id}/soa`);
}
