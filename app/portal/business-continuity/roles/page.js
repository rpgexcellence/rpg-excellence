import Link from "next/link";
import { redirect } from "next/navigation";
import BCPRolesResponsibilities from "../../../../components/BCPRolesResponsibilities";
import { createClient } from "../../../../lib/supabase/server";
export const metadata = {
  title: "BCMS Roles & Responsibilities | RPG Excellence",
};
export const dynamic = "force-dynamic";
const clean = (value) => String(value ?? "").trim();
const parseArray = (fd, name) => {
  try {
    const value = JSON.parse(clean(fd.get(name)) || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
};
async function saveRoles(_previousState, fd) {
  "use server";
  const s = await createClient(),
    {
      data: { user },
    } = await s.auth.getUser();
  if (!user) redirect("/portal/login?next=/portal/business-continuity/roles");
  const { data: org } = await s
    .from("organizations")
    .select("id")
    .eq("owner_id", user.id)
    .order("created_at")
    .limit(1)
    .maybeSingle();
  if (!org)
    return { error: "Create an organisation before starting Module 4." };
  const t = (name) => clean(fd.get(name)),
    id = t("assessment_id"),
    intent = t("intent");
  let existing = null;
  if (id) {
    const { data } = await s
      .from("bcp_role_assessments")
      .select("*")
      .eq("id", id)
      .eq("organization_id", org.id)
      .eq("owner_id", user.id)
      .maybeSingle();
    existing = data;
    if (!existing)
      return { error: "This Module 4 assessment could not be found." };
  }
  if (intent === "archive") {
    if (!existing)
      return { error: "Only an existing assessment can be archived." };
    const { error } = await s
      .from("bcp_role_assessments")
      .update({ status: "archived", updated_at: new Date().toISOString() })
      .eq("id", existing.id)
      .eq("owner_id", user.id);
    if (error) return { error: error.message };
    redirect("/portal/business-continuity");
  }
  const roles = parseArray(fd, "roles"),
    assignments = parseArray(fd, "assignments"),
    profileId = t("site_profile_id"),
    contextId = t("context_assessment_id");
  const { data: profile } = profileId
    ? await s
        .from("bcp_site_profiles")
        .select("*")
        .eq("id", profileId)
        .eq("organization_id", org.id)
        .neq("status", "archived")
        .maybeSingle()
    : { data: null };
  const { data: context } = contextId
    ? await s
        .from("bcp_context_assessments")
        .select("*")
        .eq("id", contextId)
        .eq("organization_id", org.id)
        .neq("status", "archived")
        .maybeSingle()
    : { data: null };
  const { data: activePeople = [] } = await s
    .from("organization_people")
    .select("id,first_name,last_name")
    .eq("organization_id", org.id)
    .eq("account_status", "active");
  const controlledPeople = new Set(
    activePeople
      .map((person) => `${person.first_name} ${person.last_name}`.trim()),
  );
  const roleNames = new Set(
    roles.map((role) => clean(role.title)).filter(Boolean),
  );
  const rolePeopleErrors = roles.flatMap((role, index) => {
    const title = clean(role.title) || `Role ${index + 1}`,
      primary = clean(role.primaryHolder),
      assigned = (role.people || []).map(clean).filter(Boolean),
      deputies = (role.deputies || []).map(clean).filter(Boolean),
      errors = [];
    if (!primary) errors.push(`${title}: select a primary role holder`);
    else if (!controlledPeople.has(primary))
      errors.push(`${title}: primary holder “${primary}” is not an active Company User`);
    assigned
      .filter((name) => !controlledPeople.has(name))
      .forEach((name) => errors.push(`${title}: assigned person “${name}” is not an active Company User`));
    deputies
      .filter((name) => !controlledPeople.has(name))
      .forEach((name) => errors.push(`${title}: deputy “${name}” is not an active Company User`));
    if (primary && deputies.includes(primary))
      errors.push(`${title}: primary holder and deputy must be different people`);
    return errors;
  });
  const assignmentsUseControlledActors = assignments.every((assignment) => {
    const external = new Set((assignment.customActors || []).map(clean));
    const allowed = (name) =>
      !name ||
      roleNames.has(clean(name)) ||
      controlledPeople.has(clean(name)) ||
      external.has(clean(name));
    return (
      allowed(assignment.accountable) &&
      (assignment.responsible || []).every(allowed) &&
      (assignment.consulted || []).every(allowed) &&
      (assignment.informed || []).every(allowed)
    );
  });
  const processNames = [
    ...(Array.isArray(profile?.value_chain_processes)
      ? profile.value_chain_processes
      : []),
    ...(Array.isArray(profile?.support_processes)
      ? profile.support_processes
      : []),
  ]
    .map((x) => clean(x?.name || x))
    .filter(Boolean);
  const complete = [
    Boolean(profile),
    roles.some(
      (x) =>
        clean(x.title) &&
        clean(x.purpose) &&
        clean(x.primaryHolder) &&
        x.people?.length,
    ),
    processNames.length > 0 &&
      processNames.every((name) =>
        assignments.some(
          (x) =>
            x.source?.startsWith("Module 1") &&
            clean(x.activity) === name &&
            clean(x.accountable),
        ),
      ),
    assignments.some(
      (x) => clean(x.activity) && clean(x.accountable) && x.responsible?.length,
    ),
    roles.some(
      (x) =>
        clean(x.authority) &&
        clean(x.escalation) &&
        clean(x.competence) &&
        clean(x.communication),
    ),
    roles.length > 0 &&
      roles.every(
        (x) =>
          x.title &&
          x.purpose &&
          x.primaryHolder &&
          x.people?.length &&
          x.authority,
      ) &&
      assignments.length > 0 &&
      assignments.every(
        (x) => x.activity && x.accountable && x.responsible?.length,
      ),
  ];
  const completion = Math.round((complete.filter(Boolean).length / 6) * 100);
  if (
    ["review", "approve"].includes(intent) &&
    (rolePeopleErrors.length || !assignmentsUseControlledActors)
  )
    return {
      error: `Cannot submit: ${rolePeopleErrors.length || 1} role assignment requirement${(rolePeopleErrors.length || 1) === 1 ? " is" : "s are"} incomplete.`,
      validation: {
        step: 4,
        items: rolePeopleErrors.length
          ? rolePeopleErrors
          : ["A RACI assignment contains a person who is not an active Company User or approved local actor"],
      },
    };
  if (["review", "approve"].includes(intent) && !complete.every(Boolean))
    return {
      error:
        "Complete the source link, assigned roles, ownership for every Module 1 process, operational RACI, authority and competence controls before submission.",
    };
  if (intent === "approve" && profile?.status !== "approved")
    return {
      error:
        "Approve the linked Module 1 Site Profile before approving Module 4.",
    };
  if (intent === "approve" && context && context.status !== "approved")
    return {
      error:
        "The linked Module 3 assessment must be approved before Module 4 approval.",
    };
  const reviewer = t("reviewer_name"),
    comment = t("review_comment");
  if (
    ["review", "approve", "changes"].includes(intent) &&
    reviewer &&
    !controlledPeople.has(reviewer)
  )
    return {
      error:
        "Select the competent reviewer or approver from active Company Users with Business Continuity access.",
    };
  if (["review", "approve"].includes(intent) && !reviewer)
    return { error: "Record the competent reviewer or approver." };
  if (intent === "changes" && (!reviewer || !comment))
    return { error: "Record the reviewer and the changes required." };
  const now = new Date().toISOString(),
    currentVersion = Number(existing?.version) || 1,
    editingApproved = existing?.status === "approved" && intent !== "approve",
    version = editingApproved ? currentVersion + 1 : currentVersion,
    status =
      intent === "approve"
        ? "approved"
        : intent === "changes"
          ? "changes_required"
          : intent === "review"
            ? "ready_for_review"
            : "draft";
  const data = {
    owner_id: user.id,
    organization_id: org.id,
    site_profile_id: profile?.id || null,
    context_assessment_id: context?.id || null,
    site_profile_version: profile?.version || null,
    context_assessment_version: context?.version || null,
    source_snapshot: { profile, context },
    assessment_title:
      t("assessment_title") || "BCMS roles and responsibilities",
    roles,
    assignments,
    notes: t("notes"),
    distribution: t("distribution"),
    completion_percent: completion,
    review_due_date: t("review_due_date") || null,
    status,
    version,
    prepared_by: existing?.prepared_by || user.email || "Account owner",
    reviewed_by: reviewer || existing?.reviewed_by || null,
    reviewed_at: ["approve", "changes"].includes(intent)
      ? now
      : existing?.reviewed_at || null,
    review_comment: ["approve", "changes"].includes(intent)
      ? comment
      : existing?.review_comment || null,
    approved_by:
      intent === "approve" ? reviewer : existing?.approved_by || null,
    approved_at: intent === "approve" ? now : existing?.approved_at || null,
    updated_at: now,
  };
  if (editingApproved) {
    const { error } = await s.from("bcp_role_assessment_versions").insert({
      assessment_id: existing.id,
      organization_id: org.id,
      owner_id: user.id,
      version: currentVersion,
      status: existing.status,
      snapshot: existing,
      change_reason: "Approved version superseded",
    });
    if (error) return { error: error.message };
  }
  let savedId = existing?.id,
    error;
  if (existing)
    ({ error } = await s
      .from("bcp_role_assessments")
      .update(data)
      .eq("id", existing.id)
      .eq("owner_id", user.id));
  else {
    const result = await s
      .from("bcp_role_assessments")
      .insert({
        ...data,
        assessment_reference: `BCP-RR-${new Date().getUTCFullYear()}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`,
      })
      .select("id")
      .single();
    error = result.error;
    savedId = result.data?.id;
  }
  if (error) return { error: error.message };
  if (intent === "approve") {
    const { error: versionError } = await s
      .from("bcp_role_assessment_versions")
      .upsert(
        {
          assessment_id: savedId,
          organization_id: org.id,
          owner_id: user.id,
          version,
          status,
          snapshot: { ...data, id: savedId },
          change_reason: comment || "Controlled approval",
        },
        { onConflict: "assessment_id,version" },
      );
    if (versionError) return { error: versionError.message };
  }
  if (intent === "continue")
    redirect(
      `/portal/business-continuity/roles?id=${savedId}&step=${Math.max(0, Math.min(5, Number(t("next_step")) || 0))}`,
    );
  redirect(`/portal/business-continuity/roles?id=${savedId}&step=5`);
}
export default async function RolesPage({ searchParams }) {
  const params = await searchParams,
    s = await createClient(),
    {
      data: { user },
    } = await s.auth.getUser();
  if (!user) redirect("/portal/login?next=/portal/business-continuity/roles");
  const { data: org } = await s
    .from("organizations")
    .select("id,name")
    .eq("owner_id", user.id)
    .order("created_at")
    .limit(1)
    .maybeSingle();
  let profiles = [],
    contexts = [],
    companyPeople = [],
    initial = null;
  if (org) {
    ({ data: profiles = [] } = await s
      .from("bcp_site_profiles")
      .select("*")
      .eq("organization_id", org.id)
      .neq("status", "archived")
      .order("updated_at", { ascending: false }));
    ({ data: contexts = [] } = await s
      .from("bcp_context_assessments")
      .select("*")
      .eq("organization_id", org.id)
      .neq("status", "archived")
      .order("updated_at", { ascending: false }));
    const { data: peopleResult = [] } = await s
      .from("organization_people")
      .select("id,first_name,last_name,email,position,account_status")
      .eq("organization_id", org.id)
      .eq("account_status", "active")
      .order("last_name");
    companyPeople = peopleResult;
    if (params?.new !== "1") {
      let query = s
        .from("bcp_role_assessments")
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
              BCP HUB · MODULE 4 · ISO 22301 CLAUSE 5.3
            </small>
            <h1 style={{ margin: "7px 0", color: "#071d3a", fontSize: 42 }}>
              Roles, Responsibilities &amp; Authorities
            </h1>
            <p style={{ margin: 0, color: "#62788e" }}>
              Turn approved boundaries, processes, context and risks into
              accountable roles and a controlled RACI.
            </p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Link
              href="/portal/business-continuity/roles?new=1"
              style={{
                padding: "11px 14px",
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
        <BCPRolesResponsibilities
          action={saveRoles}
          profiles={profiles}
          contexts={contexts}
          companyPeople={companyPeople}
          initial={initial}
          organisationName={org?.name || ""}
          startStep={params?.step || 0}
        />
      </div>
    </main>
  );
}
