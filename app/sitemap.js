export default function sitemap() {
  const base = "https://www.rpgexcellence.com";
  const locales = ["en", "fr", "pl", "es", "it"];
  const pages = [
    "",
    "/about",
    "/contact",
    "/pricing",
    "/ai-tools",
    "/hs-hub",
    "/hs-hub/training",
    "/internal-audit-training",
    "/rca-8d-training",
    "/iso-9001",
    "/iso-14001",
    "/iso-45001",
    "/iso-22301",
    "/iso-27001",
    "/terms",
    "/privacy",
    "/cookies",
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
          : page === "/hs-hub" || page.startsWith("/iso-")
            ? 0.9
            : page.includes("training")
              ? 0.85
              : 0.7,
    }))
  );
}

