import { createAdminClient } from "../../../../lib/supabase/admin";
import { controlState } from "../../../../lib/isms-risk-assurance.mjs";
import { UUID } from "../../../../lib/zone-policy.mjs";

export async function loadRiskRecord(supabase, userId, organizationId, id) {
  if (typeof id !== "string" || !UUID.test(id)) return null;
  const riskResult = await supabase.from("isms_risks").select("*")
    .eq("owner_id", userId).eq("organization_id", organizationId).eq("id", id).neq("status", "archived").maybeSingle();
  if (riskResult.error) throw new Error("The risk assessment could not be loaded.");
  const risk = riskResult.data;
  if (!risk) return null;

  const [methodResult, linksResult, assetLinksResult, treatmentsResult, decisionsResult] = await Promise.all([
    supabase.from("isms_risk_methodologies").select("name,version,appetite_score,likelihood_criteria,impact_criteria")
      .eq("organization_id", organizationId).eq("status", "approved").order("approved_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("isms_risk_controls").select("*").eq("owner_id", userId).eq("organization_id", organizationId).eq("risk_id", id).order("control_id"),
    supabase.from("isms_risk_assets").select("asset_id").eq("owner_id", userId).eq("risk_id", id),
    supabase.from("isms_risk_treatments").select("*").eq("owner_id", userId).eq("risk_id", id).order("target_date").order("id"),
    supabase.from("isms_risk_acceptances").select("*").eq("owner_id", userId).eq("risk_id", id)
      .order("created_at", { ascending: false }).order("id", { ascending: false }),
  ]);
  if ([methodResult, linksResult, assetLinksResult, treatmentsResult, decisionsResult].some(result => result.error)) {
    throw new Error("The linked risk assessment records could not be loaded.");
  }
  const links = linksResult.data || [];
  const assessments = [...new Set(links.map(link => link.assessment_id).filter(Boolean))];
  const assetIds = (assetLinksResult.data || []).map(link => link.asset_id);
  const admin = assessments.length ? createAdminClient() : null;
  const [catalog, assets, entries, evidence] = await Promise.all([
    links.length ? supabase.from("iso27001_control_catalog").select("control_id,control_title")
      .in("control_id", [...new Set(links.map(link => link.control_id))]) : { data: [] },
    assetIds.length ? supabase.from("isms_assets").select("id,asset_reference,asset_name,classification,status")
      .eq("organization_id", organizationId).eq("owner_id", userId).in("id", assetIds) : { data: [] },
    admin ? admin.from("assessment_soa_entries").select("assessment_id,control_id,implementation_status,implementation_evidence,effectiveness_evidence,action_status,action_required,action_verification_conclusion,target_date")
      .eq("owner_id", userId).eq("organization_id", organizationId).in("assessment_id", assessments) : { data: [] },
    admin ? admin.from("soa_control_evidence").select("assessment_id,control_id,evidence_kind")
      .eq("owner_id", userId).eq("organization_id", organizationId).in("assessment_id", assessments) : { data: [] },
  ]);
  if ([catalog, assets, entries, evidence].some(result => result.error)) {
    throw new Error("The linked controls, assets or evidence could not be loaded.");
  }
  const names = new Map((catalog.data || []).map(item => [item.control_id, item.control_title]));
  const entryMap = new Map((entries.data || []).map(item => [item.assessment_id + ":" + item.control_id, item]));
  const kinds = new Set((evidence.data || []).map(item => [item.assessment_id, item.control_id, item.evidence_kind].join(":")));
  const controls = links.map(link => {
    const key = link.assessment_id + ":" + link.control_id;
    const saved = entryMap.get(key);
    const entry = saved && {
      ...saved,
      implementation_file: kinds.has(key + ":implementation"),
      effectiveness_file: kinds.has(key + ":effectiveness"),
    };
    return { ...link, name: names.get(link.control_id), entry, ...controlState(link, entry) };
  });

  return { risk, methodology: methodResult.data, controls, assets: assets.data || [],
    treatments: treatmentsResult.data || [], decisions: decisionsResult.data || [] };
}
