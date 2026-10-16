"use server";

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
  const access =
    await requireOrganizationAccess(
      "people_access",
      "admin",
      "/portal/company/assets",
    );

  const subscription =
    await getUserSubscription(
      access.user.id,
    );

  if (
    !hasPlanAccess(
      subscription,
      "professional",
    )
  ) {
    throw new Error(
      "Asset Management requires the Professional plan.",
    );
  }

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

export async function saveCompanyAsset(
  _previousState,
  formData,
) {
  try {
    const {
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

    const id =
      text("id", 80);

    const assetReference =
      text(
        "asset_reference",
        100,
      );

    const assetName =
      text("asset_name", 180);

    const assetType =
      text("asset_type", 40);

    const locationId =
      text(
        "site_location_id",
        180,
      );

    const ownerPersonId =
      text(
        "asset_owner_person_id",
        80,
      );

    const operationalStatus =
      text(
        "operational_status",
        30,
      ) || "active";

    const criticality =
      text(
        "criticality",
        20,
      ) || "medium";

    const ppmRequired =
      text(
        "ppm_required",
        10,
      ) === "true";

    const maintenanceOwnerType =
      text(
        "maintenance_owner_type",
        20,
      ) || "internal";

    const maintenanceOwnerPersonId =
      text(
        "maintenance_owner_person_id",
        80,
      );

    const maintenanceSupplierId =
      text(
        "maintenance_supplier_id",
        80,
      ) || null;

    const frequencyValue =
      Number(
        text(
          "ppm_frequency_value",
          10,
        ),
      );

    const frequencyUnit =
      text(
        "ppm_frequency_unit",
        20,
      );

    const lastMaintenanceDate =
      text(
        "last_maintenance_date",
        10,
      ) || null;

    const submittedNextDate =
      text(
        "next_maintenance_date",
        10,
      ) || null;

    if (!assetName) {
      return {
        error:
          "Enter the asset name.",
      };
    }

    if (
      id &&
      !assetReference
    ) {
      return {
        error:
          "The controlled asset reference cannot be removed.",
      };
    }

    if (
      !ASSET_TYPES.has(
        assetType,
      )
    ) {
      return {
        error:
          "Select a valid asset type.",
      };
    }

    if (
      !STATUSES.has(
        operationalStatus,
      )
    ) {
      return {
        error:
          "Select a valid operational status.",
      };
    }

    if (
      !CRITICALITIES.has(
        criticality,
      )
    ) {
      return {
        error:
          "Select a valid asset criticality.",
      };
    }

    const locations =
      await loadAdministrationLocations(
        organization,
      );

    const location =
      locations.find(
        item =>
          item.id ===
          locationId,
      );

    if (!location) {
      return {
        error:
          "Select a current location from Administration → Site Profile.",
      };
    }

    await resolveOwner(
      admin,
      organization.id,
      ownerPersonId,
    );

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

    await resolveOwner(
      admin,
      organization.id,
      maintenanceOwnerPersonId,
    );

    if (
      maintenanceOwnerType ===
      "supplier"
    ) {
      await resolveSupplier(
        admin,
        organization.id,
        maintenanceSupplierId,
      );
    }

    let nextMaintenanceDate =
      null;

    if (ppmRequired) {
      if (
        !Number.isInteger(
          frequencyValue,
        ) ||
        frequencyValue < 1 ||
        !FREQUENCY_UNITS.has(
          frequencyUnit,
        )
      ) {
        return {
          error:
            "Set the PPM frequency using a positive number and days, weeks, months or years.",
        };
      }

      const base =
        lastMaintenanceDate ||
        new Date()
          .toISOString()
          .slice(0, 10);

      nextMaintenanceDate =
        submittedNextDate ||
        addFrequency(
          base,
          frequencyValue,
          frequencyUnit,
        );
    }

    const values = {
      organization_id:
        organization.id,

      owner_id:
        organization.owner_id,

      asset_reference:
        assetReference || null,

      asset_name:
        assetName,

      asset_type:
        assetType,

      site_location_id:
        location.id,

      site_location_label:
        location.label,

      area_department:
        text(
          "area_department",
          180,
        ) || null,

      description:
        text(
          "description",
          2000,
        ) || null,

      manufacturer:
        text(
          "manufacturer",
          180,
        ) || null,

      model:
        text(
          "model",
          180,
        ) || null,

      serial_number:
        text(
          "serial_number",
          180,
        ) || null,

      asset_owner_person_id:
        ownerPersonId,

      criticality,
      operational_status:
        operationalStatus,

      ppm_required:
        ppmRequired,

      ppm_frequency_value:
        ppmRequired
          ? frequencyValue
          : null,

      ppm_frequency_unit:
        ppmRequired
          ? frequencyUnit
          : null,

      last_maintenance_date:
        lastMaintenanceDate,

      next_maintenance_date:
        nextMaintenanceDate,

      maintenance_owner_type:
        maintenanceOwnerType,

      maintenance_owner_person_id:
        maintenanceOwnerPersonId,

      maintenance_supplier_id:
        maintenanceOwnerType ===
        "supplier"
          ? maintenanceSupplierId
          : null,

      maintenance_provider:
        null,

      maintenance_notes:
        text(
          "maintenance_notes",
          2000,
        ) || null,

      change_control_required:
        text(
          "change_control_required",
          10,
        ) !== "false",

      updated_at:
        new Date().toISOString(),
    };

    const query = id
      ? admin
          .from(
            "organization_assets",
          )
          .update(values)
          .eq("id", id)
          .eq(
            "organization_id",
            organization.id,
          )
          .select("id")
          .single()
      : admin
          .from(
            "organization_assets",
          )
          .insert({
            ...values,
            created_at:
              new Date()
                .toISOString(),
          })
          .select("id")
          .single();

    const {
      data: saved,
      error,
    } = await query;

    if (
      error?.code === "23505"
    ) {
      return {
        error:
          "That asset reference already exists in this company.",
      };
    }

    if (error) {
      return {
        error: error.message,
      };
    }

    const assetId = saved.id;

    const requestedDocumentIds = [
      ...new Set(
        formData
          .getAll(
            "controlled_document_ids",
          )
          .map(value =>
            clean(value, 80),
          )
          .filter(Boolean),
      ),
    ];

    const {
      error: deleteLinksError,
    } = await admin
      .from(
        "organization_asset_document_links",
      )
      .delete()
      .eq(
        "organization_id",
        organization.id,
      )
      .eq(
        "asset_id",
        assetId,
      );

    if (deleteLinksError) {
      throw new Error(
        deleteLinksError.message,
      );
    }

    if (
      requestedDocumentIds.length
    ) {
      const {
        data: validDocuments,
        error: documentError,
      } = await admin
        .from(
          "controlled_documents",
        )
        .select("id")
        .in(
          "id",
          requestedDocumentIds,
        )
        .eq(
          "status",
          "Current",
        );

      if (documentError) {
        throw new Error(
          documentError.message,
        );
      }

      if (
        (
          validDocuments || []
        ).length !==
        requestedDocumentIds.length
      ) {
        throw new Error(
          "One or more linked documents are no longer current. Review the Documented Information selection.",
        );
      }

      const {
        error: linkError,
      } = await admin
        .from(
          "organization_asset_document_links",
        )
        .insert(
          validDocuments.map(
            document => ({
              organization_id:
                organization.id,

              owner_id:
                organization.owner_id,

              asset_id:
                assetId,

              controlled_document_id:
                document.id,

              created_by:
                organization.owner_id,
            }),
          ),
        );

      if (linkError) {
        throw new Error(
          linkError.message,
        );
      }
    }

    revalidatePath(
      "/portal/company/assets",
    );

    revalidatePath(
      "/portal/health-safety/permits/new",
    );

    revalidatePath(
      "/portal/health-safety/moc/new",
    );

    return {
      success: id
        ? "Asset details, ownership and PPM controls updated."
        : "Asset added with a unique controlled reference.",
      error: "",
    };
  } catch (error) {
    return {
      error:
        error?.message ||
        "The asset could not be saved.",
    };
  }
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

    revalidatePath(
      "/portal/company/assets",
    );

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

  revalidatePath(
    "/portal/company/assets",
  );

  revalidatePath(
    "/portal/health-safety/permits/new",
  );
}
