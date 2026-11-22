"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireOrganizationAccess } from "../../../../../lib/organization-access";
import { createAdminClient } from "../../../../../lib/supabase/admin";
import { briefingRoot, riskRoot } from "../../../../../lib/risk-distribution";

const uuid = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;

export async function communicateAssessment(id, formData) {
  if (!uuid.test(id)) throw new Error("Invalid assessment.");
  const path = riskRoot + "/" + id;
  const access = await requireOrganizationAccess("risk_management", "contribute", path + "?tab=distribution");
  const recipients = [...new Set(formData.getAll("recipient"))];
  const due = formData.get("acknowledgement_due");
  if (!recipients.length || recipients.some(value => typeof value !== "string" || !uuid.test(value)) ||
      (due && (typeof due !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(due)))) {
    redirect(path + "?tab=distribution&distribution=invalid");
  }
  const { error } = await createAdminClient().rpc("hs_communicate_assessment", {
    p_organization: access.organization.id, p_assessment: id, p_actor: access.user.id,
    p_recipients: recipients, p_due: due || null,
  });
  if (error) redirect(path + "?tab=distribution&distribution=send-error");
  revalidatePath(path);
  revalidatePath(riskRoot);
  revalidatePath("/portal/tasks");
  redirect(path + "?tab=distribution&distribution=sent");
}

export async function acknowledgeAssessment(id) {
  if (!uuid.test(id)) throw new Error("Invalid assessment.");
  const path = briefingRoot + "/" + id;
  const access = await requireOrganizationAccess(null, "view", path);
  const { error } = await createAdminClient().rpc("hs_acknowledge_assessment", {
    p_organization: access.organization.id, p_assessment: id, p_actor: access.user.id,
  });
  if (error) redirect(path + "?result=error");
  revalidatePath(path);
  revalidatePath(riskRoot + "/" + id);
  revalidatePath("/portal/tasks");
  redirect(path + "?result=acknowledged");
}
