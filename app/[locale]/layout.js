const locales = ["en", "fr", "pl", "es", "it"];

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const safeLocale = locales.includes(locale) ? locale : "en";

  return {
    alternates: {
      canonical: `/${safeLocale}`,
      languages: {
        en: "/en",
        fr: "/fr",
        pl: "/pl",
        es: "/es",
        it: "/it",
        "x-default": "/en"
      }
    }
  };
}

export default function LocaleLayout({ children }) {
  return children;
}
