export default function sitemap() {
  const base = "https://www.rpgexcellence.com";
  const locales = ["en", "fr", "pl", "es", "it"];
  const pages = [
    "",
    "/about",
    "/contact",
    "/pricing",
    "/ai-tools",
    "/iso-9001",
    "/iso-14001",
    "/iso-45001",
    "/iso-22301",
    "/iso-27001",
    "/terms",
    "/privacy",
    "/cookies"
  ];

  const now = new Date();

  return locales.flatMap((locale) =>
    pages.map((page) => ({
      url: `${base}/${locale}${page}`,
      lastModified: now,
      changeFrequency: page === "" ? "weekly" : "monthly",
      priority: page === "" ? 1 : page.startsWith("/iso-") ? 0.9 : 0.7
    }))
  );
}
