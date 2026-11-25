"use server";

import { saveControlledAsset } from "../../../../lib/asset-save";
import { addAssetInterval, CALIBRATION_RESULTS, validDay } from "../../../../lib/asset-catalog";
import { requireAssetAccess } from "../../../../lib/asset-management";
import { ASSET_UUID, recordPath, requireAssetRecord } from "../../../../lib/asset-record";
import { createClient } from "../../../../lib/supabase/server";
import { redirect } from "next/navigation";

import {
  randomUUID,
} from "node:crypto";

import {
  revalidatePath,
} from "next/cache";

import {
  requireOrganizationAccess,
} from "../../../../lib/organization-access";

import {
  createAdminClient,
} from "../../../../lib/supabase/admin";

import {
  loadAdministrationLocations,
} from "../../../../lib/rcaCompanyLinks";

import {
  getUserSubscription,
  hasPlanAccess,
} from "../../../../lib/subscription";

const clean = (
  value,
  max = 2000,
) =>
  String(value || "")
    .trim()
    .slice(0, max);

const ASSET_TYPES = new Set([
  "plant",
  "equipment",
  "room_area",
  "electrical_system",
  "process_system",
  "vehicle",
  "other",
]);

const STATUSES = new Set([
  "active",
  "out_of_service",
  "retired",
]);

const CRITICALITIES = new Set([
  "low",
  "medium",
  "high",
  "critical",
]);

const FREQUENCY_UNITS =
  new Set([
    "days",
    "weeks",
    "months",
    "years",
  ]);

const MAINTENANCE_TYPES =
  new Set([
    "planned",
    "inspection",
    "calibration",
    "statutory",
    "repair",
    "breakdown",
    "other",
  ]);

const OWNER_TYPES = new Set([
  "internal",
  "supplier",
]);

const MAX_EVIDENCE_SIZE =
  10 * 1024 * 1024;

const EVIDENCE_TYPES =
  new Set([
    "application/pdf",
    "image/png",
    "image/jpeg",
    "text/plain",
    "text/csv",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ]);

async function assetContext() {
  const access = await requireAssetAccess("contribute");

  return {
    ...access,
    admin:
      createAdminClient(),
  };
}

function addFrequency(
  dateValue,
  value,
  unit,
) {
  const date = new Date(
    `${dateValue}T12:00:00Z`,
  );

  if (unit === "days") {
    date.setUTCDate(
      date.getUTCDate() +
        value,
    );
  }

  if (unit === "weeks") {
    date.setUTCDate(
      date.getUTCDate() +
        value * 7,
    );
  }

  if (unit === "months") {
    date.setUTCMonth(
      date.getUTCMonth() +
        value,
    );
  }

  if (unit === "years") {
    date.setUTCFullYear(
      date.getUTCFullYear() +
        value,
    );
  }

  return date
    .toISOString()
    .slice(0, 10);
}

async function resolveOwner(
  admin,
  organizationId,
  personId,
) {
  if (!personId) {
    throw new Error(
      "Select an accountable asset owner from the active Company User list.",
    );
  }

  const { data, error } =
    await admin
      .from(
        "organization_people",
      )
      .select(
        "id,first_name,last_name,email,position",
      )
      .eq("id", personId)
      .eq(
        "organization_id",
        organizationId,
      )
      .eq(
        "account_status",
        "active",
      )
      .maybeSingle();

  if (error) {
    throw new Error(
      error.message,
    );
  }

  if (!data) {
    throw new Error(
      "The selected asset owner is not an active Company User.",
    );
  }

  return data;
}

async function resolveSupplier(
  admin,
  organizationId,
  supplierId,
) {
  if (!supplierId) {
    throw new Error(
      "Select an approved supplier from Supplier Management.",
    );
  }

  const { data, error } =
    await admin
      .from("suppliers")
      .select(
        "id,legal_name,approval_status",
      )
      .eq("id", supplierId)
      .eq(
        "organization_id",
        organizationId,
      )
      .maybeSingle();

  if (error) {
    throw new Error(
      error.message,
    );
  }

  if (
    !data ||
    ![
      "approved",
      "conditionally_approved",
    ].includes(
      data.approval_status,
    )
  ) {
    throw new Error(
      "The selected maintenance supplier is not currently approved.",
    );
  }

  return data;
}

const safeFileName = value =>
  clean(value, 180).replace(
    /[^a-zA-Z0-9._-]+/g,
    "-",
  );

export async function saveCompanyAsset(_previousState, formData) {
  return saveControlledAsset(formData);
}

export async function recordAssetMaintenance(
  _previousState,
  formData,
) {
  try {
    const {
      user,
      organization,
      admin,
    } = await assetContext();

    const text = (
      name,
      max,
    ) =>
      clean(
        formData.get(name),
        max,
      );

    const assetId =
      text("asset_id", 80);

    const maintenanceType =
      text(
        "maintenance_type",
        30,
      );

    const scheduledDate =
      text(
        "scheduled_date",
        10,
      );

    const completedDate =
      text(
        "completed_date",
        10,
      ) || null;

    const maintenanceOwnerType =
      text(
        "maintenance_owner_type",
        20,
      );

    const responsiblePersonId =
      text(
        "responsible_person_id",
        80,
      );

    const supplierId =
      text(
        "supplier_id",
        80,
      ) || null;

    if (
      !assetId ||
      !MAINTENANCE_TYPES.has(
        maintenanceType,
      ) ||
      !scheduledDate
    ) {
      return {
        error:
          "Select the asset, maintenance type and scheduled date.",
      };
    }

    const {
      data: asset,
      error: assetError,
    } = await admin
      .from(
        "organization_assets",
      )
      .select("*")
      .eq("id", assetId)
      .eq(
        "organization_id",
        organization.id,
      )
      .maybeSingle();

    if (assetError) {
      throw new Error(
        assetError.message,
      );
    }

    if (!asset) {
      return {
        error:
          "The selected company asset was not found.",
      };
    }

    if (
      !OWNER_TYPES.has(
        maintenanceOwnerType,
      )
    ) {
      return {
        error:
          "Select internal or supplier maintenance delivery.",
      };
    }

    const responsible =
      await resolveOwner(
        admin,
        organization.id,
        responsiblePersonId,
      );

    const supplier =
      maintenanceOwnerType ===
      "supplier"
        ? await resolveSupplier(
            admin,
            organization.id,
            supplierId,
          )
        : null;

    const completed =
      Boolean(completedDate);
    const calibrationResult = text("calibration_result", 30) || "not_assessed";
    const explicitCalDue = text("calibration_next_due_date", 10);
    const calibrationCriteria = text("calibration_acceptance_criteria",2000) || asset.calibration_acceptance_criteria || null;
    if (maintenanceType === "calibration" && completedDate && calibrationResult !== "not_assessed" && !calibrationCriteria) throw new Error("Record the acceptance criteria / decision rule reference before assigning a calibration result.");
    if (maintenanceType === "calibration" && !["not_assessed","within_limits","out_of_tolerance","conditional"].includes(calibrationResult)) throw new Error("Select a valid calibration result.");
    if (completedDate && (!validDay(completedDate) || completedDate > new Date().toISOString().slice(0,10))) throw new Error("Use an actual completed date on or before today.");
    if (explicitCalDue && (!validDay(explicitCalDue) || (completedDate && explicitCalDue <= completedDate))) throw new Error("The next calibration due date must be after the completed calibration.");
    const nextCalDue = maintenanceType === "calibration" && completedDate ? explicitCalDue || (asset.calibration_required && asset.calibration_frequency_value && asset.calibration_frequency_unit ? addAssetInterval(completedDate,asset.calibration_frequency_value,asset.calibration_frequency_unit) : null) : null;
    if (maintenanceType === "calibration" && completedDate && asset.calibration_required && !nextCalDue) throw new Error("Enter the next calibration due date for this calibration-required asset.");


    const reference =
      `PPM-${new Date().getUTCFullYear()}-` +
      randomUUID()
        .slice(0, 6)
        .toUpperCase();

    const evidenceFile =
      formData.get(
        "evidence_file",
      );

    let uploaded = null;

    if (
      evidenceFile &&
      typeof evidenceFile !==
        "string" &&
      evidenceFile.size
    ) {
      if (
        evidenceFile.size >
        MAX_EVIDENCE_SIZE
      ) {
        return {
          error:
            "Maintenance evidence must be 10 MB or smaller.",
        };
      }

      if (
        !EVIDENCE_TYPES.has(
          evidenceFile.type,
        )
      ) {
        return {
          error:
            "Upload a PDF, image, text, CSV, Word or Excel maintenance record.",
        };
      }

      const storagePath =
        `${organization.id}/` +
        `${assetId}/` +
        `${randomUUID()}-` +
        safeFileName(
          evidenceFile.name,
        );

      const {
        error: uploadError,
      } = await admin.storage
        .from(
          "asset-maintenance-evidence",
        )
        .upload(
          storagePath,
          evidenceFile,
          {
            contentType:
              evidenceFile.type,
            upsert: false,
          },
        );

      if (uploadError) {
        throw new Error(
          uploadError.message,
        );
      }

      uploaded = {
        path: storagePath,
        name: clean(
          evidenceFile.name,
          180,
        ),
        type:
          evidenceFile.type,
        size:
          evidenceFile.size,
      };
    }

    const { error } =
      await admin
        .from(
          "organization_asset_maintenance",
        )
        .insert({
          organization_id:
            organization.id,

          owner_id:
            organization.owner_id,

          asset_id:
            assetId,

          maintenance_reference:
            reference,

          maintenance_type:
            maintenanceType,
          calibration_result: maintenanceType === "calibration" ? calibrationResult : null,
          calibration_acceptance_criteria: maintenanceType === "calibration" ? calibrationCriteria : null,
          next_due_date: maintenanceType === "calibration" ? nextCalDue : null,

          scheduled_date:
            scheduledDate,

          completed_date:
            completedDate,

          maintenance_owner_type:
            maintenanceOwnerType,

          responsible_person_id:
            responsible.id,

          supplier_id:
            supplier?.id || null,

          performed_by:
            supplier?.legal_name ||
            [
              responsible.first_name,
              responsible.last_name,
            ]
              .filter(Boolean)
              .join(" ") ||
            responsible.email,

          work_completed:
            text(
              "work_completed",
              2000,
            ) || null,

          evidence_reference:
            text(
              "evidence_reference",
              500,
            ) || null,

          status:
            completed
              ? "completed"
              : "planned",

          created_by:
            user.id,

          evidence_storage_path:
            uploaded?.path ||
            null,

          evidence_file_name:
            uploaded?.name ||
            null,

          evidence_mime_type:
            uploaded?.type ||
            null,

          evidence_size_bytes:
            uploaded?.size ||
            null,
        });

    if (error) {
      if (uploaded) {
        await admin.storage
          .from(
            "asset-maintenance-evidence",
          )
          .remove([
            uploaded.path,
          ]);
      }

      throw new Error(
        error.message,
      );
    }

    if (
      completed &&
      maintenanceType !== "calibration" &&
      asset.ppm_required &&
      asset.ppm_frequency_value &&
      asset.ppm_frequency_unit
    ) {
      const next =
        addFrequency(
          completedDate,
          asset.ppm_frequency_value,
          asset.ppm_frequency_unit,
        );

      const {
        error: updateError,
      } = await admin
        .from(
          "organization_assets",
        )
        .update({
          last_maintenance_date:
            completedDate,

          next_maintenance_date:
            next,

          updated_at:
            new Date()
              .toISOString(),
        })
        .eq("id", assetId)
        .eq(
          "organization_id",
          organization.id,
        );

      if (updateError) {
        throw new Error(
          updateError.message,
        );
      }
    }

    if (completedDate && maintenanceType === "calibration" && (!asset.last_calibration_date || completedDate >= asset.last_calibration_date)) {
      const { error: calibrationUpdateError } = await admin.from("organization_assets").update({
        last_calibration_date: completedDate,
        next_calibration_date: asset.calibration_required ? nextCalDue : asset.next_calibration_date,
        calibration_result: calibrationResult,
        calibration_acceptance_criteria: calibrationCriteria,
        calibration_provider: supplier?.legal_name || performedCalibrationName(responsible),
        calibration_certificate_reference: text("evidence_reference",500)||null,
        updated_at: new Date().toISOString(),
      }).eq("id",assetId).eq("organization_id",organization.id);
      if (calibrationUpdateError) throw new Error("The calibration history was saved, but its asset summary could not be updated. Review the history before retrying.");
    }

    revalidatePath("/portal/asset-management", "layout");
    revalidatePath("/portal/company/assets");

    return {
      success: completed
        ? `Maintenance completed. Next PPM date recalculated. Reference ${reference}.`
        : `Maintenance planned. Reference ${reference}.`,
      error: "",
    };
  } catch (error) {
    return {
      error:
        error?.message ||
        "The maintenance record could not be saved.",
    };
  }
}

export async function completeAssetWorkOrder(assetId, workId, _previousState, formData) {
  const { access, asset, admin } = await requireAssetRecord(assetId, "contribute");
  const { organization } = access;
  if (!ASSET_UUID.test(workId)) return { error: "The work order reference is invalid." };

  const client = await createClient();
  const scopedOrder = () => client.from("organization_asset_maintenance").select("*")
    .eq("id", workId).eq("asset_id", asset.id)
    .eq("owner_id", organization.owner_id).eq("organization_id", organization.id);
  const { data: order, error: readError } = await scopedOrder().maybeSingle();
  if (readError || !order) return { error: "This work order could not be opened for completion." };
  const destination = recordPath(asset.id) + "?tab=details&completed=" + workId + "#asset-order";
  if (order.status === "completed") redirect(destination);
  if (!["planned", "due", "overdue", "in_progress"].includes(order.status)) {
    return { error: "This work order cannot be completed in its current status." };
  }

  const actualDate = clean(formData.get("completed_date"), 10);
  const performedBy = clean(formData.get("performed_by"), 180);
  const notes = clean(formData.get("work_completed"), 2000);
  const evidenceReference = clean(formData.get("evidence_reference"), 500) || null;
  const today = new Date().toISOString().slice(0, 10);
  if (!validDay(actualDate) || actualDate > today) return { error: "Enter an actual completion date on or before today." };
  if (!performedBy || !notes) return { error: "Enter who completed the work and what was done." };

  const values = {
    status: "completed",
    completed_date: actualDate,
    performed_by: performedBy,
    work_completed: notes,
    evidence_reference: evidenceReference,
    updated_at: new Date().toISOString(),
  };
  if (order.maintenance_type === "calibration") {
    const result = clean(formData.get("calibration_result"), 30);
    const criteria = clean(formData.get("calibration_acceptance_criteria"), 2000) || asset.calibration_acceptance_criteria || null;
    const explicitDue = clean(formData.get("calibration_next_due_date"), 10);
    const nextDue = explicitDue || (asset.calibration_required && asset.calibration_frequency_value && asset.calibration_frequency_unit
      ? addAssetInterval(actualDate, asset.calibration_frequency_value, asset.calibration_frequency_unit) : null);
    if (!CALIBRATION_RESULTS.some(([key]) => key === result)) return { error: "Select the recorded calibration result." };
    if (result !== "not_assessed" && !criteria) return { error: "Enter the acceptance criteria or decision rule for this calibration result." };
    if ((nextDue && (!validDay(nextDue) || nextDue <= actualDate)) || (asset.calibration_required && !nextDue)) {
      return { error: "Enter a next calibration due date after completion." };
    }
    Object.assign(values, { calibration_result: result, calibration_acceptance_criteria: criteria, next_due_date: nextDue });
  }

  const file = formData.get("evidence_file");
  const bucket = admin.storage.from("asset-maintenance-evidence");
  let uploadedPath;
  if (file && typeof file !== "string" && file.size) {
    if (order.evidence_storage_path) return { error: "This work order already has an evidence file." };
    if (!EVIDENCE_TYPES.has(file.type) || file.size > 4 * 1024 * 1024) {
      return { error: "Choose a supported maintenance evidence file up to 4 MB." };
    }
    uploadedPath = organization.id + "/" + asset.id + "/" + randomUUID() + "-" + safeFileName(file.name);
    const { error } = await bucket.upload(uploadedPath, file, { contentType: file.type, upsert: false });
    if (error) return { error: "The evidence could not be uploaded. Retry before closing the work order." };
    Object.assign(values, {
      evidence_storage_path: uploadedPath, evidence_file_name: clean(file.name, 180),
      evidence_mime_type: file.type, evidence_size_bytes: file.size,
    });
  }

  // Use the signed-in client so the existing task-history trigger records the actor.
  // Match the loaded status and revision to prevent a concurrent completion or edit being overwritten.
  const { data: closed, error: writeError } = await client.from("organization_asset_maintenance").update(values)
    .eq("id", workId).eq("asset_id", asset.id).eq("organization_id", organization.id).eq("owner_id", organization.owner_id)
    .eq("status", order.status).eq("updated_at", order.updated_at).select("id").maybeSingle();

  if (!closed || writeError) {
    const { data: current, error: confirmError } = await scopedOrder().maybeSingle();
    if (uploadedPath && !confirmError && current?.evidence_storage_path !== uploadedPath) {
      await bucket.remove([uploadedPath]);
    }
    if (!confirmError && current?.status === "completed") redirect(destination);
    return { error: confirmError
      ? "Completion could not be confirmed. Refresh the work order before trying again."
      : "The work order could not be closed. Refresh the work order and check its current status." };
  }

  revalidatePath("/portal/asset-management", "layout");
  revalidatePath("/portal/company/assets");
  revalidatePath("/portal/tasks");
  redirect(destination);
}

export async function changeCompanyAssetStatus(
  formData,
) {
  const {
    organization,
    admin,
  } = await assetContext();

  const id = clean(
    formData.get("id"),
    80,
  );

  const status = clean(
    formData.get("status"),
    30,
  );

  if (
    !id ||
    !STATUSES.has(status)
  ) {
    throw new Error(
      "Select a valid asset and status.",
    );
  }

  const { error } =
    await admin
      .from(
        "organization_assets",
      )
      .update({
        operational_status:
          status,

        updated_at:
          new Date()
            .toISOString(),
      })
      .eq("id", id)
      .eq(
        "organization_id",
        organization.id,
      );

  if (error) {
    throw new Error(
      error.message,
    );
  }

  revalidatePath("/portal/asset-management", "layout");
  revalidatePath("/portal/company/assets");

  revalidatePath(
    "/portal/health-safety/permits/new",
  );
}

function performedCalibrationName(person){return [person.first_name,person.last_name].filter(Boolean).join(" ")||person.email;}

