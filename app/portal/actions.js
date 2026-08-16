"use server";

import { redirect } from "next/navigation";
import { createClient } from "../../lib/supabase/server";

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

  const employees =
    employeesRaw && employeesRaw !== ""
      ? Number(employeesRaw)
      : null;

  const { error } = await supabase
    .from("organizations")
    .insert({
      owner_id: user.id,
      name,
      industry,
      country,
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

  const organizationId = formData.get("organization_id");
  const standard = formData.get("standard");

  const { data, error } = await supabase
    .from("assessments")
    .insert({
      organization_id: organizationId,
      owner_id: user.id,
      standard,
      status: "draft",
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  redirect(`/portal/assessments/${data.id}`);
}
