"use client";

import { useState } from "react";

export default function TrainingPurchaseButton({
  course,
  children,
  className = "",
}) {
  const [loading, setLoading] = useState(false);

  async function purchase() {
    if (loading) return;

    try {
      setLoading(true);

      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          purchaseType: "training_course",
          course,
        }),
      });

      const data = await response.json().catch(() => null);

      if (response.status === 401) {
        const login = new URL("/portal/login", window.location.origin);
        login.searchParams.set(
          "next",
          `${window.location.pathname}${window.location.search}`
        );
        login.searchParams.set("purchase", "training_course");
        login.searchParams.set("course", course);
        window.location.assign(login.toString());
        return;
      }

      if (response.status === 409 && data?.enrolmentUrl) {
        window.location.assign(data.enrolmentUrl);
        return;
      }

      if (!response.ok || !data?.url) {
        throw new Error(data?.error || "Unable to start training checkout.");
      }

      window.location.assign(data.url);
    } catch (error) {
      window.alert(
        error instanceof Error
          ? error.message
          : "Unable to start training checkout."
      );
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
    >
      {loading ? "Opening secure checkout…" : children}
    </button>
  );
}

