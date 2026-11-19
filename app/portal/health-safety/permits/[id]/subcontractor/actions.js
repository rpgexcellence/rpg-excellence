"use server";

import { redirect } from "next/navigation";
import { createClient } from "../../../../../../lib/supabase/server";
import { getPermitAccess, mayIssuePermit } from "../../../../../../lib/permitAccess";
import { businessEmail, isRequestId, requestTable } from "../../../../../../lib/permit-subcontractor.mjs";
import { sendPermitSubcontractorRequest } from "../../../../../../lib/people-onboarding-email";

const origin = "https://www.rpgexcellence.com";

async function manageRequest(permitId, operation) {
  if (!isRequestId(permitId)) redirect("/portal/health-safety/permits");
  let result = "unavailable";
  try {
    const { data: { user } } = await (await createClient()).auth.getUser();
    if (user) {
      const access = await getPermitAccess(user.id, permitId);
      if (access.allowed && access.permit?.organization_id && mayIssuePermit(access)) {
        result = await operation(access, user);
      }
    }
  } catch {
    // The email provider and database may return private details.
  }
  redirect(`/portal/health-safety/permits/${permitId}?subcontractor=${result}#subcontractor`);
}

export async function requestSubcontractorInformation(permitId, form) {
  return manageRequest(permitId, async ({ admin, permit }, user) => {
    if (permit.status !== "draft") return "draft-required";
    const email = businessEmail(form.get("email"));
    if (!email) return "email-required";
    const { data: row, error } = await admin.from(requestTable).insert({
      permit_id: permit.id,
      permit_updated_at: permit.updated_at,
      recipient_email: email,
      requested_by: user.id,
    }).select("id,expires_at").single();
    if (error) return error.code === "23505" ? "active" : "unavailable";

    try {
      await sendPermitSubcontractorRequest({
        email,
        url: `${origin}/subcontractor/permit/${row.id}`,
        expiresAt: row.expires_at,
      });
      return "sent";
    } catch {
      const { data: revoked, error: revokeError } = await admin.from(requestTable).update({ revoked_at: new Date().toISOString() })
        .eq("permit_id", permit.id).eq("id", row.id).is("submitted_at", null).is("revoked_at", null)
        .select("id").maybeSingle();
      return revokeError || !revoked ? "delivery-uncertain" : "delivery-failed";
    }
  });
}

export async function revokeSubcontractorRequest(permitId, requestId) {
  return manageRequest(permitId, async ({ admin, permit }) => {
    if (!isRequestId(requestId)) return "unavailable";
    const { data, error } = await admin.from(requestTable).update({ revoked_at: new Date().toISOString() })
      .eq("permit_id", permit.id).eq("id", requestId).is("submitted_at", null).is("revoked_at", null)
      .select("id").maybeSingle();
    return !error && data ? "revoked" : "unavailable";
  });
}
