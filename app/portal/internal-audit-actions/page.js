import { redirect } from "next/navigation";
import { createClient } from "../../../lib/supabase/server";
import ControlledDeviceDrafts from "../../../components/ControlledDeviceDrafts";
import ManualNonconformityForm from "../../../components/ManualNonconformityForm";
import NonconformityWorkspace from "../../../components/NonconformityWorkspace";
import { getNonconformityWorkspaceSnapshot, getNonconformityAuditQuestionSource } from "./actions";

export const dynamic = "force-dynamic";
const text = value => typeof value === "string" ? value : "";
const uuid = value => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(text(value)) ? value : null;

export default async function NonconformityRegister({ searchParams }) {
  const query = await searchParams;
  const client = await createClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) redirect("/portal/login?next=/portal/internal-audit-actions");
  // Existing module, company, role and subscription gates are checked here.
  // Failed reads never produce a misleading empty register or dashboard.
  const snapshot = await getNonconformityWorkspaceSnapshot();
  if (snapshot.currentUserId !== user.id) throw new Error("Your signed-in account changed. Refresh this page before opening a finding draft.");
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
  const supplierId = sourceRequested ? "" : uuid(query?.supplier_id) || uuid(query?.supplier) || "";
  const draftKey = auditSource
    ? `nc:audit:${auditSource.audit.id}:${auditSource.question.id}${additionalDraft ? ":additional:" + additionalDraft.toLowerCase() : ""}`
    : "nc:manual:new" + (supplierId ? ":supplier:" + supplierId : "");
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
      }}
    >
      <ManualNonconformityForm
        scope={scope}
        suppliers={snapshot.suppliers}
        contacts={snapshot.contacts}
        people={snapshot.people}
        initialSupplierId={supplierId}
        auditSource={auditSource}
        draftInstanceKey={additionalDraft || ""}
      />
    </ControlledDeviceDrafts>
  ) : null;
  const initialRaise = query?.raise === "1" || sourceRequested;
  const initialRecordId = uuid(query?.record);
  return <NonconformityWorkspace
    key={`${scope.userId}:${scope.organizationId}:${draftKey}:${initialRecordId || ""}:${initialRaise ? "raise" : "browse"}`}
    snapshot={snapshot}
    initialView={query?.view === "management" ? "management" : "register"}
    initialRaise={initialRaise}
    initialRecordId={initialRecordId}
    manualForm={manualForm}
  />;
}
