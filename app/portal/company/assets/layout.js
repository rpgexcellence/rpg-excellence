import { requireAssetAccess } from "../../../../lib/asset-management";
export default async function LegacyAssetsLayout({ children }) {
 await requireAssetAccess();
 return children;
}
