import {
  createAdminClient,
} from "./supabase/admin";

import {
  loadAdministrationLocations,
} from "./rcaCompanyLinks";

const clean = value =>
  String(value || "").trim();

export async function loadPermitCompanyOptions(
  organization,
) {
  const admin =
    createAdminClient();

  const [
    locations,
    assetsResult,
    suppliersResult,
  ] = await Promise.all([
    loadAdministrationLocations(
      organization,
    ),

    admin
      .from("organization_assets")
      .select(
        "id,asset_reference,asset_name,asset_type,site_location_id,site_location_label,area_department,operational_status",
      )
      .eq(
        "organization_id",
        organization.id,
      )
      .eq(
        "operational_status",
        "active",
      )
      .order("asset_reference"),

    admin
      .from("suppliers")
      .select(
        "id,legal_name,approval_status,supplier_reference,criticality",
      )
      .eq(
        "organization_id",
        organization.id,
      )
      .neq(
        "approval_status",
        "archived",
      )
      .order("legal_name"),
  ]);

  if (assetsResult.error) {
    throw new Error(
      assetsResult.error.message,
    );
  }

  if (suppliersResult.error) {
    throw new Error(
      suppliersResult.error.message,
    );
  }

  return {
    locations,
    assets:
      assetsResult.data || [],
    suppliers:
      suppliersResult.data || [],
  };
}

export function resolvePermitCompanyLinks(
  options,
  formData,
) {
  const text = name =>
    clean(formData.get(name));

  const location =
    options.locations.find(
      item =>
        item.id ===
        text(
          "administration_location_id",
        ),
    );

  if (!location) {
    throw new Error(
      "Select a current site from Administration → Site Profile.",
    );
  }

  const assetSource =
    text("asset_source") ||
    "register";

  let asset = null;
  let assetReference = "";
  let assetSnapshot = null;

  if (
    assetSource === "register"
  ) {
    asset =
      options.assets.find(
        item =>
          item.id ===
          text(
            "organization_asset_id",
          ),
      );

    if (!asset) {
      throw new Error(
        "Select an active asset from the Company Asset Register.",
      );
    }

    if (
      asset.site_location_id &&
      asset.site_location_id !==
        location.id
    ) {
      throw new Error(
        "The selected asset belongs to a different Administration site.",
      );
    }

    assetReference =
      asset.asset_reference;

    assetSnapshot = {
      id: asset.id,
      reference:
        asset.asset_reference,
      name: asset.asset_name,
      type: asset.asset_type,
      site_location_id:
        asset.site_location_id,
      site_location_label:
        asset.site_location_label,
      area_department:
        asset.area_department,
    };
  } else if (
    assetSource === "manual"
  ) {
    assetReference =
      text(
        "manual_asset_reference",
      );

    const assetName =
      text("manual_asset_name");

    if (
      !assetReference ||
      !assetName
    ) {
      throw new Error(
        "Enter the manual asset or equipment reference and name.",
      );
    }

    assetSnapshot = {
      id: null,
      reference:
        assetReference,
      name: assetName,
      type:
        text(
          "manual_asset_type",
        ) || "Other",
      site_location_id:
        location.id,
      site_location_label:
        location.label,
      manual: true,
    };
  } else {
    throw new Error(
      "Select an asset source.",
    );
  }

  const supplierSource =
    text("supplier_source") ||
    "internal";

  let supplier = null;
  let supplierName = null;
  let supplierSnapshot = null;

  if (
    supplierSource ===
    "register"
  ) {
    supplier =
      options.suppliers.find(
        item =>
          item.id ===
          text("supplier_id"),
      );

    if (!supplier) {
      throw new Error(
        "Select a current supplier from Supplier Management.",
      );
    }

    supplierName =
      supplier.legal_name;

    supplierSnapshot = {
      id: supplier.id,
      legal_name:
        supplier.legal_name,
      supplier_reference:
        supplier.supplier_reference,
      approval_status:
        supplier.approval_status,
      criticality:
        supplier.criticality,
    };
  } else if (
    supplierSource === "manual"
  ) {
    supplierName =
      text(
        "manual_contractor_company",
      );

    if (!supplierName) {
      throw new Error(
        "Enter the external contractor or supplier name.",
      );
    }

    supplierSnapshot = {
      id: null,
      legal_name:
        supplierName,
      manual: true,
    };
  } else if (
    supplierSource !== "internal"
  ) {
    throw new Error(
      "Select internal work, a current supplier or a manual external contractor.",
    );
  }

  return {
    administration_location_id:
      location.id,

    site_location:
      location.label,

    site_location_snapshot:
      location.label,

    organization_asset_id:
      asset?.id || null,

    asset_reference:
      assetReference,

    equipment_asset:
      `${assetReference} — ${assetSnapshot.name}`,

    asset_snapshot:
      assetSnapshot,

    supplier_id:
      supplier?.id || null,

    contractor_company:
      supplierName,

    supplier_snapshot:
      supplierSnapshot,
  };
}
