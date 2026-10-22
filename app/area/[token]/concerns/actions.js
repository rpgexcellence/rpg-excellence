"use server";
import {
  prepareIncidentPhoto,
  storeIncidentPhoto,
} from "../../../../lib/incident-photo";
import { headers } from "next/headers";
import { createHash } from "node:crypto";
import {
  publicReportZone,
  verifyReportTicket,
  intakeFingerprint,
  checkResult,
} from "../../../../lib/incidents";
import { validateIncidentIntake } from "../../../../lib/incident-policy.mjs";
export async function reportZoneConcern(_state, fd) {
  try {
    const token = String(fd.get("token") || "");
    const { admin, zone } = await publicReportZone(token);
    if (fd.get("website")) throw Error("Unable to accept this submission.");
    const ticket = verifyReportTicket(fd.get("ticket"), token);
    const { values, contact } = validateIncidentIntake({
      ...Object.fromEntries(fd),
      domains: fd.getAll("domains"),
      anonymous: fd.get("anonymous") !== "false",
      immediate_danger: fd.get("immediate_danger") === "on",
      contact_consent: fd.get("contact_consent") === "on",
    });
    const photoFile = fd.get("photo");
    const requestHeaders = await headers();
    const ip =
      requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      requestHeaders.get("x-real-ip") ||
      "unknown";
    const result = checkResult(
      await admin.rpc("submit_public_incident", {
        p_token: token,
        p_submission: ticket.submission,
        p_receipt_hash: createHash("sha256")
          .update(ticket.receipt)
          .digest("hex"),
        p_fingerprint: intakeFingerprint(ip, token),
        p_values: values,
        p_contact: contact,
      }),
    );
    let photoAttached = false,
      photoWarning = "";
    if (photoFile?.size) {
      try {
        const photo = await prepareIncidentPhoto(photoFile);
        await storeIncidentPhoto({
          admin,
          organizationId: zone.organization_id,
          incidentId: result.id,
          photo,
        });
        photoAttached = true;
      } catch (error) {
        console.error(
          "Report accepted; photo attachment failed:",
          error.message,
        );
        photoWarning =
          "Your report was received, but its photo could not be attached. Do not submit another report. Keep the original photo and provide it to the incident administrator using your report reference.";
      }
    }
    return {
      reference: result.reference,
      receipt: ticket.receipt,
      photo_attached: photoAttached,
      photo_warning: photoWarning,
    };
  } catch (error) {
    if (error.digest) throw error;
    if (error.code === "INCIDENT_PHOTO_INVALID")
      return { error: error.message };
    console.error("Incident intake failed:", error.message);
    return {
      error: error.message?.includes("too many")
        ? error.message
        : "Report not saved. Check the entries, refresh if this form has expired, and try again. If reporting remains unavailable, contact the site team directly.",
    };
  }
}
export async function checkReportProgress(_state, fd) {
  try {
    const token = String(fd.get("token") || "");
    const { admin, zone } = await publicReportZone(token);
    const reference = String(fd.get("reference") || "")
      .trim()
      .toUpperCase();
    const secret = String(fd.get("receipt") || "").trim();
    if (!/^[A-Za-z0-9_-]{43}$/.test(secret) || reference.length > 50)
      return { error: "Reference or access key not recognised." };
    const r = checkResult(
      await admin
        .from("incident_reports")
        .select("reference,status,public_update,created_at,updated_at")
        .eq("zone_id", zone.id)
        .eq("reference", reference)
        .eq("receipt_hash", createHash("sha256").update(secret).digest("hex"))
        .maybeSingle(),
    );
    if (!r) return { error: "Reference or access key not recognised." };
    return {
      success: `${r.reference} · ${r.status.replaceAll("_", " ")}. ${r.public_update || "No public progress update has been published yet."}`,
    };
  } catch (e) {
    if (e.digest) throw e;
    return {
      error:
        "Progress checking is temporarily unavailable. Please try again later.",
    };
  }
}
