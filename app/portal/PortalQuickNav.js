"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function PortalQuickNav() {
  const pathname = usePathname();
  const assessment = pathname.match(/^\/portal\/assessments\/([^/]+)/);
  const audit = pathname.match(/^\/portal\/internal-audits\/([^/]+)/);
  if (pathname === "/portal") return null;

  return <nav className="rpgQuickNav" aria-label="Portal quick navigation">
    {assessment && <>
      <Link href={`/portal/assessments/${assessment[1]}`}>Assessment</Link>
      <Link href={`/portal/assessments/${assessment[1]}/executive-report`}>Executive Report</Link>
      <Link href={`/portal/assessments/${assessment[1]}/executive-report/pdf`} target="_blank">PDF</Link>
    </>}
    {audit && <>
      <Link href={`/portal/internal-audits/${audit[1]}`}>Audit</Link>
      <Link href={`/portal/internal-audits/${audit[1]}?gate=report`}>Executive Report</Link>
      <Link href={`/portal/internal-audits/${audit[1]}/report`} target="_blank">PDF</Link>
    </>}
    <Link href="/portal" className="home"><strong>RPG Excellence</strong><small>Product Dashboard</small></Link>
  </nav>;
}

