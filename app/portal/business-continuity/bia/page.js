import Link from "next/link";
import { redirect } from "next/navigation";
import BCPBusinessImpactAnalysis from "../../../../components/BCPBusinessImpactAnalysis";
import { createClient } from "../../../../lib/supabase/server";
import { saveBia as saveBiaAction } from "./actions";

export const metadata = { title: "Business Impact Analysis | RPG Excellence" };
export const dynamic = "force-dynamic";
const clean = (v) => String(v ?? "").trim();
const parseArray = (fd, name) => { try { const v = JSON.parse(clean(fd.get(name)) || "[]"); return Array.isArray(v) ? v : []; } catch { return []; } };
const derive = (item) => {
  const horizons = [{ key: "h0", hours: 4 }, { key: "h1", hours: 24 }, { key: "h2", hours: 72 }, { key: "h3", hours: 168 }, { key: "h4", hours: 336 }, { key: "h5", hours: 720 }];
  const types = Object.values(item?.impactScores || {}), threshold = Math.max(3, Math.min(5, Number(item?.unacceptableThreshold) || 4));
  const maxAt = (key) => Math.max(0, ...types.map((x) => Number(x?.[key] || 0)));
  const hitIndex = horizons.findIndex((h) => maxAt(h.key) >= threshold), detected = hitIndex >= 0 ? horizons[hitIndex].hours : 0;
  const mtpd = Number(item?.mtpdHours) || detected, rto = Number(item?.rtoHours) || (hitIndex > 0 ? horizons[hitIndex - 1].hours : detected ? 1 : 0);
  return { peakImpact: Math.max(...horizons.map((h) => maxAt(h.key))), detectedMtpdHours: detected, mtpdHours: mtpd, rtoHours: rto, valid: Boolean(mtpd && rto && rto < mtpd && Number(item?.mbcoPercent) > 0 && Number(item?.troHours) >= rto && Number(item?.rpoHours) >= 0) };
};

async function saveBia(_previousState, fd) {
  "use server";
  const s = await createClient(), { data: { user } } = await s.auth.getUser();
  if (!user) redirect("/portal/login?next=/portal/business-continuity/bia");
  const { data: org } = await s.from("organizations").select("id").eq("owner_id", user.id).order("created_at").limit(1).maybeSingle();
  if (!org) return { error: "Create an organisation before starting the Business Impact Analysis." };
  const t = (name) => clean(fd.get(name)), id = t("assessment_id"), intent = t("intent");
  let existing = null;
  if (id) { const { data } = await s.from("bcp_bia_assessments").select("*").eq("id", id).eq("organization_id", org.id).eq("owner_id", user.id).maybeSingle(); existing = data; if (!existing) return { error: "This Business Impact Analysis could not be found." }; }
  if (intent === "archive") { if (!existing) return { error: "Only an existing BIA can be archived." }; const { error } = await s.from("bcp_bia_assessments").update({ status: "archived", updated_at: new Date().toISOString() }).eq("id", existing.id).eq("owner_id", user.id); if (error) return { error: error.message }; redirect("/portal/business-continuity"); }
  const profileId = t("site_profile_id"), contextId = t("context_assessment_id"), roleId = t("role_assessment_id"), hazardId = t("hazard_assessment_id");
  const [{ data: profile }, { data: context }, { data: role }, { data: hazard }] = await Promise.all([
    profileId ? s.from("bcp_site_profiles").select("*").eq("id", profileId).eq("organization_id", org.id).neq("status", "archived").maybeSingle() : { data: null },
    contextId ? s.from("bcp_context_assessments").select("*").eq("id", contextId).eq("organization_id", org.id).neq("status", "archived").maybeSingle() : { data: null },
    roleId ? s.from("bcp_role_assessments").select("*").eq("id", roleId).eq("organization_id", org.id).neq("status", "archived").maybeSingle() : { data: null },
    hazardId ? s.from("bcp_hazard_assessments").select("*").eq("id", hazardId).eq("organization_id", org.id).neq("status", "archived").maybeSingle() : { data: null },
  ]);
  if (!profile) return { error: "Select a valid Module 1 Site Profile." };
  const activities = parseArray(fd, "activity_assessments").filter((x) => x.included !== false).map((x) => ({ ...x, calculated: derive(x) }));
  const checks = [activities.length > 0, activities.every((x) => x.name && x.owner), activities.every((x) => x.calculated.peakImpact > 0), activities.every((x) => x.calculated.valid), activities.every((x) => x.resources?.length && x.dependencies?.length), activities.every((x) => x.evidence?.length && x.assumptions)];
  const completion = Math.round(checks.filter(Boolean).length / checks.length * 100);
  if (["review", "approve"].includes(intent) && !checks.every(Boolean)) return { error: "Complete activity ownership, impact-over-time scoring, valid recovery objectives, resources, dependencies, evidence and assumptions before submission." };
  if (intent === "approve" && profile.status !== "approved") return { error: "Approve the linked Module 1 Site Profile before approving the BIA." };
  for (const [record, label] of [[context, "Module 3 Context Assessment"], [role, "Module 4 Roles Assessment"], [hazard, "Module 5 Hazard Assessment"]]) if (intent === "approve" && record && record.status !== "approved") return { error: `The linked ${label} must be approved first.` };
  const reviewer = t("reviewer_name"), comment = t("review_comment");
  if (intent === "approve" && !reviewer) return { error: "Record the competent reviewer or approver." };
  const now = new Date().toISOString(), currentVersion = Number(existing?.version) || 1, editingApproved = existing?.status === "approved" && intent !== "approve", version = editingApproved ? currentVersion + 1 : currentVersion, status = intent === "approve" ? "approved" : intent === "review" ? "ready_for_review" : "draft";
  const data = { owner_id: user.id, organization_id: org.id, site_profile_id: profile.id, context_assessment_id: context?.id || null, role_assessment_id: role?.id || null, hazard_assessment_id: hazard?.id || null, source_versions: { siteProfile: profile.version || 1, context: context?.version || null, roles: role?.version || null, hazards: hazard?.version || null }, source_snapshot: { profile, context, role, hazard }, assessment_title: t("assessment_title") || "Business Impact Analysis", activity_assessments: activities, prioritized_activities: activities.map((x) => ({ id: x.id, name: x.name, owner: x.owner, products: x.products, rtoHours: x.calculated.rtoHours, mtpdHours: x.calculated.mtpdHours, mbcoPercent: x.mbcoPercent, troHours: x.troHours, rpoHours: x.rpoHours, resources: x.resources, dependencies: x.dependencies, hazards: x.hazards })).sort((a, b) => a.rtoHours - b.rtoHours), methodology: { clause: "ISO 22301:2019 8.2.2", impactScale: "0 N/A, 1 Minimal, 2 Minor, 3 Material, 4 Major, 5 Severe", timeHorizons: [4, 24, 72, 168, 336, 720], mtpdMethod: "First time horizon where any relevant impact reaches the selected unacceptable threshold", controlRules: ["RTO must be shorter than MTPD", "TRO must not be shorter than RTO", "MBCO must be greater than zero"] }, review_frequency: t("review_frequency") || "Every 6 months", next_review_date: t("next_review_date") || null, completion_percent: completion, status, version, prepared_by: existing?.prepared_by || user.email || "Account owner", reviewed_by: intent === "approve" ? reviewer : null, reviewed_at: intent === "approve" ? now : null, review_comment: comment || null, approved_by: intent === "approve" ? reviewer : null, approved_at: intent === "approve" ? now : null, updated_at: now };
  if (editingApproved) { const { error } = await s.from("bcp_bia_assessment_versions").insert({ assessment_id: existing.id, organization_id: org.id, owner_id: user.id, version: currentVersion, status: existing.status, snapshot: existing, change_reason: "Approved version superseded" }); if (error) return { error: error.message }; }
  let savedId = existing?.id, error;
  if (existing) ({ error } = await s.from("bcp_bia_assessments").update(data).eq("id", existing.id).eq("owner_id", user.id));
  else { const result = await s.from("bcp_bia_assessments").insert({ ...data, assessment_reference: `BCP-BIA-${new Date().getUTCFullYear()}-${crypto.randomUUID().slice(0, 6).toUpperCase()}` }).select("id").single(); savedId = result.data?.id; error = result.error; }
  if (error) return { error: error.message };
  if (intent === "approve") { const { error: versionError } = await s.from("bcp_bia_assessment_versions").upsert({ assessment_id: savedId, organization_id: org.id, owner_id: user.id, version, status, snapshot: { ...data, id: savedId }, change_reason: comment || "Controlled approval" }, { onConflict: "assessment_id,version" }); if (versionError) return { error: versionError.message }; }
  if (intent === "continue") redirect(`/portal/business-continuity/bia?id=${savedId}&step=${Math.max(0, Math.min(5, Number(t("next_step")) || 0))}`);
  redirect(`/portal/business-continuity/bia?id=${savedId}&step=5`);
}

export default async function BiaPage({ searchParams }) {
  const params = await searchParams, s = await createClient(), { data: { user } } = await s.auth.getUser();
  if (!user) redirect("/portal/login?next=/portal/business-continuity/bia");
  const { data: org } = await s.from("organizations").select("id,name").eq("owner_id", user.id).order("created_at").limit(1).maybeSingle();
  let profiles = [], contexts = [], roles = [], hazards = [], initial = null;
  if (org) {
    ({ data: profiles = [] } = await s.from("bcp_site_profiles").select("*").eq("organization_id", org.id).neq("status", "archived").order("updated_at", { ascending: false }));
    ({ data: contexts = [] } = await s.from("bcp_context_assessments").select("*").eq("organization_id", org.id).neq("status", "archived").order("updated_at", { ascending: false }));
    ({ data: roles = [] } = await s.from("bcp_role_assessments").select("*").eq("organization_id", org.id).neq("status", "archived").order("updated_at", { ascending: false }));
    ({ data: hazards = [] } = await s.from("bcp_hazard_assessments").select("*").eq("organization_id", org.id).neq("status", "archived").order("updated_at", { ascending: false }));
    if (params?.new !== "1") { let q = s.from("bcp_bia_assessments").select("*").eq("organization_id", org.id).neq("status", "archived"); if (params?.id) q = q.eq("id", params.id); ({ data: initial } = await q.order("updated_at", { ascending: false }).limit(1).maybeSingle()); }
  }
  return <main style={{ minHeight: "100vh", padding: "26px 2vw 80px", background: "#edf3f8", fontFamily: "Arial,sans-serif" }}><div style={{ maxWidth: 1840, margin: "auto" }}><header style={{ display: "flex", justifyContent: "space-between", gap: 20, marginBottom: 20 }}><div><small style={{ color: "#6845d1", fontWeight: 900, letterSpacing: ".1em" }}>BCP HUB · MODULE 6 · ISO 22301 CLAUSE 8.2.2</small><h1 style={{ margin: "7px 0", color: "#071d3a", fontSize: 42 }}>Business Impact Analysis</h1><p style={{ margin: 0, color: "#62788e" }}>Measure disruption impacts over time and set controlled recovery priorities, tolerances and resource requirements.</p></div><div style={{ display: "flex", gap: 8 }}><Link href="/portal/business-continuity/bia?new=1" style={{ padding: "11px 14px", borderRadius: 8, background: "#315fe6", color: "#fff", textDecoration: "none", fontWeight: 850 }}>+ New BIA</Link><Link href="/portal/business-continuity" style={{ padding: "11px 14px", border: "1px solid #c5d3e0", borderRadius: 8, background: "#fff", color: "#173b60", textDecoration: "none", fontWeight: 850 }}>← BCP Hub</Link></div></header><BCPBusinessImpactAnalysis action={saveBiaAction} profiles={profiles} contexts={contexts} roles={roles} hazards={hazards} initial={initial} organisationName={org?.name || ""} startStep={params?.step || 0}/></div></main>;
}
