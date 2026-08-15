"use client";

import { useEffect, useState } from "react";
import Script from "next/script";

const GA_ID = "G-CH329M3KX6";

export default function AnalyticsConsent() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const sync = () => {
      setEnabled(localStorage.getItem("rpg-cookie-consent") === "analytics");
    };
    sync();
    window.addEventListener("rpg-cookie-change", sync);
    return () => window.removeEventListener("rpg-cookie-change", sync);
  }, []);

  if (!enabled) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
        strategy="afterInteractive"
      />
      <Script id="rpg-ga4" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_ID}', { anonymize_ip: true });
        `}
      </Script>
    </>
  );
}
