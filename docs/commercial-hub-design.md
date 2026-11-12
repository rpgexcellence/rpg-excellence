# RPG Commercial Hub

Private workspace at `/portal/marketing`. Only server-verified, email-confirmed accounts `r.pereszczako@sky.com` and `info@rpgexcellence.com` can open it, including its company detail, import and save endpoints. Other accounts receive not found or an API denial. Mailbox authorisation is separate.

The supplied logo is byte-identical to the existing `public/rpg-report-logo.png`.

## Company register

The register persists company identity, verified legal entity when known, structured address, general business contacts, multiple named contacts, ISO standards, service fit, research sources, qualification status and follow-up actions. Unknown details remain blank. It uses the supplier workspace's company/detail structure without reading or copying customer supplier records.

Search, stage/standard/evidence filters and 20-row pagination support researched portfolios. Company detail has six sections and a recorded change history. Revisions prevent one browser session from silently overwriting another. Records are shared only between the two permitted accounts.

JSON import validates the complete file before writing. A transaction prevents partial batches, repeat submissions are idempotent and existing companies are skipped rather than overwritten. Website hostnames are used as duplicate keys; brands sharing one hostname require review before import. Limits are 500 companies and 2 MB per import. No researched prospect data belongs in this public repository.

`Researched` is distinct from qualified opportunities. Research records have no inferred deal value. Published certification or sector relevance is a potential fit, not evidence of purchase intent. Source dates and limitations remain visible. Company/contact do-not-contact flags block proposal preparation.

## Database setup and release

Before the persistent register release, run `supabase/migrations/20261112_commercial_prospect_register.sql` in the production Supabase SQL editor. It creates three commercial-only tables and service-role-only functions. It enables row-level security, revokes anonymous/authenticated table and function access, and independently checks the verified two-account allowlist inside save/import functions. It does not modify supplier records or subscription entitlements. The migration is rerunnable; its final check should return `ready = true`.

Until the migration is applied, the interface reports setup required and disables import rather than presenting a database failure as an empty register.

After deployment, sign in as an authorised account, open Prospects, choose Import research JSON, and select the prepared private research file. Verify the imported count, open a company, and refresh before treating the import as complete. The research file is delivered separately, never embedded in public source.

## Remaining Microsoft integration

Seven views cover overview, companies, pipeline, campaigns, proposals, brand library and Microsoft setup. Proposal generation uses local service templates, not an AI service. Email drafts remain session-only; branded HTML can be copied or downloaded. Microsoft Graph OAuth, Outlook draft creation, approved sending and reply synchronisation are not yet implemented. Connection controls remain unavailable. No outreach is sent by this release.

## Validation

Run `npm test`, `npm --prefix verification run test:commercial`, and `npm run build`. The database integration test applies the migration twice, rejects foreign and unconfirmed accounts, exercises transactional/idempotent imports, duplicate skipping, revision conflicts, cross-account updates, audit events and service-only privileges. Production persistence must still be verified after the manual migration and deployment.
