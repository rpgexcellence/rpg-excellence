"use client";

import { useEffect, useState } from "react";
import Script from "next/script";

const GA_ID = "G-CH329M3KX6";
const CONSENT_KEY = "rpg-cookie-consent";

function analyticsAllowed() {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    const raw =
      localStorage.getItem(CONSENT_KEY);

    if (!raw) {
      return false;
    }

    // Compatibility with the old consent format.
    if (raw === "analytics") {
      return true;
    }

    if (raw === "essential") {
      return false;
    }

    const consent = JSON.parse(raw);

    return (
      consent?.essential === true &&
      consent?.analytics === true
    );
  } catch {
    return false;
  }
}

export default function AnalyticsConsent() {
  const [enabled, setEnabled] =
    useState(false);

  useEffect(() => {
    function sync() {
      setEnabled(
        analyticsAllowed()
      );
    }

    sync();

    window.addEventListener(
      "rpg-cookie-change",
      sync
    );

    return () => {
      window.removeEventListener(
        "rpg-cookie-change",
        sync
      );
    };
  }, []);

  if (!enabled) {
    return null;
  }

  return (
    <>
      <Script
        id="rpg-ga-loader"
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
        strategy="afterInteractive"
      />

      <Script
        id="rpg-ga4"
        strategy="afterInteractive"
      >
        {`
          window.dataLayer =
            window.dataLayer || [];

          function gtag(){
            dataLayer.push(arguments);
          }

          gtag('js', new Date());

          gtag(
            'config',
            '${GA_ID}',
            {
              anonymize_ip: true
            }
          );
        `}
      </Script>
    </>
  );
}
