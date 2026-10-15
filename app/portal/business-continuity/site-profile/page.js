import Link from "next/link";
import { redirect } from "next/navigation";
import BCPSiteProfileForm from "../../../../components/BCPSiteProfileForm";
import { createClient } from "../../../../lib/supabase/server";

export const metadata = {
  title: "BCP Site Profile | RPG Excellence",
};

export const dynamic = "force-dynamic";

const clean = (value) => String(value ?? "").trim();

const parseArray = (formData, name) => {
  try {
    const value = JSON.parse(clean(formData.get(name)) || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
};

const parseObject = (formData, name) => {
  try {
    const value = JSON.parse(clean(formData.get(name)) || "{}");

    return value &&
      typeof value === "object" &&
      !Array.isArray(value)
      ? value
      : {};
  } catch {
    return {};
  }
};

const validEmail = (value) =>
  !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const withIds = (items) =>
  items.map((item) => ({
    ...item,
    id: clean(item?.id) || crypto.randomUUID(),
  }));

const hasDuplicates = (items) => {
  const names = items
    .map((item) => clean(item?.name).toLowerCase())
    .filter(Boolean);

  return new Set(names).size !== names.length;
};

function profileChecks({
  location,
  leader,
  facilitator,
  description,
  services,
  value,
  support,
  dependencies,
  information,
  people,
}) {
  return [
    Boolean(location && leader && facilitator),

    Boolean(description && services),

    value.some(
      (item) =>
        clean(item?.name) &&
        clean(item?.owner) &&
        item?.products?.length,
    ),

    support.some(
      (item) =>
        clean(item?.name) &&
        clean(item?.owner) &&
        item?.products?.length,
    ),

    dependencies.some(
      (item) =>
        clean(item?.name) &&
        clean(item?.category) &&
        (item?.siteWide || item?.processes?.length),
    ),

    Boolean(
      information.assets?.some(
        (item) =>
          clean(item?.name) &&
          clean(item?.owner),
      ) ||
        information.systems?.some(
          (item) =>
            clean(item?.name) &&
            clean(item?.businessOwner),
        ),
    ),

    people.some(
      (item) =>
        clean(item?.name) &&
        clean(item?.role) &&
        validEmail(clean(item?.email)),
    ),

    Boolean(
      information.emergencyReviewDueDate &&
        information.emergencyContacts?.some(
          (item) =>
            clean(item?.serviceType) &&
            clean(item?.serviceName) &&
            clean(item?.emergencyNumber) &&
            clean(item?.address),
        ),
    ),
  ];
}

async function saveProfile(_previousState, formData) {
  "use server";

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(
      "/portal/login?next=/portal/business-continuity/site-profile",
    );
  }

  const { data: organization } = await supabase
    .from("organizations")
    .select("id")
    .eq("owner_id", user.id)
    .order("created_at")
    .limit(1)
    .maybeSingle();

  if (!organization) {
    return {
      error:
        "Create an organisation before starting a site profile.",
    };
  }

  const [peopleResult, permissionsResult] = await Promise.all([
    supabase
      .from("organization_people")
      .select("id,first_name,last_name")
      .eq("organization_id", organization.id)
      .eq("account_status", "active"),

    supabase
      .from("organization_person_permissions")
      .select("person_id")
      .eq("organization_id", organization.id)
      .eq("module_key", "business_continuity")
      .neq("access_level", "none"),
  ]);

  const permittedIds = new Set(
    (permissionsResult.data || []).map(
      (permission) => permission.person_id,
    ),
  );

  const controlledPeople = new Set(
    (peopleResult.data || [])
      .filter((person) => permittedIds.has(person.id))
      .map((person) =>
        (
          (person.first_name || "") +
          " " +
          (person.last_name || "")
        ).trim(),
      )
      .filter(Boolean),
  );

  const text = (name) => clean(formData.get(name));
  const intent = text("intent");
  const profileId = text("profile_id");

  let existing = null;

  if (profileId) {
    const { data } = await supabase
      .from("bcp_site_profiles")
      .select("*")
      .eq("id", profileId)
      .eq("organization_id", organization.id)
      .eq("owner_id", user.id)
      .maybeSingle();

    existing = data;

    if (!existing) {
      return {
        error:
          "This site profile could not be found or you do not have access to it.",
      };
    }
  }

  if (intent === "archive") {
    if (!existing) {
      return {
        error: "Only an existing profile can be archived.",
      };
    }

    const { error } = await supabase
      .from("bcp_site_profiles")
      .update({
        status: "archived",
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id)
      .eq("owner_id", user.id);

    if (error) {
      return { error: error.message };
    }

    redirect("/portal/business-continuity");
  }

  const valueProcesses = withIds(
    parseArray(formData, "value_chain_processes"),
  );

  const supportProcesses = withIds(
    parseArray(formData, "support_processes"),
  );

  const dependencyRecords = withIds(
    parseArray(formData, "dependency_records"),
  );

  const information = parseObject(
    formData,
    "information_continuity",
  );

  const participants = withIds(
    parseArray(formData, "training_participants"),
  );

  information.assets = withIds(
    Array.isArray(information.assets)
      ? information.assets
      : [],
  );

  information.systems = withIds(
    Array.isArray(information.systems)
      ? information.systems
      : [],
  );

  information.remoteSupport = withIds(
    Array.isArray(information.remoteSupport)
      ? information.remoteSupport
      : [],
  );

  information.emergencyContacts = withIds(
    Array.isArray(information.emergencyContacts)
      ? information.emergencyContacts
      : [],
  );

  const location = text("location_name");
  const leader = text("site_leader");
  const facilitator = text("local_facilitator");
  const description = text("operational_description");
  const services = text("critical_products_services");
  const reviewer = text("reviewer_name");

  const controlledAssignments = [
    leader,
    text("regional_facilitator"),
    facilitator,

    ...dependencyRecords.map((item) =>
      clean(item?.owner),
    ),

    ...(information.assets || []).map((item) =>
      clean(item?.owner),
    ),

    ...(information.systems || []).flatMap((item) => [
      clean(item?.businessOwner),
      clean(item?.technicalOwner),
      clean(item?.emergencyAccessPrimary),
      clean(item?.emergencyAccessDeputy),
      clean(item?.emergencyAccessApprover),
    ]),

    ...participants.map((person) =>
      clean(person?.name),
    ),
  ].filter(Boolean);

  if (
    ["review", "approve"].includes(intent) &&
    controlledAssignments.some(
      (name) => !controlledPeople.has(name),
    )
  ) {
    return {
      error:
        "Select site leaders, BCP facilitators, dependency owners, information-asset owners and BCP participants from active Company Users with Business Continuity access.",
    };
  }

  if (
    ["review", "approve", "changes"].includes(intent) &&
    reviewer &&
    !controlledPeople.has(reviewer)
  ) {
    return {
      error:
        "Select the competent reviewer or approver from active Company Users with Business Continuity access.",
    };
  }

  if (
    ["review", "approve"].includes(intent) &&
    information.systems.some(
      (system) =>
        clean(system?.name) &&
        (!clean(system?.businessOwner) ||
          !clean(system?.technicalOwner) ||
          !clean(system?.authentication) ||
          !clean(system?.supplierId) ||
          !clean(system?.supplierContactId)),
    )
  ) {
    return {
      error:
        "Every critical system requires a Business Owner, Technical Owner, authentication method, approved supplier and active supplier support contact before review or approval.",
    };
  }

  if (
    ["review", "approve"].includes(intent) &&
    information.systems.length
  ) {
    const supplierIds = [
      ...new Set(
        information.systems
          .map((item) => clean(item?.supplierId))
          .filter(Boolean),
      ),
    ];

    const contactIds = [
      ...new Set(
        information.systems
          .map((item) => clean(item?.supplierContactId))
          .filter(Boolean),
      ),
    ];

    const [suppliersResult, contactsResult] =
      await Promise.all([
        supabase
          .from("suppliers")
          .select("id")
          .eq("organization_id", organization.id)
          .eq("owner_id", user.id)
          .eq("approval_status", "approved")
          .in("id", supplierIds),

        supabase
          .from("supplier_contacts")
          .select("id,supplier_id")
          .eq("owner_id", user.id)
          .eq("is_active", true)
          .in("id", contactIds),
      ]);

    if (
      suppliersResult.error ||
      contactsResult.error
    ) {
      return {
        error:
          suppliersResult.error?.message ||
          contactsResult.error?.message,
      };
    }

    const validSuppliers = new Set(
      (suppliersResult.data || []).map(
        (item) => item.id,
      ),
    );

    const validContacts = new Map(
      (contactsResult.data || []).map((item) => [
        item.id,
        item.supplier_id,
      ]),
    );

    const invalidLink = information.systems.some(
      (system) =>
        !validSuppliers.has(system.supplierId) ||
        validContacts.get(system.supplierContactId) !==
          system.supplierId,
    );

    if (invalidLink) {
      return {
        error:
          "Select an approved supplier and an active contact belonging to that supplier for every critical system.",
      };
    }
  }

  const checks = profileChecks({
    location,
    leader,
    facilitator,
    description,
    services,
    value: valueProcesses,
    support: supportProcesses,
    dependencies: dependencyRecords,
    information,
    people: participants,
  });

  const completion = Math.round(
    (checks.filter(Boolean).length /
      checks.length) *
      100,
  );

  if (
    ["review", "approve"].includes(intent) &&
    !checks.every(Boolean)
  ) {
    return {
      error:
        "Complete all eight controlled sections before submission: site accountability, services, owned value-chain and support processes, linked dependencies, owned information or systems, valid participant records and the emergency-services directory.",
    };
  }

  if (!validEmail(text("site_leader_email"))) {
    return {
      error: "Enter a valid site leader email address.",
    };
  }

  if (
    hasDuplicates([
      ...valueProcesses,
      ...supportProcesses,
    ])
  ) {
    return {
      error:
        "Process names must be unique across value-chain and support processes.",
    };
  }

  if (hasDuplicates(dependencyRecords)) {
    return {
      error:
        "Dependency names must be unique within the site profile.",
    };
  }

  const reviewComment = text("review_comment");

  if (
    intent === "approve" &&
    !reviewer
  ) {
    return {
      error:
        "Record the competent reviewer or approval authority before approval.",
    };
  }

  if (
    intent === "changes" &&
    (!reviewer || !reviewComment)
  ) {
    return {
      error:
        "Record the reviewer and explain the changes required.",
    };
  }

  const now = new Date().toISOString();

  const currentVersion =
    Number(existing?.version) || 1;

  const editingApproved =
    existing?.status === "approved" &&
    intent !== "approve";

  const version = editingApproved
    ? currentVersion + 1
    : currentVersion;

  const status =
    intent === "approve"
      ? "approved"
      : intent === "changes"
        ? "changes_required"
        : intent === "review"
          ? "ready_for_review"
          : "draft";

  const operatingPattern =
    text("operating_pattern");

  const coreHours = text("core_hours");

  const reviewFrequency =
    text("review_frequency");

  const operatingHours = [
    operatingPattern,
    coreHours
      ? "Core hours: " + coreHours
      : "",
    reviewFrequency
      ? "Review: " + reviewFrequency
      : "",
  ]
    .filter(Boolean)
    .join(" · ");

  const data = {
    owner_id: user.id,
    organization_id: organization.id,
    status,
    version,
    region: text("region"),
    location_name: location,
    country:
      text("country") === "Other"
        ? text("country_custom")
        : text("country"),
    address: text("address"),
    headcount:
      Number(text("headcount")) || null,
    site_leader: leader,
    site_leader_email:
      text("site_leader_email"),
    regional_facilitator:
      text("regional_facilitator"),
    local_facilitator: facilitator,
    operational_description: description,
    critical_products_services: services,
    operating_pattern: operatingPattern,
    core_hours: coreHours,
    review_frequency: reviewFrequency,
    operating_hours: operatingHours,
    value_chain_processes: valueProcesses,
    support_processes: supportProcesses,
    site_dependencies: {
      records: dependencyRecords,
    },
    information_continuity: information,
    infosec_description:
      JSON.stringify(information),
    remote_support: JSON.stringify(
      information.remoteSupport || [],
    ),
    training_participants: participants,
    completion_percent: completion,
    review_due_date:
      text("review_due_date") || null,
    prepared_by:
      existing?.prepared_by ||
      user.email ||
      "Account owner",
    reviewed_by: [
      "approve",
      "changes",
    ].includes(intent)
      ? reviewer
      : null,
    reviewed_at: [
      "approve",
      "changes",
    ].includes(intent)
      ? now
      : null,
    review_comment: [
      "approve",
      "changes",
    ].includes(intent)
      ? reviewComment
      : null,
    approved_by:
      intent === "approve"
        ? reviewer
        : null,
    approved_at:
      intent === "approve"
        ? now
        : null,
    updated_at: now,
  };

  if (editingApproved) {
    const { error } = await supabase
      .from("bcp_site_profile_versions")
      .upsert(
        {
          profile_id: existing.id,
          organization_id: organization.id,
          owner_id: user.id,
          version: currentVersion,
          status: existing.status,
          snapshot: existing,
          change_reason:
            "Approved profile superseded by a new revision",
        },
        {
          onConflict: "profile_id,version",
        },
      );

    if (error) {
      return { error: error.message };
    }
  }

  let savedId = existing?.id;
  let saveError;

  if (existing) {
    const result = await supabase
      .from("bcp_site_profiles")
      .update(data)
      .eq("id", existing.id)
      .eq("owner_id", user.id);

    saveError = result.error;
  } else {
    const reference =
      "BCP-SP-" +
      new Date().getUTCFullYear() +
      "-" +
      crypto
        .randomUUID()
        .slice(0, 6)
        .toUpperCase();

    const result = await supabase
      .from("bcp_site_profiles")
      .insert({
        ...data,
        profile_reference: reference,
      })
      .select("id")
      .single();

    saveError = result.error;
    savedId = result.data?.id;
  }

  if (saveError) {
    return { error: saveError.message };
  }

  if (intent === "approve") {
    const { error: versionError } =
      await supabase
        .from("bcp_site_profile_versions")
        .upsert(
          {
            profile_id: savedId,
            organization_id: organization.id,
            owner_id: user.id,
            version,
            status: "approved",
            snapshot: {
              ...data,
              id: savedId,
            },
            change_reason:
              reviewComment ||
              "Controlled approval",
          },
          {
            onConflict:
              "profile_id,version",
          },
        );

    if (versionError) {
      return {
        error: versionError.message,
      };
    }
  }

  if (intent === "continue") {
    const requestedStep =
      Number(text("next_step")) || 0;

    const safeStep = Math.max(
      0,
      Math.min(7, requestedStep),
    );

    redirect(
      "/portal/business-continuity/site-profile?id=" +
        savedId +
        "&step=" +
        safeStep,
    );
  }

  redirect(
    "/portal/business-continuity/site-profile?id=" +
      savedId +
      "&step=6",
  );
}

export default async function SiteProfile({
  searchParams,
}) {
  const params = await searchParams;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(
      "/portal/login?next=/portal/business-continuity/site-profile",
    );
  }

  const { data: organization } = await supabase
    .from("organizations")
    .select("id,name")
    .eq("owner_id", user.id)
    .order("created_at")
    .limit(1)
    .maybeSingle();

  let initial = null;
  let companySites = [];
  let companyPeople = [];
  let suppliers = [];
  let supplierContacts = [];

  if (
    organization &&
    params?.new !== "1"
  ) {
    let query = supabase
      .from("bcp_site_profiles")
      .select("*")
      .eq(
        "organization_id",
        organization.id,
      )
      .neq("status", "archived");

    if (params?.id) {
      query = query.eq(
        "id",
        params.id,
      );
    }

    const result = await query
      .order("updated_at", {
        ascending: false,
      })
      .limit(1)
      .maybeSingle();

    initial = result.data;
  }

  if (organization) {
    const [
      sitesResult,
      peopleResult,
      permissionsResult,
      suppliersResult,
      supplierContactsResult,
    ] = await Promise.all([
      supabase
        .from("organization_sites")
        .select(
          "id,site_name,site_code,address_line_1,address_line_2,city,region,postal_code,country,timezone,status",
        )
        .eq(
          "organization_id",
          organization.id,
        )
        .neq("status", "archived")
        .order("site_name"),

      supabase
        .from("organization_people")
        .select(
          "id,first_name,last_name,email,position,account_status",
        )
        .eq(
          "organization_id",
          organization.id,
        )
        .eq("account_status", "active")
        .order("last_name"),

      supabase
        .from(
          "organization_person_permissions",
        )
        .select("person_id")
        .eq(
          "organization_id",
          organization.id,
        )
        .eq(
          "module_key",
          "business_continuity",
        )
        .neq("access_level", "none"),

      supabase
        .from("suppliers")
        .select(
          "id,legal_name,supplier_reference,approval_status",
        )
        .eq(
          "organization_id",
          organization.id,
        )
        .eq("owner_id", user.id)
        .order("legal_name"),

      supabase
        .from("supplier_contacts")
        .select(
          "id,supplier_id,first_name,last_name,business_title,department,email,is_primary,is_active",
        )
        .eq("owner_id", user.id)
        .eq("is_active", true)
        .order("is_primary", {
          ascending: false,
        })
        .order("last_name"),
    ]);

    const permittedIds = new Set(
      (permissionsResult.data || []).map(
        (permission) =>
          permission.person_id,
      ),
    );

    companySites =
      sitesResult.data || [];

    companyPeople = (
      peopleResult.data || []
    ).filter((person) =>
      permittedIds.has(person.id),
    );

    suppliers =
      suppliersResult.data || [];

    const currentSupplierIds = new Set(
      suppliers.map(
        (supplier) => supplier.id,
      ),
    );

    supplierContacts = (
      supplierContactsResult.data || []
    ).filter((contact) =>
      currentSupplierIds.has(
        contact.supplier_id,
      ),
    );
  }

  return (
    <main
      className="siteProfilePage"
      style={{
        minHeight: "100vh",
        padding: "28px 2vw 80px",
        background: "#edf3f8",
        fontFamily: "Arial,sans-serif",
      }}
    >
      <style>
        {
          "@media(max-width:600px){.siteProfilePage{padding:14px 10px 50px!important;overflow-x:hidden}.siteProfileInner{width:100%;max-width:100%!important}.siteProfileHeader{display:grid!important;grid-template-columns:1fr!important;gap:12px!important}.siteProfileHeader h1{font-size:30px!important}.siteProfileHeader nav{flex-wrap:wrap}}"
        }
      </style>

      <div
        className="siteProfileInner"
        style={{
          maxWidth: 1740,
          margin: "auto",
        }}
      >
        <header
          className="siteProfileHeader"
          style={{
            display: "flex",
            justifyContent:
              "space-between",
            gap: 20,
            alignItems: "start",
            marginBottom: 22,
          }}
        >
          <div>
            <small
              style={{
                color: "#6845d1",
                fontWeight: 900,
                letterSpacing: ".1em",
              }}
            >
              BCP HUB · MODULE 1 ·
              CONTROLLED SITE PROFILE
            </small>

            <h1
              style={{
                margin: "7px 0",
                color: "#071d3a",
                fontSize: 42,
              }}
            >
              Site Profile Assessment
            </h1>

            <p
              style={{
                margin: 0,
                color: "#62788e",
                fontSize: 16,
              }}
            >
              Establish the controlled
              site boundary and trusted
              source data used by Module 3,
              risk assessment and BIA.
            </p>
          </div>

          <nav
            style={{
              display: "flex",
              gap: 8,
            }}
          >
            <Link
              href="/portal/business-continuity/site-profile?new=1"
              style={{
                padding: "11px 14px",
                border:
                  "1px solid #2863e7",
                borderRadius: 8,
                background: "#2863e7",
                color: "#fff",
                textDecoration: "none",
                fontWeight: 850,
              }}
            >
              + New profile
            </Link>

            <Link
              href="/portal/business-continuity"
              style={{
                padding: "11px 14px",
                border:
                  "1px solid #c5d3e0",
                borderRadius: 8,
                background: "#fff",
                color: "#173b60",
                textDecoration: "none",
                fontWeight: 850,
              }}
            >
              ← BCP Hub
            </Link>
          </nav>
        </header>

        <BCPSiteProfileForm
          action={saveProfile}
          initial={initial}
          organisationName={
            organization?.name || ""
          }
          companySites={companySites}
          companyPeople={companyPeople}
          suppliers={suppliers}
          supplierContacts={
            supplierContacts
          }
          startStep={
            params?.step || 0
          }
        />
      </div>
    </main>
  );
}
