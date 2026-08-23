"use server";

import { redirect } from "next/navigation";
import { createClient } from "../../lib/supabase/server";
import {
  getUserSubscription,
  hasActiveSubscription,
} from "../../lib/subscription";

const AVAILABLE_ASSESSMENT_STANDARDS = [
  "ISO 9001:2015/Amd 1:2024",
  "ISO 14001:2026",
  "ISO 45001:2018",
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

  if (
    !hasActiveSubscription(
      subscription
    )
  ) {
    redirect(
      "/en/pricing?subscription=required"
    );
  }

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

  redirect(
    `/portal/assessments/${data.id}`
  );
}
