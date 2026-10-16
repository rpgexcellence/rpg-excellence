"use server";

import { revalidatePath } from "next/cache";

import { businessProfileContext } from "../../../../lib/businessProfileAccess";
import { createAdminClient } from "../../../../lib/supabase/admin";

const clean = (value, max = 500) =>
  String(value || "")
    .trim()
    .slice(0, max);

const SITE_TYPES = new Set([
  "registered_office",
  "operational_site",
  "office",
  "warehouse",
  "laboratory",
  "remote_site",
  "client_site",
  "other",
]);

const STATUSES = new Set([
  "active",
  "inactive",
  "archived",
]);

async function validateCompanyPeople(
  admin,
  organizationId,
  personIds,
) {
  const uniqueIds = [
    ...new Set(
      personIds.filter(Boolean),
    ),
  ];

  if (!uniqueIds.length) {
    return;
  }

  const { data, error } = await admin
    .from("organization_people")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("account_status", "active")
    .in("id", uniqueIds);

  if (error) {
    throw new Error(error.message);
  }

  const validIds = new Set(
    (data || []).map((person) => person.id),
  );

  if (
    uniqueIds.some(
      (personId) => !validIds.has(personId),
    )
  ) {
    throw new Error(
      "Every accountable person must be selected from the active Company User list.",
    );
  }
}

async function createSiteReference(
  admin,
  organizationId,
) {
  const { data, error } = await admin
    .from("organization_sites")
    .select("site_reference")
    .eq("organization_id", organizationId);

  if (error) {
    throw new Error(error.message);
  }

  const usedNumbers = new Set(
    (data || [])
      .map((site) => {
        const match = String(
          site.site_reference || "",
        ).match(/^SITE-(\d+)$/i);

        return match
          ? Number(match[1])
          : null;
      })
      .filter(Number.isInteger),
  );

  let nextNumber = 1;

  while (usedNumbers.has(nextNumber)) {
    nextNumber += 1;
  }

  return `SITE-${String(nextNumber).padStart(3, "0")}`;
}

export async function saveOrganizationSite(
  _previousState,
  formData,
) {
  try {
    const {
      user,
      organization,
    } = await businessProfileContext();

    if (!organization) {
      return {
        error:
          "Create the Business Profile before adding sites.",
      };
    }

    const admin = createAdminClient();

    const id = clean(
      formData.get("id"),
      80,
    );

    let existingSite = null;

    if (id) {
      const {
        data,
        error: existingSiteError,
      } = await admin
        .from("organization_sites")
        .select(
          "id,site_owner_person_id,site_manager_person_id,hse_contact_person_id,is_primary",
        )
        .eq("id", id)
        .eq(
          "organization_id",
          organization.id,
        )
        .maybeSingle();

      if (existingSiteError) {
        throw new Error(
          existingSiteError.message,
        );
      }

      if (!data) {
        return {
          error:
            "The selected Site Profile was not found or is outside your organisation.",
        };
      }

      existingSite = data;
    }

    const siteName = clean(
      formData.get("site_name"),
      180,
    );

    const siteType = clean(
      formData.get("site_type"),
      40,
    );

    const status =
      clean(
        formData.get("status"),
        20,
      ) || "active";

    if (!siteName) {
      return {
        error:
          "Enter the controlled site name.",
      };
    }

    if (!SITE_TYPES.has(siteType)) {
      return {
        error:
          "Select a valid site type.",
      };
    }

    if (!STATUSES.has(status)) {
      return {
        error:
          "Select a valid site status.",
      };
    }

    const personSelection = (
      fieldName,
      currentValue,
    ) =>
      formData.has(fieldName)
        ? clean(
            formData.get(fieldName),
            80,
          ) || null
        : currentValue || null;

    const siteOwnerPersonId =
      personSelection(
        "site_owner_person_id",
        existingSite
          ?.site_owner_person_id,
      );

    const siteManagerPersonId =
      personSelection(
        "site_manager_person_id",
        existingSite
          ?.site_manager_person_id,
      );

    const hseContactPersonId =
      personSelection(
        "hse_contact_person_id",
        existingSite
          ?.hse_contact_person_id,
      );

    await validateCompanyPeople(
      admin,
      organization.id,
      [
        siteOwnerPersonId,
        siteManagerPersonId,
        hseContactPersonId,
      ],
    );

    const primaryControlPresent =
      formData.get(
        "is_primary_control",
      ) === "present";

    const isPrimary =
      primaryControlPresent
        ? formData.get(
            "is_primary",
          ) === "true"
        : Boolean(
            existingSite?.is_primary,
          );

    if (isPrimary) {
      const { error: primaryError } =
        await admin
          .from("organization_sites")
          .update({
            is_primary: false,
            updated_at:
              new Date().toISOString(),
            updated_by: user.id,
          })
          .eq(
            "organization_id",
            organization.id,
          )
          .neq("status", "archived");

      if (primaryError) {
        throw new Error(
          primaryError.message,
        );
      }
    }

    let siteReference = clean(
      formData.get("site_reference"),
      60,
    ).toUpperCase();

    if (!siteReference) {
      siteReference =
        await createSiteReference(
          admin,
          organization.id,
        );
    }

    const values = {
      organization_id:
        organization.id,

      // Keep the organisation owner's ID on the
      // controlled record. Do not replace it with
      // the ID of an administrator editing the site.
      owner_id:
        organization.owner_id,

      site_reference:
        siteReference,

      site_name:
        siteName,

      site_type:
        siteType,

      status,
      is_primary: isPrimary,

      address_line_1:
        clean(
          formData.get(
            "address_line_1",
          ),
          180,
        ) || null,

      address_line_2:
        clean(
          formData.get(
            "address_line_2",
          ),
          180,
        ) || null,

      city:
        clean(
          formData.get("city"),
          120,
        ) || null,

      region:
        clean(
          formData.get("region"),
          120,
        ) || null,

      postal_code:
        clean(
          formData.get(
            "postal_code",
          ),
          40,
        ) || null,

      country:
        clean(
          formData.get("country"),
          100,
        ) || null,

      timezone:
        clean(
          formData.get("timezone"),
          100,
        ) || null,

      main_phone:
        clean(
          formData.get("main_phone"),
          60,
        ) || null,

      general_email:
        clean(
          formData.get(
            "general_email",
          ),
          180,
        ) || null,

      site_owner_person_id:
        siteOwnerPersonId,

      site_manager_person_id:
        siteManagerPersonId,

      hse_contact_person_id:
        hseContactPersonId,

      notes:
        clean(
          formData.get("notes"),
          2000,
        ) || null,

      updated_by:
        user.id,

      updated_at:
        new Date().toISOString(),
    };

    const query = id
      ? admin
          .from("organization_sites")
          .update(values)
          .eq("id", id)
          .eq(
            "organization_id",
            organization.id,
          )
      : admin
          .from("organization_sites")
          .insert({
            ...values,
            created_by: user.id,
          });

    const { error } = await query;

    if (error?.code === "23505") {
      return {
        error:
          "That site reference already exists, or another active primary site is already set.",
      };
    }

    if (error) {
      throw new Error(error.message);
    }

    revalidatePath(
      "/portal",
      "layout",
    );

    revalidatePath(
      "/portal/company/sites",
    );

    revalidatePath(
      "/portal/company/assets",
    );

    revalidatePath(
      "/portal/health-safety",
      "layout",
    );

    revalidatePath(
      "/portal/internal-audits",
    );

    revalidatePath(
      "/portal/business-continuity",
      "layout",
    );

    return {
      success: id
        ? "Site Profile updated."
        : "Site Profile created.",

      error: "",
    };
  } catch (error) {
    return {
      error:
        error?.message ||
        "The Site Profile could not be saved.",
    };
  }
}

export async function archiveOrganizationSite(
  formData,
) {
  const {
    user,
    organization,
  } = await businessProfileContext();

  if (!organization) {
    throw new Error(
      "The company record could not be found.",
    );
  }

  const id = clean(
    formData.get("id"),
    80,
  );

  if (!id) {
    throw new Error(
      "The Site Profile ID is missing.",
    );
  }

  const admin = createAdminClient();

  const {
    data: site,
    error: siteError,
  } = await admin
    .from("organization_sites")
    .select(
      "id,site_name,is_primary,status",
    )
    .eq("id", id)
    .eq(
      "organization_id",
      organization.id,
    )
    .maybeSingle();

  if (siteError) {
    throw new Error(
      siteError.message,
    );
  }

  if (!site) {
    throw new Error(
      "The selected Site Profile was not found.",
    );
  }

  if (site.is_primary) {
    throw new Error(
      "The primary Site Profile cannot be archived. Set another active site as primary first.",
    );
  }

  const {
    count: bcpProfileCount,
    error: bcpError,
  } = await admin
    .from("bcp_site_profiles")
    .select(
      "id",
      {
        count: "exact",
        head: true,
      },
    )
    .eq(
      "organization_id",
      organization.id,
    )
    .eq(
      "organization_site_id",
      id,
    )
    .neq("status", "archived");

  if (bcpError) {
    throw new Error(
      bcpError.message,
    );
  }

  if (bcpProfileCount) {
    throw new Error(
      "This site is linked to a current BCP continuity assessment. Archive or relink that assessment first.",
    );
  }

  const {
    count: assetCount,
    error: assetError,
  } = await admin
    .from("organization_assets")
    .select(
      "id",
      {
        count: "exact",
        head: true,
      },
    )
    .eq(
      "organization_id",
      organization.id,
    )
    .eq(
      "site_location_id",
      id,
    )
    .neq(
      "operational_status",
      "retired",
    );

  if (assetError) {
    throw new Error(
      assetError.message,
    );
  }

  if (assetCount) {
    throw new Error(
      "This site has active company assets. Transfer or retire those assets before archiving the site.",
    );
  }

  const { error } = await admin
    .from("organization_sites")
    .update({
      status: "archived",
      is_primary: false,
      updated_by: user.id,
      updated_at:
        new Date().toISOString(),
    })
    .eq("id", id)
    .eq(
      "organization_id",
      organization.id,
    );

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(
    "/portal",
    "layout",
  );

  revalidatePath(
    "/portal/company/sites",
  );
}
