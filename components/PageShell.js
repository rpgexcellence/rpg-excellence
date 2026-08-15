import Header from "./Header";
import Footer from "./Footer";
import { copy } from "../lib/i18n";

export default function PageShell({ locale, children }) {
  const t = copy[locale];
  return (
    <>
      <Header locale={locale} nav={t.nav} />
      {children}
      <Footer locale={locale} />
    </>
  );
}
