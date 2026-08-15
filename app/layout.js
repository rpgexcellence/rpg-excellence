import "./globals.css";

export const metadata = {
  title: {
    default: "RPG Excellence | AI-Powered Business Assurance",
    template: "%s | RPG Excellence"
  },
  description:
    "Global ISO consultancy and AI-powered business assurance for quality, safety, environment, resilience and information security."
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
