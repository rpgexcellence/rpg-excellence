"use client";

import { useEffect, useState } from "react";

const fieldKey = (field, index) =>
  `${field.closest("[id^='question-']")?.id || "general"}:${index}:${field.name}`;

export default function OfflineAuditDraft({ auditId, userId, scopeId }) {
  const storageKey = `rpg-offline-audit:${userId}:${auditId}`;
  const [online, setOnline] = useState(true);
  const [savedAt, setSavedAt] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);

    try {
      const stored = JSON.parse(localStorage.getItem(storageKey) || "null");
      setSavedAt(stored?.savedAt || "");
    } catch {
      localStorage.removeItem(storageKey);
    }

    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, [storageKey]);

  const fields = () => {
    const scope = document.getElementById(scopeId);
    if (!scope) return [];

    return [...scope.querySelectorAll("input[name],select[name],textarea[name]")]
      .filter(
        (field) =>
          !["hidden", "file", "password", "submit", "button"].includes(field.type),
      );
  };

  const saveDraft = () => {
    const values = {};

    fields().forEach((field, index) => {
      values[fieldKey(field, index)] =
        field.type === "checkbox" || field.type === "radio"
          ? field.checked
          : field.value;
    });

    const timestamp = new Date().toISOString();
    localStorage.setItem(
      storageKey,
      JSON.stringify({ version: 1, savedAt: timestamp, values }),
    );
    setSavedAt(timestamp);
    setMessage(
      "Device draft saved. It is not yet part of the controlled audit record.",
    );
  };

  const restoreDraft = () => {
    const stored = JSON.parse(localStorage.getItem(storageKey) || "null");

    if (!stored?.values) {
      setMessage("No offline draft is stored on this device.");
      return;
    }

    fields().forEach((field, index) => {
      const value = stored.values[fieldKey(field, index)];
      if (value === undefined) return;

      if (field.type === "checkbox" || field.type === "radio") {
        field.checked = Boolean(value);
      } else {
        field.value = value;
      }

      field.dispatchEvent(new Event("input", { bubbles: true }));
      field.dispatchEvent(new Event("change", { bubbles: true }));
    });

    setMessage(
      "Draft restored for review. Submit each relevant form while online to create controlled records.",
    );
  };

  const clearDraft = () => {
    localStorage.removeItem(storageKey);
    setSavedAt("");
    setMessage("Device draft removed.");
  };

  return (
    <section
      className={`offlineAuditCard ${online ? "isOnline" : "isOffline"}`}
      aria-live="polite"
    >
      <div className="offlineAuditStatus" aria-hidden="true">
        <span className="statusDot" />
      </div>

      <div className="offlineAuditCopy">
        <div className="offlineAuditHeading">
          <strong>{online ? "Online fieldwork" : "Offline fieldwork mode"}</strong>
          <span className="connectionBadge">{online ? "CONNECTED" : "CONNECTION LOST"}</span>
        </div>

        <p>
          {online
            ? "Server submission is available. Save a temporary device draft before moving between locations."
            : "Keep this page open. Save a device draft and submit the controlled record after the connection returns."}
        </p>

        <div className="offlineAuditMeta">
          {savedAt ? (
            <span>
              <b>Device draft:</b>{" "}
              {new Date(savedAt).toLocaleString("en-GB")}
            </span>
          ) : (
            <span>No device draft saved</span>
          )}
          {message ? <span className="offlineAuditMessage">{message}</span> : null}
        </div>
      </div>

      <div className="offlineAuditActions">
        <button className="primaryAction" type="button" onClick={saveDraft}>
          Save device draft
        </button>
        <button type="button" onClick={restoreDraft} disabled={!savedAt}>
          Restore draft
        </button>
        <button type="button" onClick={clearDraft} disabled={!savedAt}>
          Clear
        </button>
      </div>

      <style jsx>{`
        .offlineAuditCard {
          display: grid;
          grid-template-columns: 12px minmax(0, 1fr) auto;
          gap: 18px;
          align-items: center;
          margin: 0 34px 18px;
          padding: 18px 20px;
          border: 1px solid #b8d5c9;
          border-radius: 14px;
          background: #eefaf5;
          box-shadow: 0 8px 24px rgba(7, 26, 61, 0.06);
        }

        .offlineAuditCard.isOffline {
          border-color: #efc46d;
          background: #fff7e5;
        }

        .offlineAuditStatus {
          align-self: stretch;
          display: flex;
          justify-content: center;
          padding-top: 5px;
        }

        .statusDot {
          width: 10px;
          height: 10px;
          border-radius: 999px;
          background: #0c9b78;
          box-shadow: 0 0 0 5px rgba(12, 155, 120, 0.13);
        }

        .isOffline .statusDot {
          background: #d98300;
          box-shadow: 0 0 0 5px rgba(217, 131, 0, 0.14);
        }

        .offlineAuditCopy {
          min-width: 0;
        }

        .offlineAuditHeading {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }

        .offlineAuditHeading strong {
          color: #09284e;
          font-size: 15px;
        }

        .connectionBadge {
          padding: 4px 7px;
          border-radius: 999px;
          background: #d7f2e8;
          color: #08735c;
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 0.09em;
        }

        .isOffline .connectionBadge {
          background: #ffe5ae;
          color: #925800;
        }

        .offlineAuditCopy p {
          margin: 7px 0 0;
          color: #38536f;
          font-size: 13px;
          line-height: 1.5;
        }

        .offlineAuditMeta {
          display: flex;
          gap: 8px 18px;
          flex-wrap: wrap;
          margin-top: 8px;
          color: #61778e;
          font-size: 11px;
          line-height: 1.45;
        }

        .offlineAuditMessage {
          color: #245d50;
          font-weight: 700;
        }

        .isOffline .offlineAuditMessage {
          color: #805100;
        }

        .offlineAuditActions {
          display: flex;
          justify-content: flex-end;
          gap: 8px;
          flex-wrap: wrap;
          max-width: 360px;
        }

        .offlineAuditActions button {
          min-height: 40px;
          padding: 9px 13px;
          border: 1px solid #b7c8da;
          border-radius: 9px;
          background: #ffffff;
          color: #09284e;
          font: inherit;
          font-size: 12px;
          font-weight: 800;
          cursor: pointer;
        }

        .offlineAuditActions .primaryAction {
          border-color: #2360e8;
          background: #2f61e8;
          color: #ffffff;
        }

        .offlineAuditActions button:disabled {
          cursor: not-allowed;
          opacity: 0.48;
        }

        .offlineAuditActions button:focus-visible {
          outline: 3px solid rgba(47, 97, 232, 0.3);
          outline-offset: 2px;
        }

        @media (max-width: 900px) {
          .offlineAuditCard {
            grid-template-columns: 12px minmax(0, 1fr);
          }

          .offlineAuditActions {
            grid-column: 2;
            justify-content: flex-start;
            max-width: none;
          }
        }

        @media (max-width: 600px) {
          .offlineAuditCard {
            margin: 0 16px 16px;
            padding: 16px;
            gap: 13px;
          }

          .offlineAuditActions {
            display: grid;
            grid-template-columns: 1fr 1fr;
            width: 100%;
          }

          .offlineAuditActions .primaryAction {
            grid-column: 1 / -1;
          }

          .offlineAuditActions button {
            width: 100%;
          }
        }
      `}</style>
    </section>
  );
}
