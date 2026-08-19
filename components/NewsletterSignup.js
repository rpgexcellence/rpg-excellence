"use client";

import { useState } from "react";

export default function NewsletterSignup({
  locale = "en",
  source = "homepage",
}) {
  const [email, setEmail] =
    useState("");

  const [status, setStatus] =
    useState("idle");

  const [message, setMessage] =
    useState("");

  async function handleSubmit(event) {
    event.preventDefault();

    setStatus("loading");
    setMessage("");

    try {
      const response =
        await fetch(
          "/api/newsletter/subscribe",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              email,
              source,
              locale,
            }),
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Unable to subscribe."
        );
      }

      setStatus("success");
      setMessage(
        data?.message ||
          "Thanks for joining RPG Insights."
      );

      setEmail("");
    } catch (error) {
      setStatus("error");
      setMessage(
        error?.message ||
          "Unable to subscribe at the moment."
      );
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        display: "grid",
        gap: "12px",
        maxWidth: "640px",
      }}
    >
      <div
        style={{
          display: "flex",
          gap: "10px",
          flexWrap: "wrap",
        }}
      >
        <input
          type="email"
          value={email}
          onChange={(event) =>
            setEmail(
              event.target.value
            )
          }
          placeholder="Your email address"
          required
          autoComplete="email"
          style={{
            flex: "1 1 260px",
            padding: "14px 16px",
            borderRadius: "10px",
            border:
              "1px solid #d8e0ea",
            fontSize: "16px",
          }}
        />

        <button
          type="submit"
          disabled={
            status === "loading"
          }
          style={{
            padding: "14px 20px",
            borderRadius: "10px",
            border: "none",
            background: "#1459D9",
            color: "#ffffff",
            fontWeight: 700,
            cursor:
              status === "loading"
                ? "wait"
                : "pointer",
            opacity:
              status === "loading"
                ? 0.7
                : 1,
          }}
        >
          {status === "loading"
            ? "Joining..."
            : "Join RPG Insights"}
        </button>
      </div>

      <div
        style={{
          fontSize: "13px",
          color: "#617087",
          lineHeight: 1.5,
        }}
      >
        Useful ISO, assurance and
        compliance updates only.
        Unsubscribe at any time.
      </div>

      {message && (
        <div
          style={{
            fontSize: "14px",
            color:
              status === "error"
                ? "#b42318"
                : "#16794b",
            fontWeight: 600,
          }}
        >
          {message}
        </div>
      )}
    </form>
  );
}
