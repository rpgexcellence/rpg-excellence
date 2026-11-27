import { notFound, redirect } from "next/navigation";
import { getOrganizationAccess, requireOrganizationAccess } from "../../../lib/organization-access";
import { requirePlanAccess } from "../../../lib/plan-access";
import { ASSET_UUID, recordAssetAccess, recordPath, requireAssetRecord } from "../../../lib/asset-record";
import WorkplaceInspectionsPage from "../health-safety/workplace-inspections/page";
import { createClient } from "../../../lib/supabase/server";
import { buildNonconformityRows } from "../../../lib/nonconformity-reporting.mjs";
import ControlledDeviceDrafts from "../../../components/ControlledDeviceDrafts";
import ManualNonconformityForm from "../../../components/ManualNonconformityForm";
import NonconformityWorkspace from "../../../components/NonconformityWorkspace";
import { getNonconformityWorkspaceSnapshot, getNonconformityAuditQuestionSource } from "./actions";

export const dynamic = "force-dynamic";
const text = value => typeof value === "string" ? value : "";
const uuid = value => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(text(value)) ? value : null;

export default async function NonconformityRegister({ searchParams, pageMode = null }) {
  const query = await searchParams;
  if (!pageMode && (query?.record || query?.raise === "1" || query?.audit_id !== undefined || query?.question_id !== undefined)) {
    const target = query?.record ? `/portal/internal-audit-actions/${encodeURIComponent(query.record)}` : "/portal/internal-audit-actions/new";
    const params = new URLSearchParams(Object.entries(query || {}).filter(([key,value]) => !["record","raise"].includes(key) && typeof value === "string"));
    redirect(target + (params.size ? "?" + params.toString() : ""));
  }
  if (!pageMode && query?.source === "workplace_inspection") {
    const access = await requireOrganizationAccess("internal_audit", "view", "/portal/internal-audit-actions?source=workplace_inspection");
    await requirePlanAccess(access.user, "professional", "Internal Audit Findings and Actions");
    return <WorkplaceInspectionsPage searchParams={query} central/>;
  }
  const client = await createClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) redirect("/portal/login?next=/portal/internal-audit-actions");
  // Existing module, company, role and subscription gates are checked here.
  // Failed reads never produce a misleading empty register or dashboard.
  const snapshot = await getNonconformityWorkspaceSnapshot(!pageMode);
  if (snapshot.currentUserId !== user.id) throw new Error("Your signed-in account changed. Refresh this page before opening a finding draft.");
  const inspectionAccess = !pageMode ? await getOrganizationAccess("risk_management", "view") : null;
  const showInspectionSource = inspectionAccess?.allowed && inspectionAccess.organization?.id === snapshot.organization.id &&
    inspectionAccess.user?.id === snapshot.currentUserId;
  const scope = { userId: snapshot.currentUserId, organizationId: snapshot.organization.id };
  const sourceRequested = query?.audit_id !== undefined || query?.question_id !== undefined;
  const auditId = uuid(query?.audit_id), questionId = uuid(query?.question_id);
  const additionalDraft = uuid(query?.new_draft);
  let auditSource = null, auditSourceError = "";
  if (sourceRequested && snapshot.canCreate) {
    if (!auditId || !questionId || (query?.new_draft !== undefined && !additionalDraft)) {
      auditSourceError = "The audit-question link is incomplete or invalid. Return to Fieldwork and use Raise finding again.";
    } else {
      // These parameters identify a source, not a trusted prefilled report.
      // Re-read the authorised company, open audit and approved question scope.
      const result = await getNonconformityAuditQuestionSource({
        audit_id: auditId,
        question_id: questionId,
        finding_type: ["major_nc", "minor_nc", "observation", "ofi"].includes(query?.finding_type) ? query.finding_type : "minor_nc",
      });
      if (!result?.ok) auditSourceError = result?.error?.message || "The source audit question could not be checked. Reopen it while connected.";
      else if (result.source?.audit?.id !== auditId.toLowerCase() || result.source?.question?.id !== questionId.toLowerCase()) {
        auditSourceError = "The verified source does not match this audit-question link. Return to the originating audit.";
      } else auditSource = result.source;
    }
  }
  // Preserve the established manual/supplier draft keys. Audit-origin drafts
  // additionally distinguish the question and an explicitly separate finding.
  const assetRequested = pageMode === "new" && query?.asset !== undefined;
  let assetSource = null;
  if (assetRequested && snapshot.canCreate) {
    if (!ASSET_UUID.test(text(query.asset)) || sourceRequested || query.supplier_id || query.supplier) notFound();
    const context = await requireAssetRecord(query.asset);
    if (context.access.organization.id !== scope.organizationId || context.access.user.id !== scope.userId) notFound();
    await recordAssetAccess(context, "record_view");
    assetSource = {
      id: context.asset.id,
      reference: context.asset.asset_reference,
      name: context.asset.asset_name,
      href: recordPath(context.asset.id) + "?tab=workflow#asset-nc",
    };
  }
  const supplierId = sourceRequested || assetRequested ? "" : uuid(query?.supplier_id) || uuid(query?.supplier) || "";
  const draftKey = auditSource
    ? `nc:audit:${auditSource.audit.id}:${auditSource.question.id}${additionalDraft ? ":additional:" + additionalDraft.toLowerCase() : ""}`
    : "nc:manual:new" + (assetSource ? ":asset:" + assetSource.id : supplierId ? ":supplier:" + supplierId : "");
  const manualForm = snapshot.canCreate ? auditSourceError ? (
    <ManualNonconformityForm scope={scope} auditSourceError={auditSourceError} />
  ) : (
    <ControlledDeviceDrafts
      userId={scope.userId}
      organizationId={scope.organizationId}
      recordKey={draftKey}
      label="Finding report"
      baseline={{
        canCreate: snapshot.canCreate,
        supplierId,
        suppliers: snapshot.suppliers,
        contacts: snapshot.contacts,
        people: snapshot.people,
        ...(auditSource ? { auditSource, additionalDraft } : {}),
        ...(assetSource ? { assetSource } : {}),
      }}
    >
      <ManualNonconformityForm
        scope={scope}
        suppliers={snapshot.suppliers}
        contacts={snapshot.contacts}
        people={snapshot.people}
        initialSupplierId={supplierId}
        auditSource={auditSource}
        assetSource={assetSource}
        draftInstanceKey={assetSource?.id || additionalDraft || ""}
      />
    </ControlledDeviceDrafts>
  ) : null;
  const initialRaise = query?.raise === "1" || sourceRequested;
  const initialRecordId = uuid(query?.record);
  if (pageMode === "record" && (!initialRecordId || !buildNonconformityRows(snapshot).some(row=>row.id===initialRecordId))) notFound();
  return <NonconformityWorkspace
    key={`${scope.userId}:${scope.organizationId}:${draftKey}:${initialRecordId || ""}:${initialRaise ? "raise" : "browse"}`}
    snapshot={snapshot}
    showInspectionSource={showInspectionSource}
    pageMode={pageMode}
    initialRecordTab={query?.tab === "follow_up" ? "follow_up" : "report"}
    initialView={query?.view === "management" ? "management" : "register"}
    initialRaise={initialRaise}
    initialRecordId={initialRecordId}
    manualForm={manualForm}
  />;
}

