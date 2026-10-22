const item = (label, href) => ({
  label,
  href,
});
export const PORTAL_NAVIGATION = [
  {
    id: "dashboard",
    label: "Dashboard",
    href: "/portal",
    exact: true,
  },
  {
    id: "tasks",
    label: "My Tasks & Approvals",
    href: "/portal/tasks",
    matches: ["/portal/management-oversight"],
  },
  {
    id: "incidents",
    label: "Accident, Incident & Near Misses",
    href: "/portal/incidents",
    children: [
      item("Incident Dashboard", "/portal/incidents"),
      item("Report Register", "/portal/incidents?view=register"),
      item("New Report", "/portal/incidents/new"),
      item("Incident Administration", "/portal/incidents/admin"),
    ],
  },
  {
    id: "assessments",
    label: "Assessments",
    href: "/portal/history",
    matches: ["/portal/assessments", "/portal/cross-standard-matrix"],
    children: [
      item("Gap Analysis Register", "/portal/history"),
      item(
        "New ISO/IEC 17025 Assessment",
        "/portal?standard=ISO%2FIEC%2017025%3A2017#new-assessment",
      ),
      item("Gap Analysis Board", "/portal/history?view=management-board"),
      item("Cross-Standard Matrix", "/portal/cross-standard-matrix"),
      item(
        "New ISO 9001:2026 Assessment",
        "/portal?standard=ISO%209001%3A2026#new-assessment",
      ),
      item("In Progress", "/portal/history?view=in-progress"),
      item("Completed", "/portal/history?view=completed"),
      item("Archived", "/portal/history?view=archived"),
    ],
  },
  {
    id: "audits",
    label: "Internal Audits",
    href: "/portal/internal-audits",
    matches: [
      "/portal/internal-audit",
      "/portal/internal-audit-programme",
      "/portal/internal-audit-fmea-planning",
      "/portal/internal-auditor-verification",
    ],
    children: [
      item("Audit Command Centre", "/portal/internal-audits"),
      item("Internal Audit Hub", "/portal/internal-audit"),
      item("3-Year Audit Programme", "/portal/internal-audit-programme"),
      item("FMEA Risk Planning", "/portal/internal-audit-fmea-planning"),
      item("Auditor Verification", "/portal/internal-auditor-verification"),
      item("Audit Training", "/portal/internal-audit/training"),
    ],
  },
  {
    id: "findings",
    label: "Findings & Actions",
    href: "/portal/internal-audit-actions",
    children: [
      item("NC Register", "/portal/internal-audit-actions"),
      item(
        "NC Management Board",
        "/portal/internal-audit-actions?view=management",
      ),
    ],
  },
  {
    id: "capa",
    label: "CAPA-8D",
    href: "/portal/rca",
    expanded: true,
    children: [
      item("CAPA-8D Register", "/portal/rca"),
      item("Management Board", "/portal/rca?view=management-board"),
      item("Open Cases", "/portal/rca?view=open"),
      item("Awaiting Verification", "/portal/rca?view=verification"),
      item("Closed Cases", "/portal/rca?view=closed"),
      item("RCA–8D Training", "/portal/rca/training"),
    ],
  },
  {
    id: "health",
    label: "Health & Safety Hub",
    href: "/portal/health-safety",
    expanded: true,
    children: [
      item("H&S Dashboard", "/portal/health-safety"),
      item("Risk Assessments", "/portal/health-safety/risk-assessment"),
      item(
        "Create Risk Assessment",
        "/portal/health-safety/risk-assessment/new",
      ),
      item("POWRA", "/portal/health-safety/powra"),
      item("Permit to Work", "/portal/health-safety/permits"),
      item("Management of Change", "/portal/health-safety/moc"),
      item(
        "Workplace Inspections",
        "/portal/health-safety/workplace-inspections",
      ),
      item("Actions & Verification", "/portal/health-safety/actions"),
      item("Management Board", "/portal/health-safety/management-board"),
      item("Training Academy", "/portal/health-safety/training"),
      item("My Certificates", "/portal/health-safety/training/certificates"),
    ],
  },
  {
    id: "bcp",
    label: "Business Continuity",
    href: "/portal/business-continuity",
    expanded: true,
    children: [
      item("BCP Dashboard", "/portal/business-continuity"),
      item("Site Profile", "/portal/business-continuity/site-profile"),
      item("Learning Path", "/portal/business-continuity/training"),
      item(
        "Context & Interested Parties",
        "/portal/business-continuity/context",
      ),
      item("Roles & Responsibilities", "/portal/business-continuity/roles"),
      item("Hazard Scenarios", "/portal/business-continuity/hazard-scenarios"),
      item("Business Impact Analysis", "/portal/business-continuity/bia"),
      item(
        "Outsourced Processes",
        "/portal/business-continuity/outsourced-processes",
      ),
      item(
        "Strategies & Solutions",
        "/portal/business-continuity/strategies-solutions",
      ),
      item(
        "Incident Management",
        "/portal/business-continuity/incident-management",
      ),
      item("BCP Plan", "/portal/business-continuity/plans"),
      item(
        "ISO 22301 Assessment",
        "/portal?standard=ISO%2022301%3A2019#new-assessment",
      ),
    ],
  },
  {
    id: "evidence",
    label: "Evidence",
    href: "/portal/documents",
    children: [
      item("Document Library", "/portal/documents"),
      ...[
        ["ISO 9001:2026", "ISO 9001:2026"],
        ["ISO 9001 legacy", "ISO 9001:2015/Amd 1:2024"],
        ["ISO 14001", "ISO 14001:2026"],
        ["ISO 45001", "ISO 45001:2018"],
        ["ISO 22301", "ISO 22301:2019"],
        ["ISO/IEC 27001", "ISO/IEC 27001:2022"],
        ["ISO/IEC 17024", "ISO/IEC 17024:2026"],
        ["ISO/IEC 17025", "ISO/IEC 17025:2017"],
        ["RCA–CAPA", "RCA & CAPA"],
        ["Internal Audit", "Internal Audit"],
      ].map(([label, family]) =>
        item(label, "/portal/documents?family=" + encodeURIComponent(family)),
      ),
    ],
  },
  {
    id: "reports",
    label: "Reports",
    href: "/portal/reports",
  },
  {
    id: "isms",
    label: "Information Security",
    href: "/portal/information-security",
    matches: ["/portal/soa"],
    children: [
      item("ISMS Dashboard", "/portal/information-security"),
      item("Risk Management", "/portal/information-security/risk-management"),
      item("Security Incidents", "/portal/information-security/incidents"),
      item("Statement of Applicability", "/portal/soa"),
      item("Management Board", "/portal/soa/management-board"),
      item("Executive Report", "/portal/soa/management-board/executive-report"),
    ],
  },
  {
    id: "suppliers",
    label: "Supplier Assurance",
    href: "/portal/suppliers",
    children: [
      item("Supplier Register", "/portal/suppliers"),
      item("Management Board", "/portal/suppliers?view=board"),
      item("New Supplier", "/portal/suppliers?new=1"),
    ],
  },
  {
    id: "administration",
    label: "Administration",
    href: "/portal/company/business-profile",
    matches: [
      "/portal/admin",
      "/portal/company/assets",
      "/portal/company/sites",
      "/portal/company/integrations",
    ],
    children: [
      item("Business Profile", "/portal/company/business-profile"),
      item("Site Profiles, Buildings & Zones", "/portal/company/sites"),
      item("Company Asset Register", "/portal/company/assets"),
      item("Enterprise Integration", "/portal/company/integrations"),
    ],
  },
  {
    id: "people",
    label: "People, Roles & Access",
    href: "/portal/company/people",
  },
];
const TRAINING_ONLY_CHILDREN = {
  health: [
    "/portal/health-safety/training",
    "/portal/health-safety/training/certificates",
  ],
  audits: ["/portal/internal-audit/training"],
  capa: ["/portal/rca/training"],
};
const PROFESSIONAL_HEALTH_CHILDREN = new Set([
  "/portal/health-safety/powra",
  "/portal/health-safety/permits",
  "/portal/health-safety/moc",
  "/portal/health-safety/workplace-inspections",
]);
export function navigationForAccess(access) {
  if (!access) return PORTAL_NAVIGATION;
  const allowedGroups = new Set(access.groups || []);
  return PORTAL_NAVIGATION.flatMap((group) => {
    // Every authenticated company user needs their controlled assignment view.
    if (group.id !== "tasks" && !allowedGroups.has(group.id)) {
      return [];
    }
    let children = group.children;
    const trainingOnly =
      (group.id === "health" &&
        access.training?.health &&
        !access.workspaceGroups?.includes("health")) ||
      (group.id === "audits" &&
        access.training?.audit &&
        !access.workspaceGroups?.includes("audits")) ||
      (group.id === "capa" &&
        access.training?.rca &&
        !access.workspaceGroups?.includes("capa"));
    if (trainingOnly) {
      const routes = new Set(TRAINING_ONLY_CHILDREN[group.id] || []);
      children = (children || []).filter((entry) => routes.has(entry.href));
    } else if (group.id === "assessments") {
      children = (children || []).filter(
        (entry) =>
          entry.href !== "/portal/cross-standard-matrix" ||
          access.crossStandardMatrix,
      );
    } else if (group.id === "health" && !access.professionalHealth) {
      children = (children || []).filter(
        (entry) => !PROFESSIONAL_HEALTH_CHILDREN.has(entry.href),
      );
    } else if (group.id === "administration") {
      children = (children || []).filter((entry) => {
        if (
          entry.href === "/portal/company/sites" &&
          !access.companyAdministrator
        )
          return false;
        if (
          entry.href === "/portal/company/assets" &&
          !access.professionalHealth
        ) {
          return false;
        }
        if (
          entry.href === "/portal/company/integrations" &&
          (!access.companyAdministrator || !access.enterpriseIntegration)
        ) {
          return false;
        }
        return true;
      });
    }
    return [
      {
        ...group,
        children,
      },
    ];
  });
}
const under = (path, base) => path === base || path.startsWith("" + base + "/");
export function portalGroupActive(group, path) {
  if (/^\/portal\/assessments\/[^/]+\/soa(?:\/|$)/.test(path)) {
    return group.id === "isms";
  }
  return group.exact
    ? path === group.href
    : [group.href, ...(group.matches || [])].some((base) => under(path, base));
}
export function portalActiveChild(group, path, search = "") {
  if (
    group.id === "isms" &&
    /^\/portal\/assessments\/[^/]+\/soa(?:\/|$)/.test(path)
  ) {
    return "/portal/soa";
  }
  const current = new URLSearchParams(search);
  const matches = (group.children || []).filter((entry) => {
    const url = new URL(entry.href, "https://portal.invalid");
    if (!under(path, url.pathname)) {
      return false;
    }
    for (const [key, value] of url.searchParams) {
      if (current.get(key) !== value) {
        return false;
      }
    }

    // The register is the default view; query view/family links take precedence.
    if (
      !url.search &&
      (path === "/portal/history" ||
        path === "/portal/rca" ||
        path === "/portal/internal-audit-actions") &&
      current.has("view") &&
      !["register", "all"].includes(current.get("view"))
    ) {
      return false;
    }
    if (!url.search && path === "/portal/documents" && current.has("family")) {
      return false;
    }
    return true;
  });
  return (
    matches.sort((a, b) => {
      const au = new URL(a.href, "https://portal.invalid");
      const bu = new URL(b.href, "https://portal.invalid");
      return (
        bu.pathname.length - au.pathname.length ||
        Number(Boolean(bu.search)) - Number(Boolean(au.search))
      );
    })[0]?.href || null
  );
}
export function portalStandalone(path) {
  return (
    [
      "/portal/login",
      "/portal/forgot-password",
      "/portal/reset-password",
      "/portal/update-password",
      "/portal/signup",
      "/portal/register",
    ].some((base) => under(path, base)) || /\/(print|pdf)(\/|$)/.test(path)
  );
}
