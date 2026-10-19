"use client";

import { useEffect, useState } from "react";

function formKey(form) {
  const hidden = (name) => form.querySelector(`input[name="${name}"]`)?.value || "";
  const names = [...new Set([...form.elements].map((field) => field.name).filter((name) => name && !name.startsWith("$ACTION_")))].sort();
  return JSON.stringify([hidden("inspection_id"), hidden("action_id"), names]);
}

function draftFields(form) {
  return [...form.querySelectorAll("input[name], select[name], textarea[name]")].filter((field) =>
    !field.disabled && !["hidden", "file", "password", "submit", "button"].includes(field.type));
}

export default function OfflineInspectionDraft({ inspectionId, userId, scopeId }) {
  const storageKey = `rpg-inspection-device-draft:${userId}:${inspectionId}`;
  const [online, setOnline] = useState(true);
  const [savedAt, setSavedAt] = useState("");
  const [message, setMessage] = useState("");
  const scope = () => document.getElementById(scopeId);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    try { setSavedAt(JSON.parse(localStorage.getItem(storageKey) || "null")?.savedAt || ""); } catch {}
    const blockOfflineSubmit = (event) => {
      if (!navigator.onLine && event.target instanceof HTMLFormElement) {
        event.preventDefault();
        event.stopPropagation();
        setMessage("Submission paused: you are offline. Use Save device draft, then submit when connected.");
      }
    };
    const element = document.getElementById(scopeId);
    element?.addEventListener("submit", blockOfflineSubmit, true);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
      element?.removeEventListener("submit", blockOfflineSubmit, true);
    };
  }, [storageKey, scopeId]);

  function saveDraft() {
    try {
      const element = scope();
      if (!element) throw new Error("The inspection workspace is unavailable.");
      const forms = [...element.querySelectorAll("form")].filter((form) => !form.classList.contains("wpiFieldworkForm")).map((form) => ({
        key: formKey(form), fields: draftFields(form).map((field) => ({ name: field.name, type: field.type,
          value: field.value, checked: field.checked })),
      }));
      const checklist = element.querySelector('.wpiFieldworkForm input[name="responses_json"]')?.value;
      const timestamp = new Date().toISOString();
      localStorage.setItem(storageKey, JSON.stringify({ version: 1, inspectionId, userId, savedAt: timestamp,
        checklist: checklist ? JSON.parse(checklist) : null, forms }));
      setSavedAt(timestamp);
      setMessage("Device draft saved. It has not been submitted to the controlled record. Selected files are not stored.");
    } catch (error) { setMessage("Draft could not be saved: " + error.message); }
  }

  function restoreDraft() {
    try {
      const stored = JSON.parse(localStorage.getItem(storageKey) || "null");
      if (!stored || stored.inspectionId !== inspectionId || stored.userId !== userId || stored.version !== 1 || !Array.isArray(stored.forms)) throw new Error("No matching device draft is available.");
      const element = scope();
      if (!element) throw new Error("The inspection workspace is unavailable.");
      let restoredForms = 0;
      for (const form of element.querySelectorAll("form")) {
        if (form.classList.contains("wpiFieldworkForm")) continue;
        const saved = stored.forms.find((item) => item.key === formKey(form));
        if (!saved || !Array.isArray(saved.fields)) continue;
        for (const field of draftFields(form)) {
          const item = saved.fields.find((item) => item.name === field.name && item.type === field.type &&
            (!["radio", "checkbox"].includes(field.type) || item.value === field.value));
          if (!item) continue;
          const property = ["radio", "checkbox"].includes(field.type) ? "checked" : "value";
          const value = property === "checked" ? Boolean(item.checked) : String(item.value || "");
          const prototype = field instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : field instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
          Object.getOwnPropertyDescriptor(prototype, property)?.set?.call(field, value);
          field.dispatchEvent(new Event("input", { bubbles: true }));
          field.dispatchEvent(new Event("change", { bubbles: true }));
        }
        restoredForms++;
      }
      if (Array.isArray(stored.checklist)) window.dispatchEvent(new CustomEvent("wpi-restore-device-checklist", { detail: { inspectionId, rows: stored.checklist } }));
      setMessage(`Draft restored to available forms (${restoredForms}). Review all values before submitting online. Locked records and selected files are not restored.`);
    } catch (error) { setMessage("Draft could not be restored: " + error.message); }
  }

  function clearDraft() {
    try {
      localStorage.removeItem(storageKey);
      window.dispatchEvent(new CustomEvent("wpi-clear-device-checklist", { detail: { inspectionId } }));
      setSavedAt("");
      setMessage("Device draft cleared. Values currently displayed and saved server records have not been changed.");
    } catch { setMessage("This browser could not clear the device draft."); }
  }

  return <section aria-label="Inspection connection and device draft" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 18, padding: "20px 22px", marginTop: 20, border: `1px solid ${online ? "#b4dacc" : "#ebc77a"}`, borderRadius: 13, background: online ? "#effaf5" : "#fff7e5" }}>
    <div style={{ flex: "1 1 300px", minWidth: 0 }}>
      <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
        <span aria-hidden="true" style={{ width: 10, height: 10, borderRadius: "50%", background: online ? "#0a9976" : "#c98100" }} />
        <strong>{online ? "Online inspection" : "Offline inspection"}</strong>
        <span role="status" style={{ fontSize: 11, fontWeight: 700, color: online ? "#087958" : "#925800" }}>{online ? "CONNECTED" : "CONNECTION LOST"}</span>
      </div>
      <p style={{ margin: "8px 0", color: "#38536f", fontSize: 13, lineHeight: 1.6 }}>{online ? "Save a temporary device draft before moving between locations. Submit each form online to update the controlled record." : "Keep this page open. Save a device draft and submit after the connection returns."}</p>
      <small style={{ color: "#5d7287", lineHeight: 1.6 }}>{savedAt ? "Device draft: " + new Date(savedAt).toLocaleString("en-GB") : "No device draft saved"} · Files must be selected again after restoring.</small>
      {message ? <p role="status" style={{ margin: "8px 0 0", fontSize: 13, lineHeight: 1.6 }}>{message}</p> : null}
    </div>
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      <button className="wpiButton primary" type="button" onClick={saveDraft}>Save device draft</button>
      <button className="wpiButton" type="button" onClick={restoreDraft} disabled={!savedAt}>Restore draft</button>
      <button className="wpiButton" type="button" onClick={clearDraft} disabled={!savedAt}>Clear</button>
    </div>
  </section>;
}
