"use client";

import { usePathname, useRouter } from "next/navigation";
import { locales, languageLabels } from "../lib/i18n";

export default function LanguageSwitcher({ current }) {
  const pathname = usePathname();
  const router = useRouter();

  function setLocale(locale) {
    const parts = pathname.split("/");
    parts[1] = locale;
    router.push(parts.join("/") || `/${locale}`);
  }

  return (
    <select
      className="language"
      value={current}
      onChange={(e) => setLocale(e.target.value)}
      aria-label="Select language"
    >
      {locales.map((locale) => (
        <option value={locale} key={locale}>
          {languageLabels[locale]}
        </option>
      ))}
    </select>
  );
}
