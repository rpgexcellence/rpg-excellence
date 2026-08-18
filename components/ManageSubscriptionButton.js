"use client";

import { useState } from "react";

export default function ManageSubscriptionButton() {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    try {
      setLoading(true);

      const response = await fetch("/api/stripe/portal", {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok || !data?.url) {
        throw new Error(
          data?.error || "Unable to open billing portal"
        );
      }

      window.location.href = data.url;
    } catch (error) {
      console.error(
        "Manage subscription error:",
        error
      );

      alert(
        "Unable to open subscription management. Please try again."
      );

      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      style={{
        padding: "12px 18px",
        borderRadius: "8px",
        background: "#071A33",
        color: "#ffffff",
        border: "none",
        cursor: loading ? "wait" : "pointer",
        fontWeight: 700,
        opacity: loading ? 0.7 : 1,
      }}
    >
      {loading
        ? "Opening billing..."
        : "Manage Subscription"}
    </button>
  );
}
