"use client";
import { useState } from "react";
export default function QualityPerformancePurchaseButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  async function buy() {
    if (loading) return;
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/publications/quality-performance/checkout", { method: "POST" });
      if (response.status === 401) {
        window.location.assign(`/portal/login?next=${encodeURIComponent(window.location.pathname)}`);
        return;
      }
      const data = await response.json();
      if (!response.ok || !data.url) throw new Error(data.error || "Unable to start checkout. Please try again.");
      window.location.assign(data.url);
    } catch (e) { setError(e.message); setLoading(false); }
  }
  return <div><button className="button" type="button" onClick={buy} disabled={loading}>{loading ? "Opening checkout…" : "Buy PDF — £4.99"}</button>{error && <p role="alert">{error}</p>}</div>;
}
