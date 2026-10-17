"use client";

import { useEffect, useState } from "react";

const fieldKey = (field, index) => `${field.closest("[id^='question-']")?.id || "general"}:${index}:${field.name}`;

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
      .filter((field) => !["hidden", "file", "password", "submit", "button"].includes(field.type));
  };

  const saveDraft = () => {
    const values = {};
    fields().forEach((field, index) => {
      values[fieldKey(field, index)] = field.type === "checkbox" || field.type === "radio" ? field.checked : field.value;
    });
    const timestamp = new Date().toISOString();
    localStorage.setItem(storageKey, JSON.stringify({ version: 1, savedAt: timestamp, values }));
    setSavedAt(timestamp);
    setMessage("Device draft saved. It is not yet part of the controlled audit record.");
  };

  const restoreDraft = () => {
    const stored = JSON.parse(localStorage.getItem(storageKey) || "null");
    if (!stored?.values) return setMessage("No offline draft is stored on this device.");
    fields().forEach((field, index) => {
      const value = stored.values[fieldKey(field, index)];
      if (value === undefined) return;
      if (field.type === "checkbox" || field.type === "radio") field.checked = Boolean(value);
      else field.value = value;
      field.dispatchEvent(new Event("input", { bubbles: true }));
      field.dispatchEvent(new Event("change", { bubbles: true }));
    });
    setMessage("Draft restored for review. Submit each relevant form while online to create controlled records.");
  };

  const clearDraft = () => {
    localStorage.removeItem(storageKey);
    setSavedAt("");
    setMessage("Device draft removed.");
  };

  return <section className={`offlineAuditBar ${online ? "online" : "offline"}`} style={{display:"flex",justifyContent:"space-between",gap:18,alignItems:"center",margin:"0 34px 18px",padding:"16px 18px",border:`1px solid ${online ? "#b8d5c9" : "#efc46d"}`,borderRadius:13,background:online ? "#eefaf5" : "#fff7e5"}}>
    <div><strong>{online ? "Online fieldwork" : "Offline fieldwork mode"}</strong><span>{online ? "Server submission is available. Retain a temporary device draft before moving between locations." : "Do not refresh or close this page. Save a device draft and submit records after connection returns."}</span>{savedAt ? <small>Device draft: {new Date(savedAt).toLocaleString("en-GB")}</small> : null}{message ? <small role="status">{message}</small> : null}</div>
    <div className="offlineAuditActions" style={{display:"flex",gap:8,flexWrap:"wrap"}}><button type="button" onClick={saveDraft}>Save device draft</button><button type="button" onClick={restoreDraft} disabled={!savedAt}>Restore draft</button><button type="button" onClick={clearDraft} disabled={!savedAt}>Clear</button></div>
  </section>;
}
