import Header from "./Header";
import Footer from "./Footer";
import { copy } from "../lib/i18n";

export default function PageShell({ locale, children, hideAccountIdentity = false }) {
  const t = copy[locale];
  return (
    <>
      <Header locale={locale} nav={t.nav} hideAccountIdentity={hideAccountIdentity} />
      {children}
      <Footer locale={locale} />
    </>
  );
}
