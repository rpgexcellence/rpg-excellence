"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function PortalQuickNav() {
  const pathname = usePathname();

  const assessment = pathname.match(
    /^\/portal\/assessments\/([^/]+)/,
  );
  const soa = assessment && pathname.includes("/soa");
  const soaPortfolio =
    pathname === "/portal/soa" ||
    pathname.startsWith("/portal/soa/");
  const audit = pathname.match(
    /^\/portal\/internal-audits\/([^/]+)/,
  );
  const supplier = pathname.match(
    /^\/portal\/suppliers\/([^/]+)/,
  );

  if (
    pathname === "/portal" ||
    pathname.startsWith("/portal/business-continuity")
  ) {
    return null;
  }

  const hasContextLinks = Boolean(
    assessment || soaPortfolio || audit || supplier,
  );

  return (
    <nav
      className={`rpgQuickNav ${
        hasContextLinks ? "contextual" : "homeOnly"
      }`}
      aria-label="Portal quick navigation"
    >
      {assessment && !soa && (
        <>
          <Link href={`/portal/assessments/${assessment[1]}`}>
            Assessment
          </Link>
          <Link
            href={`/portal/assessments/${assessment[1]}/executive-report`}
          >
            Executive Report
          </Link>
          <Link
            href={`/portal/assessments/${assessment[1]}/executive-report/pdf`}
            target="_blank"
          >
            PDF
          </Link>
        </>
      )}

      {soa && (
        <>
          <Link href={`/portal/assessments/${assessment[1]}/soa`}>
            Statement of Applicability
          </Link>
          <Link
            href={`/portal/assessments/${assessment[1]}/soa/summary`}
          >
            Executive Summary
          </Link>
          <Link
            href={`/portal/assessments/${assessment[1]}/soa/report`}
            target="_blank"
          >
            PDF
          </Link>
          <Link href="/portal/soa">SoA Register</Link>
          <Link href="/portal/soa/management-board">
            Management Board
          </Link>
        </>
      )}

      {soaPortfolio && (
        <>
          <Link href="/portal/soa">SoA Register</Link>
          <Link href="/portal/soa/management-board">
            Management Board
          </Link>
          <Link href="/portal/soa/management-board/executive-report">
            Executive Report
          </Link>
        </>
      )}

      {audit && (
        <>
          <Link href={`/portal/internal-audits/${audit[1]}`}>
            Audit
          </Link>
          <Link
            href={`/portal/internal-audits/${audit[1]}?gate=report`}
          >
            Executive Report
          </Link>
          <Link
            href={`/portal/internal-audits/${audit[1]}/report`}
            target="_blank"
          >
            PDF
          </Link>
        </>
      )}

      {supplier && (
        <>
          <Link href={`/portal/suppliers?id=${supplier[1]}`}>
            Supplier Record
          </Link>
          <Link
            href={`/portal/suppliers/${supplier[1]}/code-of-conduct`}
          >
            Code of Conduct
          </Link>
        </>
      )}

      <Link href="/portal" className="home">
        <strong>RPG Excellence</strong>
        <small>Product Dashboard</small>
      </Link>
    </nav>
  );
}
