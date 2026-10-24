"use server";
import { assertIncidentCommand } from "../../../lib/incident-policy.mjs";
import {
  prepareIncidentPhoto,
  storeIncidentPhoto,
} from "../../../lib/incident-photo";
import { revalidatePath } from "next/cache";
import {
  incidentContext,
  incidentCase,
  checkResult,
  synchroniseIncidentPlanning,
} from "../../../lib/incidents";
import { validateOutcomes, validateBodyParts } from "../../../lib/incident-reporting.mjs";
import { validateIncidentIntake, UUID } from "../../../lib/incident-policy.mjs";
import { randomUUID } from "node:crypto";
const allowed = new Set([
  "triage",
  "approve_director",
  "verify_case",
  "link_records",
  "create_moc",
  "link_moc",
  "investigate",
  "allocate_task",
  "reallocate_task",
  "complete_task",
  "verify_task",
  "return_task",
  "cancel_task",
  "create_rca",
  "link_rca",
  "create_security",
  "link_security",
  "publish_update",
  "close",
  "reopen",
]);
export async function incidentCommand(_state, fd) {
  try {
    const context = await incidentCase(String(fd.get("id") || ""));
    const command = String(fd.get("command") || "");
    if (!allowed.has(command)) throw Error("Unknown incident command.");
    const values = Object.fromEntries(fd);
    for (const k of [
      "team_person_ids",
      "support_person_ids",
      "domains",
      "security_impacts",
    ])
      values[k] = fd.getAll(k);
    values.investigation_details = Object.fromEntries(
      [...fd].filter(([key]) => key.startsWith("investigation_") && key !== "investigation_summary")
        .map(([key,value]) => [key.slice(14), String(value)])
    );
    if(command === "investigate" && fd.get("consequences_reviewed") === "on") {
      const outcomes=validateOutcomes(fd.getAll("reviewed_outcomes"),context.report.domains);
      if(!outcomes.length) throw Error("Choose the assessed consequences, including no harm where appropriate.");
      values.investigation_details.reviewed_outcomes=outcomes;
      values.investigation_details.outcome_other=String(fd.get("reviewed_outcome_other")||"").trim();
      if(outcomes.some(x=>x.endsWith(":other"))&&values.investigation_details.outcome_other.length<3) throw Error("Describe the other assessed consequence.");
    } else if(command === "investigate" && Array.isArray(context.report.investigation_details?.reviewed_outcomes)) {
      values.investigation_details.reviewed_outcomes=context.report.investigation_details.reviewed_outcomes;
      values.investigation_details.outcome_other=context.report.investigation_details.outcome_other||"";
    }
    if(command === "investigate" && fd.get("body_parts_reviewed") === "on") {
      const parts=validateBodyParts(fd.getAll("reviewed_body_parts"));
      if(!context.report.domains.includes("health_safety")) throw Error("Body parts apply only to H&S reports.");
      if(!parts.length) throw Error("Choose the assessed body part or not known / not applicable.");
      values.investigation_details.reviewed_body_parts=parts;
      values.investigation_details.body_part_other=String(fd.get("reviewed_body_part_other")||"").trim();
      if(parts.includes("other")&&values.investigation_details.body_part_other.length<3) throw Error("Describe the other assessed body part.");
    } else if(command === "investigate" && Array.isArray(context.report.investigation_details?.reviewed_body_parts)) {
      values.investigation_details.reviewed_body_parts=context.report.investigation_details.reviewed_body_parts;
      values.investigation_details.body_part_other=context.report.investigation_details.body_part_other||"";
    }
    if (command === "triage" && !context.incidentEntitlement.advanced) {
      for (const key of ["linked_bcp_plan_id", "pack_code"]) {
        if (!fd.has(key)) values[key] = context.report[key] || "";
      }
    }
    assertIncidentCommand(context.incidentEntitlement, command, values, context.report);
    values.personal_data_suspected = fd.get("personal_data_suspected") === "on";
    if (command !== "triage") delete values.domains;
    if (JSON.stringify(values).length > 50000)
      throw Error("The submission is too large.");
    const version = Number(fd.get("version"));
    if (!Number.isInteger(version) || version < 1)
      throw Error("Refresh the case before saving.");
    checkResult(
      await context.admin.rpc("incident_command", {
        p_actor: context.user.id,
        p_org: context.organization.id,
        p_id: context.report.id,
        p_version: version,
        p_command: command,
        p_values: values,
      }),
    );
    let warning = "";
    if (context.incidentEntitlement.advanced && ["triage", "close", "reopen"].includes(command)) {
      try {
        const report = checkResult(
          await context.admin
            .from("incident_reports")
            .select("*")
            .eq("id", context.report.id)
            .eq("organization_id", context.organization.id)
            .single(),
        );
        await synchroniseIncidentPlanning(context, report);
      } catch (e) {
        console.error("Incident planning sync:", e);
        warning =
          " The case was saved, but inspection planning could not refresh. Use Retry inspection planning below; no submission is lost.";
      }
    }
    for (const path of [
      "/portal/incidents",
      "/portal/incidents/" + context.report.id,
      "/portal/tasks",
      "/portal/health-safety/workplace-inspections",
    ])
      revalidatePath(path);
    return {
      success:
        "Saved. Refresh this case before making another change." + warning,
    };
  } catch (e) {
    if (e.digest) throw e;
    return { error: e.message || "Unable to save. Please try again." };
  }
}
export async function submitInternalIncident(_state, fd) {
  try {
    const context = await incidentContext();
    const { values, contact } = validateIncidentIntake({
      ...Object.fromEntries(fd),
      domains: fd.getAll("domains"),
      requested_workflows: fd.getAll("requested_workflows"),
      outcomes: fd.getAll("outcomes"),
      body_parts: fd.getAll("body_parts"),
      anonymous: fd.get("anonymous") !== "false",
      immediate_danger: fd.get("immediate_danger") === "on",
      contact_consent: fd.get("contact_consent") === "on",
    });
    const photoFile = fd.get("photo");
    const site = String(fd.get("site_id") || ""),
      zone = String(fd.get("zone_id") || "");
    if (!UUID.test(site) || (zone && !UUID.test(zone)))
      throw Error("Select a valid site and zone.");
    const result = checkResult(
      await context.admin.rpc("submit_internal_incident", {
        p_actor: context.user.id,
        p_org: context.organization.id,
        p_site: site,
        p_zone: zone || null,
        p_values: values,
        p_contact: contact,
      }),
    );
    revalidatePath("/portal/incidents");
    let photoAttached = false,
      photoWarning = "";
    if (photoFile?.size) {
      try {
        const photo = await prepareIncidentPhoto(photoFile);
        await storeIncidentPhoto({
          admin: context.admin,
          organizationId: context.organization.id,
          incidentId: result.id,
          photo,
          actorUserId: values.anonymous ? null : context.user.id,
        });
        photoAttached = true;
      } catch (error) {
        console.error(
          "Internal report accepted; photo attachment failed:",
          error.message,
        );
        photoWarning =
          "Your report was received, but its photo could not be attached. Do not submit again. Ask the incident administrator to add the original photo to this case.";
      }
    }
    return {
      reference: result.reference,
      photo_attached: photoAttached,
      photo_warning: photoWarning,
    };
  } catch (e) {
    if (e.digest) throw e;
    return { error: e.message };
  }
}
export async function retryInspectionPlanning(_state, fd) {
  try {
    const c = await incidentCase(String(fd.get("id") || ""));
    if (!c.incidentEntitlement.advanced) throw Error("Professional access is required for inspection planning integration.");
    if (!c.incidentAdministrator)
      throw Error("Incident administrator authority required.");
    await synchroniseIncidentPlanning(c, c.report);
    revalidatePath("/portal/health-safety/workplace-inspections");
    return { success: "Inspection signals and plans refreshed." };
  } catch (e) {
    if (e.digest) throw e;
    return { error: e.message };
  }
}
export async function uploadIncidentEvidence(_state, fd) {
  try {
    const c = await incidentCase(String(fd.get("id") || ""));
    if (!c.incidentEntitlement.advanced) throw Error("Professional access is required for investigation evidence. Photos can still be submitted with a new report.");
    if (["closed", "rejected", "duplicate"].includes(c.report.status))
      throw Error("Reopen this case before adding evidence.");
    if (
      !c.incidentAdministrator &&
      (!["contribute", "review", "approve", "admin"].includes(c.level) ||
        ![
          c.report.investigator_person_id,
          c.report.verifier_person_id,
          ...c.report.team_person_ids,
        ].includes(c.person?.id))
    )
      throw Error("Assigned contributor authority required.");
    const f = fd.get("evidence");
    if (!f?.size || f.size > 5242880) throw Error("Choose a file up to 5 MB.");
    const b = Buffer.from(await f.arrayBuffer());
    let mime = "",
      ext = "";
    if (b.subarray(0, 3).equals(Buffer.from([255, 216, 255]))) {
      mime = "image/jpeg";
      ext = "jpg";
    } else if (
      b.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
    ) {
      mime = "image/png";
      ext = "png";
    } else if (
      b.subarray(0, 4).toString() === "RIFF" &&
      b.subarray(8, 12).toString() === "WEBP"
    ) {
      mime = "image/webp";
      ext = "webp";
    } else if (b.subarray(0, 5).toString() === "%PDF-") {
      mime = "application/pdf";
      ext = "pdf";
    } else throw Error("Only JPEG, PNG, WebP and PDF evidence is accepted.");
    const path = `${c.organization.id}/${c.report.id}/${randomUUID()}.${ext}`;
    checkResult(
      await c.admin.storage
        .from("incident-evidence")
        .upload(path, b, { contentType: mime, upsert: false }),
    );
    const result = await c.admin.from("incident_evidence").insert({
      organization_id: c.organization.id,
      incident_id: c.report.id,
      storage_path: path,
      file_name: "Evidence." + ext,
      mime_type: mime,
      size_bytes: b.length,
      uploaded_by: c.user.id,
    });
    if (result.error) {
      await c.admin.storage.from("incident-evidence").remove([path]);
      throw Error("Evidence could not be registered. Try again.");
    }
    checkResult(
      await c.admin.from("incident_events").insert({
        organization_id: c.organization.id,
        incident_id: c.report.id,
        actor_user_id: c.user.id,
        event_type: "evidence_added",
        summary: "Private supporting evidence added.",
      }),
    );
    revalidatePath("/portal/incidents/" + c.report.id);
    return { success: "Private evidence stored." };
  } catch (e) {
    if (e.digest) throw e;
    return { error: e.message };
  }
}
