"use client";

import { useActionState, useState } from "react";
import { INTEGRATION_PERMISSION_GROUPS } from "../../../../lib/integration-policy.mjs";
import {
  createIntegrationApiKey,
  revokeIntegrationApiKey,
  startIntegrationApiKeyRotation,
  completeIntegrationApiKeyRotation,
} from "./actions";

const PERMISSION_GROUPS = INTEGRATION_PERMISSION_GROUPS;

const initialState = { error: "", success: "", apiKey: "" };

function dateLabel(value) {
  if (!value) return "No expiry";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function RevokeControl({ clientId, disabled }) {
  const [state, action, pending] = useActionState(
    revokeIntegrationApiKey,
    initialState,
  );
  return (
    <form action={action} className="integrationRevokeForm">
      <input type="hidden" name="client_id" value={clientId} />
      <button className="integrationDanger" disabled={disabled || pending}>
        {disabled ? "Revoked" : pending ? "Revoking…" : "Revoke key"}
      </button>
      {state?.error ? (
        <small className="integrationInlineError">{state.error}</small>
      ) : null}
    </form>
  );
}

function currentLiveKey(client) {
  return Boolean(client?.active && !client.revoked_at && client.environment === "live" &&
    (!client.expires_at || (Number.isFinite(Date.parse(client.expires_at)) && Date.parse(client.expires_at) > Date.now())));
}

function RotationControl({ client, clients }) {
  const [started, startAction, starting] = useActionState(startIntegrationApiKeyRotation, initialState);
  const [completed, completeAction, completing] = useActionState(completeIntegrationApiKeyRotation, initialState);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState("");
  const [hiddenSecret, setHiddenSecret] = useState("");
  const busy = starting || completing;
  const canRotate = currentLiveKey(client);
  const choices = clients.filter(item => item.id !== client.id && currentLiveKey(item));
  if (started?.client && !choices.some(item => item.id === started.client.id)) choices.push(started.client);
  const apiKey = started?.apiKey && started.apiKey !== hiddenSecret && !completed?.success ? started.apiKey : "";

  async function copyReplacement() {
    try {
      await navigator.clipboard.writeText(apiKey);
      setCopied(true);
      setCopyError("");
    } catch {
      setCopyError("Automatic copying is unavailable. Select and copy the key below.");
    }
  }

  if (!canRotate) return null;
  return (
    <details className="integrationRotation">
      <summary>Rotate key safely</summary>
      <p>Create a replacement, switch the connected systems, then retire this key. The current key stays active during the change.</p>
      <ol className="integrationRotationSteps">
        <li><strong>Create replacement</strong><span>Same permissions, IP restrictions, request limit and expiry.</span></li>
        <li><strong>Switch and test</strong><span>Use the replacement for a successful data request. A health check alone is insufficient.</span></li>
        <li><strong>Complete rotation</strong><span>Confirm all systems have switched before revoking the original.</span></li>
      </ol>
      <form action={startAction}>
        <input type="hidden" name="client_id" value={client.id} />
        <button className="integrationPrimary" disabled={busy || Boolean(started?.apiKey) || Boolean(completed?.success)}>
          {starting ? "Creating replacement…" : started?.apiKey ? "Replacement created" : "Create replacement key"}
        </button>
      </form>
      {started?.error ? <p className="integrationInlineError" role="alert">{started.error}</p> : null}
      {started?.success && !completed?.success ? <p role="status">{started.success}</p> : null}
      {apiKey ? (
        <div className="integrationSecret integrationRotationSecret">
          <div><span>DISPLAYED ONCE</span><h3>Copy the replacement key</h3>
            <p>Save it in the connected system's secure credential store. Leaving or refreshing this page removes this view.</p></div>
          <code tabIndex={0} aria-label="Replacement API key">{apiKey}</code>
          <div className="integrationRotationButtons">
            <button type="button" onClick={copyReplacement}>{copied ? "Copied" : "Copy replacement"}</button>
            <button type="button" onClick={() => setHiddenSecret(apiKey)}>Hide key</button>
          </div>
          {copyError ? <p role="alert">{copyError}</p> : null}
        </div>
      ) : null}
      <form action={completeAction} className="integrationRotationComplete">
        <input type="hidden" name="client_id" value={client.id} />
        <label>
          <span>Replacement key</span>
          <select name="replacement_id" required defaultValue={started?.client?.id || ""} key={started?.client?.id || "choose"} disabled={busy || Boolean(completed?.success)}>
            <option value="">Select the replacement created for this key</option>
            {choices.map(item => <option key={item.id} value={item.id}>{item.client_name} · {item.key_prefix}</option>)}
          </select>
        </label>
        <small>After returning to this page, select the replacement from this list. The server checks that it belongs to this rotation and has completed a successful data request.</small>
        <label className="integrationRotationConfirmation">
          <input type="checkbox" name="confirm_rotation" value="yes" required disabled={busy || Boolean(completed?.success)} />
          <span>I have switched every connected system to the replacement and am ready to revoke the original key.</span>
        </label>
        <button className="integrationDanger" disabled={busy || !choices.length || Boolean(completed?.success)}>
          {completing ? "Checking and completing…" : completed?.success ? "Original key disabled" : "Complete rotation and revoke original"}
        </button>
        {completed?.error ? <p className="integrationInlineError" role="alert">{completed.error}</p> : null}
        {completed?.success ? <p role="status">{completed.success}</p> : null}
      </form>
    </details>
  );
}

export default function IntegrationKeyManager({ clients = [] }) {
  const [state, action, pending] = useActionState(
    createIntegrationApiKey,
    initialState,
  );
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState("");

  async function copyKey() {
    if (!state?.apiKey) return;
    try {
      await navigator.clipboard.writeText(state.apiKey);
      setCopied(true);
      setCopyError("");
    } catch {
      setCopyError("Automatic copying is unavailable. Select and copy the key above.");
    }
  }

  return (
    <>
      <style>{`
        .integrationRotation{grid-column:1/-1;border-top:1px solid #dce6ef;padding-top:14px;margin-top:4px;min-width:0}
        .integrationRotation summary{cursor:pointer;color:#1250b6;font-weight:800;padding:8px 0}
        .integrationRotation p,.integrationRotation small{color:#536a82;line-height:1.55;overflow-wrap:anywhere}
        .integrationRotationSteps{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;list-style-position:inside;padding:0;margin:12px 0 18px}
        .integrationRotationSteps li{padding:14px;background:#f1f6fb;border:1px solid #dce6ef;border-radius:10px;color:#173857}
        .integrationRotationSteps strong,.integrationRotationSteps span{display:block;margin-top:5px}
        .integrationRotationSteps span{font-size:12px;color:#536a82;line-height:1.5}
        .integrationRotationComplete{display:grid;gap:12px;margin-top:20px;padding:16px;border:1px solid #dce6ef;border-radius:10px;background:#fbfdff}
        .integrationRotationComplete label:not(.integrationRotationConfirmation){display:grid;gap:7px;font-weight:700}
        .integrationRotationComplete select{width:100%;min-width:0;min-height:44px;padding:10px;border:1px solid #cbd9e6;border-radius:8px;background:#fff;color:#173857;font:inherit}
        .integrationRotationConfirmation{display:flex;align-items:flex-start;gap:10px;font-size:13px;line-height:1.5}
        .integrationRotationConfirmation input{width:18px;height:18px;flex:0 0 auto;margin-top:2px}
        .integrationRotationSecret{display:block!important;margin-top:14px;min-width:0}
        .integrationRotationSecret code{display:block;overflow-wrap:anywhere;white-space:pre-wrap;user-select:all;margin:12px 0}
        .integrationRotationButtons{display:flex;flex-wrap:wrap;gap:10px}
        .integrationRotation button{min-height:42px;white-space:normal}
        .integrationRotation summary:focus-visible,.integrationRotation button:focus-visible,.integrationRotation select:focus-visible{outline:3px solid #5b9cff;outline-offset:3px}
        @media(max-width:760px){.integrationRotationSteps{grid-template-columns:1fr}.integrationRotationComplete{padding:12px}}
      `}</style>
      <section className="integrationPanel">
        <div className="integrationPanelHead">
          <div>
            <span>CONTROLLED CREDENTIAL</span>
            <h2>Create an API key</h2>
            <p>
              Grant only the released read permissions needed by the connected system. Inbound writes and webhook delivery are not available in this release.
            </p>
          </div>
          <b>Enterprise</b>
        </div>

        <form action={action} className="integrationForm">
          <label>
            <span>Integration name *</span>
            <input
              name="client_name"
              required
              minLength={3}
              maxLength={120}
              placeholder="For example: BI assurance export"
            />
          </label>
          <label>
            <span>Environment *</span>
            <select name="environment" defaultValue="live">
              <option value="test">Test — credential check only; no customer data</option>
              <option value="live">Live — production records</option>
            </select>
          </label>
          <label>
            <span>Expiry date</span>
            <input name="expires_at" type="date" />
            <small>
              Recommended for temporary suppliers and implementation partners.
            </small>
          </label>

          <label style={{gridColumn:"1 / -1"}}>
            <span>Allowed source IP addresses (optional)</span>
            <textarea name="allowed_ips" rows={2} maxLength={1600} placeholder="Exact IPv4 / IPv6 addresses, separated by commas or spaces" />
            <small>Leave blank for no IP restriction. Network ranges are not supported. Requires a hosting ingress header that is configured and overwritten by your trusted proxy.</small>
          </label>
          <fieldset className="integrationPermissions">
            <legend>Permissions *</legend>
            <p>
              Permissions apply only to this organisation. API access does not
              change any user’s portal role.
            </p>
            <div className="integrationPermissionGrid">
              {PERMISSION_GROUPS.map((group) => (
                <div key={group.title} className="integrationPermissionGroup">
                  <strong>{group.title}</strong>
                  {group.options.map(([value, label]) => (
                    <label key={value}>
                      <input
                        type="checkbox"
                        name="permissions"
                        value={value}
                        defaultChecked={value === "findings:read"}
                      />
                      <span>{label}</span>
                    </label>
                  ))}
                </div>
              ))}
            </div>
          </fieldset>

          {state?.error ? (
            <div className="integrationMessage error">{state.error}</div>
          ) : null}
          <button className="integrationPrimary" disabled={pending}>
            {pending ? "Creating secure key…" : "Create API key"}
          </button>
        </form>

        {state?.apiKey ? (
          <div className="integrationSecret" role="status">
            <div>
              <span>DISPLAYED ONCE</span>
              <h3>Copy the API key now</h3>
              <p>
                It is stored only as a cryptographic digest and cannot be
                retrieved after you leave this page.
              </p>
            </div>
            <code>{state.apiKey}</code>
            <button type="button" onClick={copyKey}>
              {copied ? "Copied" : "Copy key"}
            </button>
            {copyError ? <p role="alert">{copyError}</p> : null}
          </div>
        ) : null}
      </section>

      <section className="integrationPanel">
        <div className="integrationPanelHead">
          <div>
            <span>ACTIVE CONNECTIONS</span>
            <h2>API clients</h2>
            <p>
              Review credential scope, recent use and expiry. Revoke a key
              immediately if access is no longer required.
            </p>
          </div>
          <b>
            {clients.filter((client) => client.active && !client.revoked_at && (!client.expires_at || new Date(client.expires_at)>new Date())).length}
            {" "}active
          </b>
        </div>
        {clients.length ? (
          <div className="integrationClientList">
            {clients.map((client) => {
              const revoked = !client.active || Boolean(client.revoked_at);
              const expired = client.expires_at && new Date(client.expires_at) <= new Date();
              return (
                <article className="integrationClient" key={client.id}>
                  <div>
                    <strong>{client.client_name}</strong>
                    <code>{client.key_prefix}••••••••</code>
                    <small>
                      {client.permissions?.join(" · ") || "No permissions"}
                    </small>
                  </div>
                  <div className="integrationClientMeta">
                    <span className={revoked ? "revoked" : "active"}>
                      {revoked ? "Revoked" : expired ? "Expired" : client.environment}
                    </span>
                    <small>Expires: {dateLabel(client.expires_at)}</small>
                    <small>
                      Last used: {client.last_used_at
                        ? dateLabel(client.last_used_at)
                        : "Never"}
                    </small>
                  </div>
                  <RevokeControl clientId={client.id} disabled={revoked} />
                  <RotationControl client={client} clients={clients} />
                </article>
              );
            })}
          </div>
        ) : (
          <div className="integrationEmpty">
            No API keys have been created for this organisation.
          </div>
        )}
      </section>
    </>
  );
}
