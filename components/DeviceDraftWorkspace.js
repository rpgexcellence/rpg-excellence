// VERIFIED_SOURCE_20261021: ordinary strings and explicit object properties.
"use client";

import { createContext, useContext, useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { DRAFT_SCHEMA, DRAFT_TTL, DRAFT_MAX_BYTES, protectedDraftField, draftPayload, mergeDraftValue, stableDraftJSON, validateDeviceDraft } from '../lib/device-drafts.mjs';
const DraftContext = createContext(null);
export function useDeviceDraftState(key, initial, enabled = true) {
  const [value, setValue] = useState(initial),
    context = useContext(DraftContext),
    first = useRef(true),
    current = useRef(value);
  current.current = value;
  useEffect(() => {
    if (!context || !enabled || protectedDraftField(key)) return;
    context.adapters.set(key, {
      "get": () => current.current,
      "set": setValue
    });
    return () => {
      context.adapters.delete(key);
    };
  }, [context, key, enabled]);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    context?.changed();
  }, [value, context]);
  return [value, setValue];
}
const editable = field => field.name && !field.disabled && !field.matches(':disabled') && !field.readOnly && !field.closest('[data-device-draft-exclude]') && !['hidden', 'file', 'password', 'submit', 'button', 'reset'].includes(field.type) && !protectedDraftField(field.name);
function formKey(form) {
  const identities = [...form.querySelectorAll('input[type="hidden"][name]')].filter(x => /(^id$|_id$|^question_number$|^control_id$|^discipline$|^stage$)/.test(x.name)).map(x => [x.name, x.value]).sort();
  const names = [...new Set([...form.elements].filter(editable).map(x => x.name))].sort();
  return stableDraftJSON([form.id || '', identities, names]);
}
function captureForms(root) {
  const forms = [...root.querySelectorAll('form')].filter(f => f.getAttribute('method')?.toLowerCase() !== 'get' && !f.closest('[data-device-draft-exclude]'));
  const keyed = forms.map(form => [formKey(form), form]);
  return keyed.filter(([key]) => keyed.filter(([k]) => k === key).length === 1).map(([key, form]) => ({
    "key": key,
    "fields": [...form.elements].filter(editable).map(field => ({
      "name": field.name,
      "type": field.type,
      "value": field.value,
      "checked": field.checked,
      "selected": field.multiple ? [...field.selectedOptions].map(x => x.value) : null
    }))
  }));
}
function restoreForms(root, saved) {
  let count = 0;
  const keys = [];
  const available = [...root.querySelectorAll('form')].filter(f => f.getAttribute('method')?.toLowerCase() !== 'get');
  for (const form of available) {
    if (available.filter(f => formKey(f) === formKey(form)).length !== 1) continue;
    const matches = saved.filter(item => item.key === formKey(form));
    if (matches.length !== 1) continue;
    keys.push(matches[0].key);
    const used = new Map();
    for (const field of [...form.elements].filter(editable)) {
      const candidates = matches[0].fields.filter(x => x.name === field.name && x.type === field.type && (!['radio', 'checkbox'].includes(field.type) || x.value === field.value));
      const index = used.get(field.name) || 0,
        item = candidates[['radio', 'checkbox'].includes(field.type) ? 0 : index];
      used.set(field.name, index + 1);
      if (!item) continue;
      if (field.multiple && Array.isArray(item.selected)) {
        for (const option of field.options) option.selected = item.selected.includes(option.value);
      } else {
        if (field.tagName === 'SELECT' && ![...field.options].some(x => x.value === item.value)) continue;
        const property = ['checkbox', 'radio'].includes(field.type) ? 'checked' : 'value';
        const proto = field.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : field.tagName === 'SELECT' ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
        Object.getOwnPropertyDescriptor(proto, property)?.set?.call(field, property === 'checked' ? Boolean(item.checked) : String(item.value ?? ''));
      }
      field.dispatchEvent(new Event('input', {
        "bubbles": true
      }));
      field.dispatchEvent(new Event('change', {
        "bubbles": true
      }));
      count++;
    }
  }
  return {
    "count": count,
    "keys": keys
  };
}
export default function DeviceDraftWorkspace({
  children,
  userId,
  organizationId,
  recordKey,
  label,
  fingerprint,
  refreshToken
}) {
  const formCache = useRef(new Map()),
    recovery = useRef([]),
    liveFingerprint = useRef(fingerprint);
  liveFingerprint.current = fingerprint;
  const root = useRef(null),
    router = useRouter(),
    [pending, startTransition] = useTransition();
  const [online, setOnline] = useState(true),
    [saved, setSaved] = useState(null),
    [message, setMessage] = useState(''),
    [autosave, setAutosave] = useState(false),
    [dirty, setDirty] = useState(false);
  const initialFingerprint = useRef(fingerprint),
    request = useRef(null),
    timer = useRef(null),
    restoring = useRef(false),
    saveRef = useRef(null);
  const registry = useRef(null);
  if (!registry.current) registry.current = {
    "adapters": new Map(),
    "changed": () => {
      if (restoring.current) return;
      setDirty(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => saveRef.current?.(true), 1200);
    }
  };
  const key = "rpg-device-draft:v1:" + userId + ":" + organizationId + ":" + recordKey + "";
  const info = {
    "userId": userId,
    "organizationId": organizationId,
    "recordKey": recordKey,
    "fingerprint": fingerprint
  };
  const conflict = fingerprint !== initialFingerprint.current;
  const save = (automatic = false) => {
    if (automatic && !autosave) return;
    try {
      if (conflict) throw Error('The server record changed while this page was open. Refresh and review it before creating another draft.');
      const now = Date.now(),
        states = Object.fromEntries([...registry.current.adapters].filter(([id]) => !protectedDraftField(id)).map(([id, adapter]) => [id, draftPayload(adapter.get())]));
      for (const form of captureForms(root.current)) formCache.current.set(form.key, form);
      const draft = {
        "schema": DRAFT_SCHEMA,
        ...info,
        "savedAt": now,
        "expiresAt": now + DRAFT_TTL,
        "states": states,
        "forms": [...formCache.current.values()]
      };
      const bytes = JSON.stringify(draft);
      if (new TextEncoder().encode(bytes).length > DRAFT_MAX_BYTES) throw Error('This draft exceeds the 2 MB device limit. Save smaller sections online.');
      localStorage.setItem(key, bytes);
      setSaved(draft);
      setDirty(false);
      setMessage(automatic ? 'Device draft autosaved.' : 'Device draft saved. It has not been submitted.');
    } catch (error) {
      setMessage(error.name === 'QuotaExceededError' ? 'Device storage is full. Save the record online or clear old drafts.' : error.message);
    }
  };
  saveRef.current = save;
  const clear = () => {
    try {
      localStorage.removeItem(key);
      formCache.current.clear();
      recovery.current = [];
      setSaved(null);
      setMessage('Device draft cleared. Current form values and server records are unchanged.');
    } catch {
      setMessage('This browser could not clear the draft.');
    }
  };
  useEffect(() => {
    const connection = () => setOnline(navigator.onLine);
    connection();
    window.addEventListener('online', connection);
    window.addEventListener('offline', connection);
    try {
      const draft = JSON.parse(localStorage.getItem(key) || 'null');
      if (draft && draft.expiresAt <= Date.now()) {
        localStorage.removeItem(key);
        setMessage('An expired device draft was removed.');
      } else setSaved(draft);
    } catch {
      setMessage('Device storage is unavailable or the saved draft is unreadable.');
    }
    const changed = event => {
      if (!event.target.closest('[data-device-draft-exclude]')) {
        for (const form of captureForms(root.current)) formCache.current.set(form.key, form);
        registry.current.changed();
      }
    };
    const element = root.current;
    element?.addEventListener('input', changed);
    element?.addEventListener('change', changed);
    const submit = event => {
      if (!navigator.onLine) {
        event.preventDefault();
        event.stopPropagation();
        setMessage('Submission paused: reconnect before saving, approving, publishing or closing a controlled record. Save a device draft to retain unfinished entries.');
      }
    };
    element?.addEventListener('submit', submit, true);
    const leaving = event => {
      if (element?.dataset.dirty === 'true') {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', leaving);
    return () => {
      clearTimeout(timer.current);
      window.removeEventListener('online', connection);
      window.removeEventListener('offline', connection);
      window.removeEventListener('beforeunload', leaving);
      element?.removeEventListener('input', changed);
      element?.removeEventListener('change', changed);
      element?.removeEventListener('submit', submit, true);
    };
  }, [key]);
  useEffect(() => {
    const t = setInterval(() => {
      try {
        if (saved?.expiresAt <= Date.now()) {
          localStorage.removeItem(key);
          setSaved(null);
          setMessage('The device draft expired and was removed.');
        }
      } catch {}
    }, 30000);
    return () => clearInterval(t);
  }, [key, saved]);
  const restore = () => {
    if (!navigator.onLine) {
      setMessage('Reconnect to check the latest server record before restoring. You can continue entering and saving a device draft offline.');
      return;
    }
    try {
      const draft = JSON.parse(localStorage.getItem(key) || 'null');
      validateDeviceDraft(draft, info);
      request.current = {
        "draft": draft,
        "token": refreshToken,
        "started": Date.now()
      };
      setMessage('Checking the current server record before restoring…');
      startTransition(() => router.refresh());
    } catch (error) {
      setMessage(error.message);
    }
  };
  useEffect(() => {
    const waiting = request.current;
    if (!waiting || waiting.token === refreshToken) return;
    request.current = null;
    try {
      validateDeviceDraft(waiting.draft, info);
      restoring.current = true;
      for (const [id, adapter] of registry.current.adapters) if (Object.hasOwn(waiting.draft.states, id)) adapter.set(current => mergeDraftValue(current, waiting.draft.states[id]));
      requestAnimationFrame(() => requestAnimationFrame(() => {
        const result = restoreForms(root.current, waiting.draft.forms);
        recovery.current = waiting.draft.forms.filter(form => !result.keys.includes(form.key));
        for (const form of waiting.draft.forms) formCache.current.set(form.key, form);
        restoring.current = false;
        setDirty(true);
        setMessage("Draft restored (" + result.count + " available fields). Saved entries in other steps will appear when opened. Review every entry and submit online. Files and formal confirmations were not restored.");
      }));
    } catch (error) {
      restoring.current = false;
      setMessage(error.message);
    }
  }, [refreshToken, fingerprint]);
  useEffect(() => {
    const observer = new MutationObserver(() => {
      if (!recovery.current.length || restoring.current || liveFingerprint.current !== initialFingerprint.current) return;
      // Remove matching entries before dispatching React events to avoid replay loops.
      const available = new Set([...root.current.querySelectorAll('form')].map(formKey));
      const ready = recovery.current.filter(form => available.has(form.key));
      if (!ready.length) return;
      recovery.current = recovery.current.filter(form => !available.has(form.key));
      restoring.current = true;
      restoreForms(root.current, ready);
      restoring.current = false;
    });
    observer.observe(root.current, {
      "childList": true,
      "subtree": true
    });
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!pending && request.current) {
      const t = setTimeout(() => {
        if (request.current) {
          request.current = null;
          setMessage('The server check did not complete. The draft was not restored; try again when connected.');
        }
      }, 15000);
      return () => clearTimeout(t);
    }
  }, [pending]);
  return <DraftContext.Provider value={registry.current}><div ref={root} className="deviceDraftWorkspace" data-dirty={dirty ? 'true' : 'false'}>
  <section className={"deviceDraftBar " + (online ? '' : 'offline') + ""} aria-label={"" + label + " device draft"} data-device-draft-exclude="true">
   <div><strong>{online ? 'Online workspace' : 'Connection lost'} <span>{label}</span></strong><p>Temporary draft on this device · expires after 24 hours · submit online to update the controlled record.</p><small>{saved ? "Saved " + new Date(saved.savedAt).toLocaleString('en-GB') + " \xB7 Expires " + new Date(saved.expiresAt).toLocaleString('en-GB') + "" : 'No device draft saved'} · Files must be selected again.</small>{conflict && <p role="alert">The server record changed. Draft recovery is blocked. Reload this page and review the current record before entering more changes.</p>}{message && <p role="status">{message}</p>}</div>
   <div className="deviceDraftButtons"><button type="button" onClick={() => save()} disabled={pending || conflict}>Save device draft</button><button type="button" onClick={restore} disabled={!saved || pending || conflict}>{pending ? 'Checking server…' : 'Restore draft'}</button><button type="button" onClick={clear} disabled={!saved}>Clear</button><label><input type="checkbox" checked={autosave} onChange={event => setAutosave(event.target.checked)} /> Autosave on this device</label></div>
  </section>{children}
  <style>{".deviceDraftBar{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:18px;padding:18px 22px;margin:18px clamp(12px,2vw,30px);border:1px solid #b4dacc;border-radius:13px;background:#effaf5;color:#173b59;font-family:Arial,sans-serif}.deviceDraftBar.offline{background:#fff7e5;border-color:#ebc77a}.deviceDraftBar>div:first-child{flex:1 1 360px;min-width:0}.deviceDraftBar strong{font-size:16px}.deviceDraftBar strong span{margin-left:10px;font-size:13px;font-weight:500}.deviceDraftBar p{margin:7px 0;font-size:13px;line-height:1.5}.deviceDraftBar small{font-size:12px;color:#526e82}.deviceDraftButtons{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.deviceDraftButtons button{min-height:42px;padding:10px 13px;border:1px solid #b6ccda;border-radius:9px;background:#fff;color:#123754;font:inherit;font-size:13px;font-weight:800;cursor:pointer}.deviceDraftButtons button:first-child{background:#265be8;border-color:#265be8;color:#fff}.deviceDraftButtons button:disabled{opacity:.5;cursor:not-allowed}.deviceDraftButtons label{display:flex;align-items:center;gap:6px;flex-basis:100%;font-size:12px}.deviceDraftButtons input{width:17px;height:17px}.deviceDraftButtons button:focus-visible{outline:3px solid #00a8b6;outline-offset:2px}@media print{.deviceDraftBar{display:none!important}}"}</style>
 </div></DraftContext.Provider>;
}
