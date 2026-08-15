"use client";

import { useEffect, useState } from "react";
import Script from "next/script";

const CLARITY_ID = "y2wme23y8v";

export default function ClarityConsent() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const syncConsent = () => {
      setEnabled(
        localStorage.getItem("rpg-cookie-consent") === "analytics"
      );
    };

    syncConsent();

    window.addEventListener("rpg-cookie-change", syncConsent);

    return () => {
      window.removeEventListener("rpg-cookie-change", syncConsent);
    };
  }, []);

  if (!enabled) return null;

  return (
    <Script id="microsoft-clarity" strategy="afterInteractive">
      {`
        (function(c,l,a,r,i,t,y){
          c[a]=c[a]||function(){
            (c[a].q=c[a].q||[]).push(arguments)
          };
          t=l.createElement(r);
          t.async=1;
          t.src="https://www.clarity.ms/tag/"+i;
          y=l.getElementsByTagName(r)[0];
          y.parentNode.insertBefore(t,y);
        })(window, document, "clarity", "script", "${CLARITY_ID}");
      `}
    </Script>
  );
}
