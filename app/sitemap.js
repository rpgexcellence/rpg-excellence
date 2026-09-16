export default function sitemap() {
  const base = "https://www.rpgexcellence.com";
  const locales = ["en"];
  const pages = [
    "",
    "/about",
    "/contact",
    "/pricing",
    "/ai-tools",
    "/hs-hub",
    "/hs-hub/training",
    "/internal-audit",
    "/internal-audit-training",
    "/capa-8d",
    "/rca-8d-training",
    "/iso-9001",
    "/iso-14001",
    "/iso-45001",
    "/iso-22301",
    "/business-continuity",
    "/information-security",
    "/as9100-hub",
    "/iso-27001",
    "/iso-27001-readiness-software",
    "/security-and-trust",
    "/terms",
    "/privacy",
    "/cookies",
    "/insights",
    "/insights/a-word-from-rpg",
    "/insights/iso-9001-readiness",
    "/insights/iso-14001-readiness",
    "/insights/iso-45001-readiness",
    "/insights/iso-17024-readiness",
    "/insights/capa-8d-release",
    "/insights/structured-rca-profiling",
    "/insights/internal-audit-module",
    "/insights/health-safety-hub",
    "/insights/controlled-risk-assessment",
    "/insights/interactive-risk-heat-map",
    "/insights/risk-assessment-training",
    "/insights/iso-27001-gap-analysis-soa",
    "/insights/management-of-change-assurance",
    "/insights/permit-to-work-control",
    "/insights/powra-point-of-work",
    "/insights/iso-22301-business-continuity-readiness",
    "/insights/business-continuity-implementation-module-1",
  ];

  const now = new Date();

  return locales.flatMap((locale) =>
    pages.map((page) => ({
      url: `${base}/${locale}${page}`,
      lastModified: now,
      changeFrequency: page === "" ? "weekly" : "monthly",
      priority:
        page === ""
          ? 1
          : ["/hs-hub", "/internal-audit", "/capa-8d"].includes(page) || page.startsWith("/iso-")
            ? 0.9
            : page.includes("training")
              ? 0.85
              : 0.7,
    }))
  );
}
