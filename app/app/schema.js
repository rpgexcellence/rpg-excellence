export const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "ProfessionalService",
  "@id": "https://www.rpgexcellence.com/#organization",
  name: "RPG Excellence",
  alternateName: "RPG Excellence Ltd",
  url: "https://www.rpgexcellence.com",
  logo: "https://www.rpgexcellence.com/logo.png",
  image: "https://www.rpgexcellence.com/og-image.jpg",
  description:
    "AI-powered ISO consultancy helping organisations implement ISO 9001, ISO 14001, ISO 45001, ISO 27001 and business assurance systems.",
  email: "info@rpgexcellence.com",
  telephone: "+44",
  address: {
    "@type": "PostalAddress",
    addressCountry: "GB"
  },
  areaServed: "Worldwide",
  knowsAbout: [
    "ISO 9001",
    "ISO 14001",
    "ISO 45001",
    "ISO 27001",
    "ISO Consultancy",
    "Artificial Intelligence",
    "Business Assurance",
    "Compliance",
    "Quality Management",
    "Health and Safety",
    "Environmental Management",
    "Risk Management"
  ],
  sameAs: [
    "https://www.linkedin.com/company/rpg-excellence"
  ]
};

export const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  url: "https://www.rpgexcellence.com",
  name: "RPG Excellence",
  potentialAction: {
    "@type": "SearchAction",
    target:
      "https://www.rpgexcellence.com/search?q={search_term_string}",
    "query-input": "required name=search_term_string"
  }
};
