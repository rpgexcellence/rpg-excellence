"use client";

import { useState } from "react";

export default function StandaloneSoaButton({ className = "button", children = "Purchase standalone SoA — £129" }) {
  const [loading, setLoading] = useState(false);

  async function purchase() {
    if (loading) return;

    try {
      setLoading(true);
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ purchaseType: "standalone_soa" }),
      });
      const data = await response.json().catch(() => null);

      if (response.status === 401) {
        const login = new URL("/portal/login", window.location.origin);
        login.searchParams.set("next", `${window.location.pathname}${window.location.search}`);
        login.searchParams.set("purchase", "standalone_soa");
        window.location.assign(login.toString());
        return;
      }

      if (!response.ok || !data?.url) {
        throw new Error(data?.error || "Unable to start checkout.");
      }

      window.location.assign(data.url);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Unable to start checkout.");
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      className={className}
      onClick={purchase}
      disabled={loading}
      aria-busy={loading}
      style={{ border: 0, cursor: loading ? "wait" : "pointer" }}
    >
      {loading ? "Opening secure checkout…" : children}
    </button>
  );
}
