# Commercial Hub Microsoft 365 connection

This release connects only the info@rpgexcellence.com user mailbox. Website access and all Microsoft endpoints require the existing server-verified two-account Commercial Hub allowlist. Connecting a mailbox does not sign another account into RPG or expand the website allowlist. Existing Supabase Microsoft sign-in callback and credentials remain unchanged.

## Release configuration

Keep the Supabase callback in Entra. Add this second Web redirect URI exactly:

https://www.rpgexcellence.com/api/portal/marketing/microsoft/callback

The existing Microsoft application requires delegated User.Read, Mail.ReadWrite and offline_access for this release. Its configured Mail.Send permission is reserved for the subsequent approved-sending workflow; this code requests no Mail.Send scope and contains no send endpoint. Consent and permissions alone do not implement sending or reply synchronisation.

Set these Vercel environment variables for Production, all server-side (never NEXT_PUBLIC):

| Variable | Value |
| --- | --- |
| RPG_MS_CLIENT_ID | Application/client UUID from Entra Overview |
| RPG_MS_TENANT_ID | Directory/tenant UUID from Entra Overview |
| RPG_MS_CLIENT_SECRET | New commercial client secret VALUE, not secret ID |
| RPG_MS_TOKEN_KEY | Independently generated 32 random bytes encoded as standard Base64 |

Mark the client secret and token key Sensitive. Do not commit values or send them through chat. Generate the token key locally, for example in Windows PowerShell:

```powershell
$rpgBytes = New-Object byte[] 32
[System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($rpgBytes)
[Convert]::ToBase64String($rpgBytes) | Set-Clipboard
```

Paste the clipboard into the RPG_MS_TOKEN_KEY Vercel value. Clear the clipboard afterwards. Keep the token encryption key stable across redeployments and client-secret rotations; changing it requires reconnecting the mailbox. Rotate the Microsoft client secret before its recorded expiry. No real credential is generated or retained in this repository.

Run supabase/migrations/20261112_commercial_microsoft365.sql after the commercial prospect register migration. It creates only commercial connection and Outlook draft storage, with RLS and service-only privileges. It is rerunnable and returns ready=true. It does not alter customer supplier data, platform login or subscription entitlements. Merge/deploy only after configuration and database setup are complete.

## Connection and draft workflow

Open Commercial Hub → Microsoft 365 → Connect Microsoft 365. Sign in as info@rpgexcellence.com. A tenant-specific confidential authorization-code flow uses PKCE S256, encrypted HttpOnly Secure same-site cookies, session/actor-bound state and a ten-minute expiry. The server exchanges the code and verifies the Graph /me identity. Other mailboxes are rejected without replacing an existing connection. Tokens never reach client JavaScript, responses or application logs; AES-256-GCM encryption uses purpose-bound authenticated data. Refresh operations use an exclusive expiring database lease and conditional writes so concurrent refreshes or reconnects cannot silently overwrite each other.

Choose a saved prospect, prepare and review the subject/body/recipient, then mark it reviewed and choose Create Outlook draft. The server rechecks company and recipient do-not-contact flags. It persists a request reservation before the Graph call, and reuses a confirmed matching request rather than creating another draft. Ambiguous Graph/network/database outcomes are labelled uncertain and are not automatically retried. Check Outlook before intentionally starting another request. The Outlook draft ID and safe mailbox link are retained with the source prospect and actor. Draft HTML uses the existing escaped RPG logo/email template.

Saved Outlook drafts remain available after refreshing RPG. Unsaved editor/session drafts remain browser-session only and are labelled accordingly. Disconnect removes locally stored connection tokens; it retains Outlook drafts and the RPG draft history. Disconnect does not revoke Microsoft tenant-wide consent, which an administrator can manage in Entra.

## Validation and practical limit

Run npm test, npm --prefix verification run test:microsoft, and npm run build. Tests cover PKCE/session expiry/tampering, mailbox mismatch, key separation, provider-error sanitisation, review/recipient validation, route authorisation/CSRF/do-not-contact checks, duplicate and uncertain submissions, token refresh leases and database privileges. Build checks run without live Microsoft secrets.

Live acceptance still requires real Microsoft sign-in, an Outlook draft containing the expected branding, subject/body and recipient, a refresh check, and reconnect/disconnect verification. Do not send a test message to a prospect as part of connection validation. No live outreach, automatic sending, campaign sending, reply synchronisation or delivery tracking is implemented in this release. These are subsequent workflow changes requiring their own visible approval controls and validation.
