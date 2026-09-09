import { createAdminClient } from "./supabase/admin";
import { getUserSubscription, hasActiveSubscription } from "./subscription";

async function getRedeemedAssessmentPass(userId, assessmentId) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("assessment_passes")
    .select("id, access_expires_at, remediation_expires_at")
    .eq("owner_id", userId)
    .eq("assessment_id", assessmentId)
    .eq("status", "redeemed")
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Unable to verify assessment pass:", error);
    return null;
  }

  return data ?? null;
}

export async function canEditAssessment(userId, assessmentId) {
  if (hasActiveSubscription(await getUserSubscription(userId))) return true;
  const pass = await getRedeemedAssessmentPass(userId, assessmentId);
  return Boolean(
    pass?.access_expires_at &&
    new Date(pass.access_expires_at) > new Date()
  );
}

export async function requireAssessmentWriteAccess(userId, assessmentId) {
  if (!(await canEditAssessment(userId, assessmentId))) {
    throw new Error("This assessment is read-only because its completion access has ended. Your retained results remain available.");
  }
}

export async function canManageAssessmentRemediation(userId, assessmentId) {
  if (hasActiveSubscription(await getUserSubscription(userId))) return true;
  const pass = await getRedeemedAssessmentPass(userId, assessmentId);
  return Boolean(
    pass?.remediation_expires_at &&
    new Date(pass.remediation_expires_at) > new Date()
  );
}

export async function requireAssessmentRemediationAccess(userId, assessmentId) {
  if (!(await canManageAssessmentRemediation(userId, assessmentId))) {
    throw new Error("Corrective-action access for this assessment has ended. The assessment, findings and retained reports remain available as read-only records.");
  }
}

export async function getAssessmentAccessState(userId, assessmentId) {
  if (hasActiveSubscription(await getUserSubscription(userId))) {
    return {
      source: "subscription",
      assessmentPassId: null,
      canEditAssessment: true,
      canManageRemediation: true,
      assessmentExpiresAt: null,
      remediationExpiresAt: null,
    };
  }

  const pass = await getRedeemedAssessmentPass(userId, assessmentId);
  const now = new Date();

  return {
    source: pass ? "single_assessment" : "none",
    assessmentPassId: pass?.id ?? null,
    canEditAssessment: Boolean(
      pass?.access_expires_at && new Date(pass.access_expires_at) > now
    ),
    canManageRemediation: Boolean(
      pass?.remediation_expires_at &&
      new Date(pass.remediation_expires_at) > now
    ),
    assessmentExpiresAt: pass?.access_expires_at ?? null,
    remediationExpiresAt: pass?.remediation_expires_at ?? null,
  };
}
