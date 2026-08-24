"use client";

import { useState } from "react";

export default function SubscribeButton({
  plan,
  children,
}) {
  const [loading, setLoading] =
    useState(false);

  async function handleSubscribe() {
    if (loading) {
      return;
    }

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

      let data = null;

      try {
        data =
          await response.json();
      } catch {
        data = null;
      }

      // ---------------------------------------------
      // CUSTOMER MUST SIGN IN BEFORE CHECKOUT
      // ---------------------------------------------

      if (response.status === 401) {
        const currentPath =
          `${window.location.pathname}${window.location.search}`;

        const loginUrl =
          new URL(
            "/portal/login",
            window.location.origin
          );

        loginUrl.searchParams.set(
          "next",
          currentPath
        );

        loginUrl.searchParams.set(
          "plan",
          plan
        );

        loginUrl.searchParams.set(
          "subscription",
          "required"
        );

        window.location.assign(
          loginUrl.toString()
        );

        return;
      }

      // ---------------------------------------------
      // OTHER CHECKOUT ERRORS
      // ---------------------------------------------

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Unable to start checkout."
        );
      }

      if (
        typeof data?.url !==
          "string" ||
        data.url.trim() === ""
      ) {
        throw new Error(
          "Stripe did not return a checkout URL."
        );
      }

      // ---------------------------------------------
      // OPEN STRIPE CHECKOUT
      // ---------------------------------------------

      window.location.assign(
        data.url
      );
    } catch (error) {
      console.error(
        "Checkout request failed:",
        error
      );

      const message =
        error instanceof Error &&
        error.message
          ? error.message
          : "Unable to start checkout. Please try again.";

      alert(message);

      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleSubscribe}
      disabled={loading}
      aria-busy={loading}
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
