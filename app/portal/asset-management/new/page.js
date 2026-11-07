import AssetWorkspace from "../AssetWorkspace";
import ControlledDeviceDrafts from "../../../../components/ControlledDeviceDrafts";
import { requireAssetAccess } from "../../../../lib/asset-management";

export const metadata = { title: "Create New Asset | RPG Excellence" };
export const dynamic = "force-dynamic";

export default async function Page({ searchParams }) {
  const access = await requireAssetAccess("contribute");
  const query = await searchParams || {};
  // An edit link continues through the existing register workflow without using
  // the new-asset draft slot or changing the controlled asset's identity.
  if (query.edit) return <AssetWorkspace mode="new" searchParams={query} />;
  return (
    <ControlledDeviceDrafts
      userId={access.user.id}
      organizationId={access.organization.id}
      recordKey="asset-management:new"
      label="Create New Asset"
      baseline={{ form: "asset-management:new", formVersion: 1, accessLevel: access.level }}
    >
      <p style={{ margin: "0 clamp(12px,2vw,30px) 12px", color: "#526e82", fontSize: 12, lineHeight: 1.5 }}>
        Open this page while connected before working offline. Restore your draft after reconnecting, review operational status and submit online. After successful asset creation, clear the device draft before recording another asset.
      </p>
      <AssetWorkspace mode="new" searchParams={query} draftEnabled />
    </ControlledDeviceDrafts>
  );
}
