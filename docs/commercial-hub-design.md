# RPG Commercial Hub design

Private interactive design at /portal/marketing. Only the server verified, email confirmed accounts r.pereszczako@sky.com and info@rpgexcellence.com can open the route. Other authenticated accounts receive not found, including other platform administrators. The navigation item follows the same access function.

The supplied logo is byte identical to the existing public/rpg-report-logo.png, which this design reuses.

Seven views cover the executive overview, prospects, opportunity pipeline, campaign briefs, proposal studio, brand library and Microsoft 365 connection setup. The initial workspace is empty. An explicit sample preview loads fictional companies with reserved .example email addresses and illustrative opportunity values.

Interactions include prospect creation and search, stage filtering, opportunity movement, service brief selection, personalised template generation, editable message and subject, branded preview, session draft saves, copy and branded HTML download. Preview state is memory only and is cleared on page reload; no prospect records or credentials are persisted. No outreach is sent, no real companies have been researched and no AI service is called by template generation.

Microsoft Graph OAuth, private persistent prospect storage, production draft creation, approved sending and reply synchronisation are not implemented in this design release. Their controls remain visibly unavailable, and Microsoft 365 has a setup checklist. The website account allowlist does not establish or grant mailbox access.

This release changes no existing subscription or account entitlements. A production data release must repeat authorisation on every server action and export, use private database policies and server-held OAuth tokens, and include an auditable approval queue.
