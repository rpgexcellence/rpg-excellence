export const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "ProfessionalService",
  "@id": "https://www.rpgexcellence.com/#organization",
  name: "RPG Excellence",
  url: "https://www.rpgexcellence.com",
  description:
    "AI-powered ISO consultancy and business assurance services for organisations worldwide.",
  email: "info@rpgexcellence.com",
  address: {
    "@type": "PostalAddress",
    addressCountry: "GB"
  },
  areaServed: "Worldwide",
  knowsAbout: [
    "ISO 9001",
    "ISO 14001",
    "ISO 45001",
    "ISO 22301",
    "ISO 27001",
    "Business Assurance",
    "Risk Management",
    "Quality Management",
    "Health and Safety",
    "Environmental Management",
    "Information Security"
  ]
};

export const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": "https://www.rpgexcellence.com/#website",
  url: "https://www.rpgexcellence.com",
  name: "RPG Excellence",
  publisher: {
    "@id": "https://www.rpgexcellence.com/#organization"
  }
};
