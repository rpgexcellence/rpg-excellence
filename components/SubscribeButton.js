"use client";

import { useState } from "react";

export default function SubscribeButton({
  plan,
  children,
}) {
  const [loading, setLoading] =
    useState(false);

  async function handleSubscribe() {
    try {
      setLoading(true);

      const response =
        await fetch(
          "/api/stripe/checkout",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              plan,
            }),
          }
        );

      const data =
        await response.json();

      if (
        !response.ok ||
        !data?.url
      ) {
        throw new Error(
          data?.error ||
            "Unable to start checkout"
        );
      }

      window.location.href =
        data.url;
    } catch (error) {
      console.error(error);

      alert(
        "Unable to start checkout. Please try again."
      );

      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleSubscribe}
      disabled={loading}
      className="button"
      style={{
        cursor: loading
          ? "wait"
          : "pointer",
        opacity: loading
          ? 0.7
          : 1,
        border: "none",
      }}
    >
      {loading
        ? "Opening checkout..."
        : children}
    </button>
  );
}
