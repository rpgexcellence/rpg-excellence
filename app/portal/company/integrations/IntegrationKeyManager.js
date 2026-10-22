"use client";

import { useActionState, useState } from "react";
import { INTEGRATION_PERMISSION_GROUPS } from "../../../../lib/integration-policy.mjs";
import {
  createIntegrationApiKey,
  revokeIntegrationApiKey,
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

export default function IntegrationKeyManager({ clients = [] }) {
  const [state, action, pending] = useActionState(
    createIntegrationApiKey,
    initialState,
  );
  const [copied, setCopied] = useState(false);

  async function copyKey() {
    if (!state?.apiKey) return;
    await navigator.clipboard.writeText(state.apiKey);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2500);
  }

  return (
    <>
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
