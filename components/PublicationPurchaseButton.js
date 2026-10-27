"use client";

import { useState } from "react";

import { getPublication } from "../lib/publications.mjs";

// Legacy ISO 14001 product page does not pass a publication prop.
// Defaulting to its existing product code preserves that checkout.
export default function PublicationPurchaseButton({ publication = "ISO14001-2026-GUIDE" }) {
  const [loading, setLoading] = useState(false);

  async function buy() {
    if (loading) return;
    const product = getPublication(publication);
    if (!product) {
      window.alert("This publication is not configured for purchase.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          purchaseType: "digital_publication",
          publication,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (res.status === 401) {
        window.location.assign(
          `/portal/login?next=${encodeURIComponent(window.location.pathname)}&purchase=digital_publication`
        );
        return;
      }
      if (!res.ok || !data.url) {
        throw new Error(data.error || "Unable to start checkout.");
      }
      window.location.assign(data.url);
    } catch (error) {
      window.alert(error.message || "Unable to start checkout.");
      setLoading(false);
    }
  }

  return (
    <button className="button" type="button" disabled={loading} onClick={buy}>
      {loading ? "Opening secure checkout…" : `Buy ${publication === "ISO9001-2026-INSIGHTS" ? "collection" : "PDF"} — £${((getPublication(publication)?.unitAmount ?? 0) / 100).toFixed(2)}`}
    </button>
  );
}
