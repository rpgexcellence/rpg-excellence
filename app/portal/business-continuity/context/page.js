import Link from "next/link";
import { redirect } from "next/navigation";
import BCPContextAssessment from "../../../../components/BCPContextAssessment";
import { createAdminClient } from "../../../../lib/supabase/admin";
import { createClient } from "../../../../lib/supabase/server";

export const metadata = { title: "Organisational Context | RPG Excellence" };
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
    return value && typeof value === "object" && !Array.isArray(value)
      ? value
      : {};
  } catch {
    return {};
  }
};
const within = (value, min, max, fallback) => {
  const number = Number(value);
  return Number.isFinite(number)
    ? Math.max(min, Math.min(max, number))
    : fallback;
};
const allowedEvidenceExtensions = new Set([
  "pdf",
  "doc",
  "docx",
  "xls",
  "xlsx",
  "csv",
  "txt",
  "png",
  "jpg",
  "jpeg",
  "webp",
]);
const safeFileName = (name) =>
  String(name || "evidence")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .slice(-120);
const reviewIntervals = new Map([
  ["Monthly", 1],
  ["Quarterly", 3],
  ["Every 6 months", 6],
  ["Annually", 12],
  ["Every 2 years", 24],
]);
const calculateNextReview = (reviewDate, frequency) => {
  const months = reviewIntervals.get(frequency),
    date = new Date(`${reviewDate}T12:00:00Z`);
  if (!reviewDate || !months || Number.isNaN(date.getTime())) return null;
  date.setUTCMonth(date.getUTCMonth() + months);
  return date.toISOString().slice(0, 10);
};

function completionChecks({
  profile,
  external,
  internal,
  parties,
  objectives,
  risks,
  scope,
}) {
  return [
    Boolean(profile),
    external.some(
      (x) =>
        clean(x?.issue) &&
        Array.isArray(x?.applicableSystems) &&
        x.applicableSystems.length,
    ),
    internal.some(
      (x) =>
        clean(x?.issue) &&
        Array.isArray(x?.applicableSystems) &&
        x.applicableSystems.length,
    ),
    parties.some(
      (x) => clean(x?.name) && clean(x?.requirement) && clean(x?.communication),
    ),
    objectives.some(
      (x) => clean(x?.objective) && clean(x?.metric) && clean(x?.owner),
    ) &&
      risks.some(
        (x) => clean(x?.description) && clean(x?.owner) && clean(x?.decision),
      ),
    Boolean(
      clean(scope?.statement) &&
      ((Array.isArray(scope?.boundarySelections) &&
        scope.boundarySelections.length) ||
        clean(scope?.boundaryNotes) ||
        clean(scope?.boundaries)),
    ),
  ];
}

async function saveContext(_previousState, formData) {
  "use server";
  const supabase = await createClient(),
    {
      data: { user },
    } = await supabase.auth.getUser();
  if (!user) redirect("/portal/login?next=/portal/business-continuity/context");
  const { data: org } = await supabase
    .from("organizations")
    .select("id")
    .eq("owner_id", user.id)
    .order("created_at")
    .limit(1)
    .maybeSingle();
  if (!org)
    return {
      error: "Create an organisation before starting the context assessment.",
    };
  const intent = clean(formData.get("intent")),
    assessmentId = clean(formData.get("assessment_id")),
    siteProfileId = clean(formData.get("site_profile_id"));
  const external = parseArray(formData, "external_context"),
    internal = parseArray(formData, "internal_context"),
    parties = parseArray(formData, "interested_parties"),
    objectives = parseArray(formData, "objectives"),
    risks = parseArray(formData, "risks_opportunities"),
    scope = parseObject(formData, "scope_data");
  let existing = null;
  if (assessmentId) {
    const { data } = await supabase
      .from("bcp_context_assessments")
      .select("*")
      .eq("id", assessmentId)
      .eq("organization_id", org.id)
      .eq("owner_id", user.id)
      .maybeSingle();
    existing = data;
    if (!existing)
      return {
        error:
          "This Module 3 assessment could not be found or you do not have access to it.",
      };
  }
  if (intent === "archive") {
    if (!existing)
      return { error: "Only an existing assessment can be archived." };
    const { error } = await supabase
      .from("bcp_context_assessments")
      .update({ status: "archived", updated_at: new Date().toISOString() })
      .eq("id", existing.id)
      .eq("owner_id", user.id);
    if (error) return { error: error.message };
    redirect("/portal/business-continuity");
  }
  let profile = null;
  if (siteProfileId) {
    const { data } = await supabase
      .from("bcp_site_profiles")
      .select("*")
      .eq("id", siteProfileId)
      .eq("organization_id", org.id)
      .neq("status", "archived")
      .maybeSingle();
    profile = data;
  }
  const [peopleResult, permissionsResult] = await Promise.all([
    supabase
      .from("organization_people")
      .select("id,first_name,last_name")
      .eq("organization_id", org.id)
      .eq("account_status", "active"),
    supabase
      .from("organization_person_permissions")
      .select("person_id")
      .eq("organization_id", org.id)
      .eq("module_key", "business_continuity")
      .neq("access_level", "none"),
  ]);
  if (peopleResult.error || permissionsResult.error)
    return {
      error: peopleResult.error?.message || permissionsResult.error?.message,
    };
  const permittedIds = new Set(
      (permissionsResult.data || []).map((permission) => permission.person_id),
    ),
    controlledPeople = new Set(
      (peopleResult.data || [])
        .filter((person) => permittedIds.has(person.id))
        .map((person) =>
          `${person.first_name || ""} ${person.last_name || ""}`.trim(),
        )
        .filter(Boolean),
    ),
    participantNames = clean(formData.get("participants"))
      .split(/\r?\n|,/)
      .map(clean)
      .filter(Boolean),
    reviewer = clean(formData.get("reviewer_name")),
    controlledAssignments = [
      ...participantNames,
      ...external.map((record) => clean(record?.owner)),
      ...internal.map((record) => clean(record?.owner)),
      ...parties.map((record) => clean(record?.owner)),
      ...objectives.map((record) => clean(record?.owner)),
      ...risks.map((record) => clean(record?.owner)),
      clean(scope?.approval),
    ].filter(Boolean);
  if (
    ["review", "approve"].includes(intent) &&
    controlledAssignments.some((name) => !controlledPeople.has(name))
  )
    return {
      error:
        "Select all participants, owners and the scope approval authority from active Company Users with Business Continuity access.",
    };
  const recordsMissingOwners = [
    ...external.filter((record) => clean(record?.issue)),
    ...internal.filter((record) => clean(record?.issue)),
    ...parties.filter((record) => clean(record?.name)),
    ...objectives.filter((record) => clean(record?.objective)),
    ...risks.filter(
      (record) => clean(record?.title) || clean(record?.description),
    ),
  ].some((record) => !clean(record?.owner));
  if (
    ["review", "approve"].includes(intent) &&
    (!participantNames.length ||
      recordsMissingOwners ||
      !clean(scope?.approval))
  )
    return {
      error:
        "Assign at least one participant and select a Company User for every owner and approval-authority field before submission.",
    };
  if (
    ["review", "approve", "changes"].includes(intent) &&
    reviewer &&
    !controlledPeople.has(reviewer)
  )
    return {
      error:
        "Select the competent reviewer or approver from active Company Users with Business Continuity access.",
    };
  const checks = completionChecks({
      profile,
      external,
      internal,
      parties,
      objectives,
      risks,
      scope,
    }),
    completed = checks.filter(Boolean).length,
    completionPercent = Math.round((completed / checks.length) * 100);
  if (["review", "approve"].includes(intent) && !checks.every(Boolean))
    return {
      error:
        "Complete all six controlled sections before submission: linked site, External context, Internal context, interested parties with communication, owned objectives and evaluated risks, and the BCMS scope.",
    };
  if (intent === "approve" && profile?.status !== "approved")
    return {
      error:
        "Approve the linked Module 1 Site Profile before approving this Module 3 assessment.",
    };
  const reviewComment = clean(formData.get("review_comment"));
  const reviewDate = clean(formData.get("review_date")),
    reviewFrequency = clean(formData.get("review_frequency")) || "Annually",
    nextReviewDate = calculateNextReview(reviewDate, reviewFrequency);
  if (["review", "approve"].includes(intent) && !nextReviewDate)
    return {
      error:
        "Select a valid review date and review frequency before submission.",
    };
  if (["review", "approve"].includes(intent) && !reviewer)
    return {
      error:
        "Record the competent reviewer or approval authority before approval.",
    };
  if (intent === "changes" && (!reviewer || !reviewComment))
    return { error: "Record the reviewer and the changes required." };
  const currentVersion = Number(existing?.version) || 1,
    editingApproved = existing?.status === "approved" && intent !== "approve",
    version = editingApproved ? currentVersion + 1 : currentVersion;
  const status =
    intent === "approve"
      ? "approved"
      : intent === "changes"
        ? "changes_required"
        : intent === "review"
          ? "ready_for_review"
          : "draft";
  const savedId = existing?.id || crypto.randomUUID(),
    uploadedPaths = [],
    evidenceFiles = [...formData.entries()].filter(
      ([name, value]) =>
        name.startsWith("context_evidence_") &&
        value instanceof File &&
        value.size > 0,
    );
  if (evidenceFiles.length) {
    const admin = createAdminClient();
    for (const [fieldName, file] of evidenceFiles) {
      if (file.size > 10 * 1024 * 1024)
        return { error: `${file.name} exceeds the 10 MB evidence limit.` };
      const extension = file.name.split(".").pop()?.toLowerCase() || "";
      if (!allowedEvidenceExtensions.has(extension))
        return { error: `${file.name} is not an accepted evidence file type.` };
      const recordId = fieldName
        .slice("context_evidence_".length)
        .replace(/[^a-zA-Z0-9_-]/g, "")
        .slice(0, 80);
      const record = [...external, ...internal].find(
        (item) => String(item.id) === recordId,
      );
      if (!record) continue;
      const path = `${org.id}/${savedId}/${recordId}/${crypto.randomUUID()}-${safeFileName(file.name)}`;
      const { error: uploadError } = await admin.storage
        .from("bcp-context-evidence")
        .upload(path, file, {
          contentType: file.type || "application/octet-stream",
          upsert: false,
        });
      if (uploadError) return { error: uploadError.message };
      uploadedPaths.push(path);
      record.evidenceFile = {
        fileName: file.name,
        storagePath: path,
        mimeType: file.type || "application/octet-stream",
        sizeBytes: file.size,
        uploadedAt: new Date().toISOString(),
        uploadedBy: user.id,
      };
    }
  }
  const now = new Date().toISOString(),
    data = {
      owner_id: user.id,
      organization_id: org.id,
      site_profile_id: profile?.id || null,
      site_profile_version: profile?.version || 1,
      site_profile_snapshot: profile || null,
      assessment_title:
        clean(formData.get("assessment_title")) ||
        "Organisational context and interested parties",
      participants: participantNames.join("\n"),
      risk_appetite: within(formData.get("risk_appetite"), 1, 5, 3),
      external_context: external,
      internal_context: internal,
      interested_parties: parties,
      objectives,
      risks_opportunities: risks,
      scope_data: scope,
      completion_percent: completionPercent,
      review_date: reviewDate || null,
      review_frequency: reviewFrequency,
      next_review_date: nextReviewDate,
      review_due_date: nextReviewDate,
      status,
      version,
      prepared_by: existing?.prepared_by || user.email || "Account owner",
      reviewed_by: reviewer || existing?.reviewed_by || null,
      reviewed_at: ["approve", "changes"].includes(intent)
        ? now
        : existing?.reviewed_at || null,
      review_comment: ["approve", "changes"].includes(intent)
        ? reviewComment
        : existing?.review_comment || null,
      approved_by:
        intent === "approve" ? reviewer : existing?.approved_by || null,
      approved_at: intent === "approve" ? now : existing?.approved_at || null,
      updated_at: now,
    };
  if (editingApproved)
    await supabase.from("bcp_context_assessment_versions").insert({
      assessment_id: existing.id,
      organization_id: org.id,
      owner_id: user.id,
      version: currentVersion,
      status: existing.status,
      snapshot: existing,
      change_reason: "Approved version superseded by a new revision",
    });
  let error;
  if (existing)
    ({ error } = await supabase
      .from("bcp_context_assessments")
      .update(data)
      .eq("id", existing.id)
      .eq("owner_id", user.id));
  else {
    const result = await supabase
      .from("bcp_context_assessments")
      .insert({
        id: savedId,
        ...data,
        assessment_reference: `BCP-CTX-${new Date().getUTCFullYear()}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`,
      })
      .select("id")
      .single();
    error = result.error;
    if (result.data?.id && result.data.id !== savedId)
      return { error: "The saved assessment identifier did not match." };
  }
  if (error) {
    if (uploadedPaths.length)
      await createAdminClient()
        .storage.from("bcp-context-evidence")
        .remove(uploadedPaths);
    return { error: error.message };
  }
  if (intent === "approve")
    await supabase.from("bcp_context_assessment_versions").upsert(
      {
        assessment_id: savedId,
        organization_id: org.id,
        owner_id: user.id,
        version,
        status: "approved",
        snapshot: { ...data, id: savedId },
        change_reason: reviewComment || "Controlled approval",
      },
      { onConflict: "assessment_id,version" },
    );
  if (intent === "continue")
    redirect(
      `/portal/business-continuity/context?id=${savedId}&step=${within(formData.get("next_step"), 0, 5, 0)}`,
    );
  redirect(`/portal/business-continuity/context?id=${savedId}&step=5`);
}

export default async function ContextPage({ searchParams }) {
  const params = await searchParams,
    supabase = await createClient(),
    {
      data: { user },
    } = await supabase.auth.getUser();
  if (!user) redirect("/portal/login?next=/portal/business-continuity/context");
  const { data: org } = await supabase
    .from("organizations")
    .select("id,name")
    .eq("owner_id", user.id)
    .order("created_at")
    .limit(1)
    .maybeSingle();
  let profiles = [],
    initial = null,
    companyPeople = [];
  if (org) {
    const [profilesResult, peopleResult, permissionsResult] = await Promise.all(
      [
        supabase
          .from("bcp_site_profiles")
          .select(
            "id,profile_reference,status,version,completion_percent,region,country,location_name,address,site_leader,local_facilitator,operational_description,critical_products_services,value_chain_processes,support_processes,site_dependencies,information_continuity,interested_parties,training_participants",
          )
          .eq("organization_id", org.id)
          .neq("status", "archived")
          .order("updated_at", { ascending: false }),
        supabase
          .from("organization_people")
          .select("id,first_name,last_name,email,position,account_status")
          .eq("organization_id", org.id)
          .eq("account_status", "active")
          .order("last_name"),
        supabase
          .from("organization_person_permissions")
          .select("person_id")
          .eq("organization_id", org.id)
          .eq("module_key", "business_continuity")
          .neq("access_level", "none"),
      ],
    );
    profiles = profilesResult.data || [];
    const permittedIds = new Set(
      (permissionsResult.data || []).map((permission) => permission.person_id),
    );
    companyPeople = (peopleResult.data || []).filter((person) =>
      permittedIds.has(person.id),
    );
    if (params?.new !== "1") {
      let query = supabase
        .from("bcp_context_assessments")
        .select("*")
        .eq("organization_id", org.id)
        .neq("status", "archived");
      if (params?.id) query = query.eq("id", params.id);
      ({ data: initial } = await query
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle());
    }
  }
  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "26px 2vw 80px",
        background: "#edf3f8",
        fontFamily: "Arial,sans-serif",
      }}
    >
      <div style={{ maxWidth: 1740, margin: "auto" }}>
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 20,
            alignItems: "start",
            marginBottom: 20,
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
              BCP HUB · MODULE 3 · ISO 22301 CLAUSE 4
            </small>
            <h1 style={{ margin: "7px 0", color: "#071d3a", fontSize: 42 }}>
              Context &amp; Interested Parties
            </h1>
            <p style={{ margin: 0, color: "#62788e", fontSize: 16 }}>
              Turn organisational context, stakeholder requirements and scope
              decisions into a prioritised, auditable register.
            </p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Link
              href="/portal/business-continuity/context?new=1"
              style={{
                padding: "11px 14px",
                border: "1px solid #315fe6",
                borderRadius: 8,
                background: "#315fe6",
                color: "#fff",
                textDecoration: "none",
                fontWeight: 850,
              }}
            >
              + New assessment
            </Link>
            <Link
              href="/portal/business-continuity"
              style={{
                padding: "11px 14px",
                border: "1px solid #c5d3e0",
                borderRadius: 8,
                background: "#fff",
                color: "#173b60",
                textDecoration: "none",
                fontWeight: 850,
              }}
            >
              ← BCP Hub
            </Link>
          </div>
        </header>
        <BCPContextAssessment
          action={saveContext}
          profiles={profiles || []}
          initial={initial}
          organisationName={org?.name || ""}
          companyPeople={companyPeople}
          startStep={params?.step || 0}
        />
      </div>
    </main>
  );
}
