import { redirect } from "next/navigation";
import { createClient } from "../../../lib/supabase/server";
import ControlledDeviceDrafts from "../../../components/ControlledDeviceDrafts";
import ManualNonconformityForm from "../../../components/ManualNonconformityForm";
import NonconformityWorkspace from "../../../components/NonconformityWorkspace";
import { getNonconformityWorkspaceSnapshot } from "./actions";

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
  const scope = { userId: snapshot.currentUserId, organizationId: snapshot.organization.id };
  const supplierId = uuid(query?.supplier_id) || uuid(query?.supplier) || "";
  const draftKey = "nc:manual:new" + (supplierId ? ":supplier:" + supplierId : "");
  const manualForm = snapshot.canCreate ? (
    <ControlledDeviceDrafts
      userId={scope.userId}
      organizationId={scope.organizationId}
      recordKey={draftKey}
      label="Nonconformity report"
      baseline={{
        canCreate: snapshot.canCreate,
        supplierId,
        suppliers: snapshot.suppliers,
        contacts: snapshot.contacts,
        people: snapshot.people,
      }}
    >
      <ManualNonconformityForm
        scope={scope}
        suppliers={snapshot.suppliers}
        contacts={snapshot.contacts}
        people={snapshot.people}
        initialSupplierId={supplierId}
      />
    </ControlledDeviceDrafts>
  ) : null;
  return <NonconformityWorkspace
    snapshot={snapshot}
    initialView={query?.view === "management" ? "management" : "register"}
    initialRaise={query?.raise === "1"}
    initialRecordId={uuid(query?.record)}
    manualForm={manualForm}
  />;
}
