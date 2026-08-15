import "./globals.css";

export const metadata = {
  metadataBase: new URL("https://www.rpgexcellence.com"),
  title: {
    default: "RPG Excellence | AI-Powered Business Assurance",
    template: "%s | RPG Excellence"
  },
  description:
    "Global ISO consultancy and AI-powered business assurance for quality, health & safety, environment, business continuity and information security.",
  keywords: [
    "ISO consultancy",
    "ISO 9001",
    "ISO 14001",
    "ISO 45001",
    "ISO 22301",
    "ISO 27001",
    "business assurance",
    "risk assessment",
    "AI compliance",
    "management systems",
    "RPG Excellence"
  ],
  authors: [{ name: "RPG Excellence" }],
  creator: "RPG Excellence",
  publisher: "RPG Excellence",
  openGraph: {
    title: "RPG Excellence | AI-Powered Business Assurance",
    description:
      "Build smarter. Safer. Stronger. Global ISO consultancy and intelligent business assurance tools.",
    url: "https://www.rpgexcellence.com",
    siteName: "RPG Excellence",
    locale: "en_GB",
    type: "website"
  },
  twitter: {
    card: "summary_large_image",
    title: "RPG Excellence | AI-Powered Business Assurance",
    description:
      "Build smarter. Safer. Stronger. Global ISO consultancy and intelligent business assurance tools."
  },
  robots: {
    index: true,
    follow: true
  }
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
