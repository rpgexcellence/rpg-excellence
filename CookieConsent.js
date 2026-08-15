"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function CookieConsent() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem("rpg-cookie-consent")) setOpen(true);
  }, []);

  function save(value) {
    localStorage.setItem("rpg-cookie-consent", value);
    setOpen(false);
    window.dispatchEvent(new Event("rpg-cookie-change"));
  }

  function reset() {
    localStorage.removeItem("rpg-cookie-consent");
    setOpen(true);
    window.dispatchEvent(new Event("rpg-cookie-change"));
  }

  return (
    <>
      {open && (
        <div className="cookieBanner" role="dialog" aria-label="Cookie preferences">
          <div>
            <strong>Your privacy choices</strong>
            <p>
              We use essential technologies to operate this website. With your
              permission, we also use Google Analytics to understand how the site
              is used and improve our services.
            </p>
            <Link href="/en/cookies">Cookie policy</Link>
          </div>
          <div className="cookieActions">
            <button className="button buttonGhost" onClick={() => save("essential")}>
              Essential only
            </button>
            <button className="button" onClick={() => save("analytics")}>
              Accept analytics
            </button>
          </div>
        </div>
      )}
      {!open && (
        <button className="cookieSettings" onClick={reset}>
          Cookie settings
        </button>
      )}
    </>
  );
}
