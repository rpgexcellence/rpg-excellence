"use client";
import { useState } from "react";
export default function PublicationPurchaseButton() {
  const [loading, setLoading] = useState(false);
  async function buy() {
    if (loading) return;
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ purchaseType: "digital_publication", publication: "ISO14001-2026-GUIDE" }) });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) { window.location.assign(`/portal/login?next=${encodeURIComponent(window.location.pathname)}&purchase=digital_publication`); return; }
      if (!res.ok || !data.url) throw new Error(data.error || "Unable to start checkout.");
      window.location.assign(data.url);
    } catch (e) { window.alert(e.message); setLoading(false); }
  }
  return <button className="button" type="button" disabled={loading} onClick={buy}>{loading ? "Opening secure checkout…" : "Buy PDF — £29.99"}</button>;
}
