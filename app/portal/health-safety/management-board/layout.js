import Link from "next/link";

import WorkplaceInspectionBoardPanel from "../../../../components/WorkplaceInspectionBoardPanel";
import { requireOrganizationAccess } from "../../../../lib/organization-access";
import { getUserSubscription, hasPlanAccess } from "../../../../lib/subscription";

export const dynamic = "force-dynamic";

export default async function HealthSafetyManagementBoardLayout({ children }) {
  const access = await requireOrganizationAccess(
    "risk_management",
    "view",
    "/portal/health-safety/management-board",
  );
  const subscription = await getUserSubscription(access.user.id);
  const workplaceInspectionAccess = hasPlanAccess(subscription, "professional");

  return <>
    {children}
    <div style={{ background: "#eaf2f7", padding: "0 20px 80px" }}>
      <div style={{ maxWidth: 1320, margin: "0 auto" }}>
        {workplaceInspectionAccess ? <WorkplaceInspectionBoardPanel organizationId={access.organization.id} /> : <section style={{ padding: 22, border: "1px solid #d5e2ea", borderRadius: 15, background: "#fff", color: "#071d3a" }}>
          <small style={{ color: "#087f6c", fontWeight: 900, letterSpacing: ".08em" }}>PROFESSIONAL WORKSPACE</small>
          <h2 style={{ margin: "7px 0" }}>Workplace Inspection planning</h2>
          <p style={{ margin: "0 0 14px", color: "#657b91" }}>Risk-based inspection programmes, dynamic checklist packs, offline fieldwork, mobile evidence capture and management-calendar oversight are available on the Professional plan.</p>
          <Link href="/en/pricing#subscriptions" style={{ display: "inline-block", padding: "10px 14px", borderRadius: 9, background: "#2f61e8", color: "#fff", textDecoration: "none", fontWeight: 900 }}>View access options</Link>
        </section>}
      </div>
    </div>
  </>;
}
