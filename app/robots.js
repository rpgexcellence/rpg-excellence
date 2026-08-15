export default function robots() {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/"
      }
    ],
    sitemap: "https://www.rpgexcellence.com/sitemap.xml",
    host: "https://www.rpgexcellence.com"
  };
}
