// VERIFIED_ISMS_RISK_PAGE_DRAFT_20261021: explicit conditions and unique draft keys.
import ControlledDeviceDrafts from "../../../../components/ControlledDeviceDrafts";
import { notFound, redirect } from "next/navigation";
import { createClient } from "../../../../lib/supabase/server";
import ISMSRiskWorkspace from "../../../../components/ISMSRiskWorkspace";
import ISMSWorkspaceShell from "../../../../components/ISMSWorkspaceShell";
import { siteToday, UUID } from "../../../../lib/zone-policy.mjs";
import { createAdminClient } from "../../../../lib/supabase/admin";
import ISMSRiskRecord from "./ISMSRiskRecord";
import { loadRiskRecord } from "./risk-record-data";
import { recordISMSRiskAcceptance, saveISMSRisk } from "./actions";
export const metadata = {
  "title": "ISMS Risk Management | RPG Excellence"
};
export const dynamic = "force-dynamic";
export default async function ISMSRiskPage({searchParams}) {
  const query=await searchParams;
  const s = await createClient(),
    {
      data: {
        user
      }
    } = await s.auth.getUser();
  if (!user) {
    const risk = query?.risk ?? query?.id;
    const next = "/portal/information-security/risk-management" + (typeof risk === "string" && UUID.test(risk) ? "?risk=" + risk : "");
    redirect("/portal/login?next=" + encodeURIComponent(next));
  }
  const initialRiskId = query?.risk ?? query?.id ?? null;
  let organizationQuery = s.from("organizations").select("id,name").eq("owner_id", user.id);
  if (typeof initialRiskId === "string" && UUID.test(initialRiskId) && query?.edit !== "1") {
    const { data: target, error } = await s.from("isms_risks").select("organization_id")
      .eq("id", initialRiskId).eq("owner_id", user.id).neq("status", "archived").maybeSingle();
    if (error) throw new Error("The risk assessment could not be loaded.");
    if (!target?.organization_id) notFound();
    organizationQuery = organizationQuery.eq("id", target.organization_id);
  }
  const { data: org } = await organizationQuery.order("created_at").limit(1).maybeSingle();
  if (!org) redirect("/portal");
  if (initialRiskId !== null && query?.edit !== "1") {
    const record = await loadRiskRecord(s, user.id, org.id, initialRiskId);
    if (!record) notFound();
    return <ISMSRiskRecord record={record} organizationName={org.name} today={siteToday("Europe/London")}
      initialTab={query?.tab} acceptanceAction={recordISMSRiskAcceptance}/>;
  }
  let {
    data: methodology, error: methodologyError
  } = await s.from("isms_risk_methodologies").select("*").eq("organization_id", org.id).eq("status", "approved").order("approved_at", {
    "ascending": false
  }).limit(1).maybeSingle();
  if (methodologyError) throw new Error("The approved risk methodology could not be loaded.");
  if (!methodology) {
    const result = await s.from("isms_risk_methodologies").insert({
      "owner_id": user.id,
      "organization_id": org.id,
      "approved_by": user.email || "Account owner"
    }).select("*").single();
    if (result.error || !result.data) throw new Error("The approved risk methodology could not be initialised.");
    methodology = result.data;
  }
  const [riskResult, assetResult, controlResult, assessmentResult, linkResult, assetLinkResult, treatmentResult, teamResult] = await Promise.all([s.from("isms_risks").select("*").eq("organization_id", org.id).neq("status", "archived").order("residual_score", {
    "ascending": false
  }), s.from("isms_assets").select("*").eq("organization_id", org.id).eq("status", "active").order("asset_name"), s.from("iso27001_control_catalog").select("control_id,control_title,theme,control_order").eq("active", true).order("control_order"), s.from("assessments").select("id,standard,status,workspace_type,created_at").eq("organization_id", org.id).eq("owner_id", user.id).in("standard", ["ISO/IEC 27001:2022", "ISO/IEC 27001:2022/Amd 1:2024"]).order("created_at", {
    "ascending": false
  }), s.from("isms_risk_controls").select("*").eq("organization_id", org.id), s.from("isms_risk_assets").select("risk_id,asset_id").eq("owner_id", user.id), s.from("isms_risk_treatments").select("*").eq("owner_id", user.id), s.from("organization_people").select("id,first_name,last_name,email").eq("organization_id",org.id).eq("account_status","active").order("last_name")]);
  for (const result of [riskResult, assetResult, controlResult, assessmentResult, linkResult, assetLinkResult, treatmentResult]) if (result.error) throw new Error(result.error.message);
  if(teamResult.error)throw new Error(teamResult.error.message);
  const riskIds = new Set((riskResult.data || []).map(risk => risk.id));
  const riskLinks = (linkResult.data || []).filter(link => riskIds.has(link.risk_id));
  const assessmentIds = [...new Set(riskLinks.map(link => link.assessment_id).filter(Boolean))];
  const admin = assessmentIds.length ? createAdminClient() : null;
  const [acceptanceResult, soaResult, evidenceResult] = await Promise.all([
    s.from("isms_risk_acceptances").select("id,risk_id,acceptance_authority,rationale,conditions,accepted_score,decision,decided_at,expires_at,created_at")
      .eq("owner_id", user.id).order("created_at", { ascending: false }).order("id", { ascending: false }),
    admin ? admin.from("assessment_soa_entries").select("assessment_id,control_id,implementation_status,implementation_evidence,effectiveness_evidence,action_status,action_verification_conclusion,action_required,target_date")
      .eq("owner_id", user.id).eq("organization_id", org.id).in("assessment_id", assessmentIds) : { data: [] },
    admin ? admin.from("soa_control_evidence").select("assessment_id,control_id,evidence_kind").eq("owner_id", user.id)
      .eq("organization_id", org.id).in("assessment_id", assessmentIds) : { data: [] },
  ]);
  if (acceptanceResult.error || soaResult.error || evidenceResult.error) throw new Error("The risk acceptance or SoA control records could not be loaded.");
  const linkedKeys = new Set(riskLinks.map(link => link.assessment_id + ":" + link.control_id));
  const evidenceKinds = new Set((evidenceResult.data || []).map(file => [file.assessment_id, file.control_id, file.evidence_kind].join(":")));
  const soaEntries = (soaResult.data || []).filter(entry => linkedKeys.has(entry.assessment_id + ":" + entry.control_id))
    .map(entry => ({
      ...entry,
      effectiveness_file: evidenceKinds.has([entry.assessment_id, entry.control_id, "effectiveness"].join(":")),
      implementation_file: evidenceKinds.has([entry.assessment_id, entry.control_id, "implementation"].join(":")),
    }));
  const acceptances = (acceptanceResult.data || []).filter(row => riskIds.has(row.risk_id));
  const ownerOptions=(teamResult.data||[]).map(person=>({id:person.id,name:[person.first_name,person.last_name].filter(Boolean).join(" ")||person.email,email:person.email||""}));
  if(initialRiskId && !(riskResult.data||[]).some(r=>r.id===initialRiskId))notFound();
  return <ControlledDeviceDrafts userId={user.id} organizationId={org.id} recordKey={'isms-risk:'+(initialRiskId||'register')} label="Information-security risks" baseline={{
    "methodology": methodology,
    "risks": riskResult.data || [],
    "assets": assetResult.data || [],
    "controls": controlResult.data || [],
    "assessments": assessmentResult.data || [],
    "links": linkResult.data || [],
    "assetLinks": assetLinkResult.data || [],
    "treatments": treatmentResult.data || [],
    "ownerOptions": ownerOptions
  }}><ISMSWorkspaceShell active="risk"><main className="irmPage"><style>{pageStyles}</style><ISMSRiskWorkspace initialRiskId={initialRiskId} action={saveISMSRisk} acceptanceAction={recordISMSRiskAcceptance} acceptances={acceptances} soaEntries={soaEntries} organizationName={org.name} today={siteToday("Europe/London")} methodology={methodology} risks={riskResult.data || []} assets={assetResult.data || []} controls={controlResult.data || []} assessments={assessmentResult.data || []} links={linkResult.data || []} assetLinks={assetLinkResult.data || []} treatments={treatmentResult.data || []} ownerOptions={ownerOptions} /></main></ISMSWorkspaceShell></ControlledDeviceDrafts>;
}
const pageStyles = ".irmPage{min-height:100vh;padding:16px clamp(12px,3vw,46px) 60px;background:#edf3f8;font-family:Arial,sans-serif;color:#102b46}";
