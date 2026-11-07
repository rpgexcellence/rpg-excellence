import Link from "next/link";
import { getOrganizationAccess } from "../../../lib/organization-access";
import { requireAssetAccess } from "../../../lib/asset-management";
import styles from "./asset-management.module.css";
export const dynamic = "force-dynamic";
export default async function AssetLayout({ children }) {
 // Each child page authenticates itself. Let its scan URL survive sign-in.
 const context = await getOrganizationAccess("asset_management", "view");
 if (!context.user) return children;
 const { canWrite, organization } = await requireAssetAccess();
 return <div className={styles.workspace}><div className={styles.moduleHeader}><div><span>ASSET MANAGEMENT · CONTROLLED LIFECYCLE</span><strong>{organization.name}</strong></div><nav aria-label="Asset Management"><Link href="/portal/asset-management">Dashboard</Link>{canWrite && <Link href="/portal/asset-management/new">Create New Asset</Link>}<Link href="/portal/asset-management/register">Asset Register</Link><Link href="/portal/asset-management/maintenance">Maintenance &amp; PPM</Link></nav></div>{children}</div>;
}
