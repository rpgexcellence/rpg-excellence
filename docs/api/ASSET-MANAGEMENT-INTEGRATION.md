Asset Management integration extension
Release baseline: supplied repository ZIP 58, 8 November 2026.
Purpose and compatibility
The standalone portal is /portal/asset-management. The existing integration endpoint stays /api/v1/integration/assets; it does not move with the portal navigation. Existing asset fields and filters remain. The response adds asset_categories and calibration fields, calibration_status and a relative authenticated record_path. The existing asset_type filter continues to mean the primary reporting group. The optional category filter matches a multi-select category ID.

Existing /exports/assets payloads, history, checkpoints and cursors remain unchanged. New export resources have independent identities and snapshots, all using the released Phase 2 transaction visibility, retry and deletion protocol. payload_version remains 1 within each separately named resource. Do not use an old assets cursor for a new resource.
Permissions and allocation
API keys are company-bound machine credentials, not interactive System User accounts. The company Super Administrator grants API permissions through Enterprise Integration, using the existing People Administrator authorization. Portal users continue to require their separate Asset Management allocation and applicable subscription. API access retains the existing Consultant entitlement and organisation-owner binding. Removing a person's portal allocation does not revoke machine credentials; revoke the API key explicitly.
- assets:read: asset summaries and the asset-controls feed.
- assets:maintenance:read plus assets:read: maintenance and calibration history.
- assets:links:read plus assets:read: document, NC/CAPA and MOC association references only.
Existing keys receive no additional maintenance or link permissions automatically. Create an appropriately scoped key, or use the established controlled key-management process. Rotation preserves existing permissions; it does not silently add scopes. Both protected platform-owner email defaults and all user account data remain unchanged.
Endpoints
GET /api/v1/integration/assets?category=measuring_instruments

GET /api/v1/integration/assets/{UUID}/maintenance?page=1&page_size=25

GET /api/v1/integration/assets/{UUID}/links?kind=documents&page=1&page_size=25

For links, choose documents, assurance or moc. Each kind is separately paginated; there is no combined or silently truncated list. The API validates the parent asset company and current organisation owner. The maintenance endpoint includes planned and completed records; consumers evaluate scheduled_date, completed_date and status. Dates use ISO calendar format and current state is evaluated in UTC. Evidence reference text is available, but evidence storage paths, filenames, file bytes and signed URLs are not.

Source record references are not permission to read those records. Fetch finding/CAPA details through the existing separately scoped APIs. MOC and controlled-document contents remain subject to their established portal authorization. This extension exports no blanket legal-compliance or safe-to-use declaration.
New Phase 2 resources
Resource	Required permissions	Contents
asset-controls	assets:read	Asset identity, responsibility, legacy PPM fields, all categories and calibration controls
asset-maintenance	assets:read and assets:maintenance:read	Individual planned/completed service, inspection and calibration records
asset-documents	assets:read and assets:links:read	Association identity, asset identity and controlled document identity
asset-assurance-links	assets:read and assets:links:read	Explicit asset-to-NC or asset-to-CAPA association identities
asset-moc-links	assets:read and assets:links:read	MOC identity and its explicit asset identity


Use /api/v1/integration/exports/{resource}. For each new resource, start without a cursor, apply every page durably, then save the returned checkpoint. Treat change_id as a decimal string and per-record version. Honour delete operations and reconcile missing records on a full resnapshot. Reference links are explicitly stored associations; inferred CAPA associations through an NC can be joined by a consumer that also has authorized source access. Unlinked records do not acquire an invented asset association.

The asset-controls projection is synchronised in the same transaction as an asset update. A parent asset move removes no-longer-eligible child exports; a move back restores eligible children. No previous deletion history is reconstructed. New resource capture starts with this release's migration.
Information handling
Bearer keys belong in server-side secret storage, never QR labels, browser URLs or downloaded posters. Use the existing expiry, revocation, IP restriction, rate budget and mandatory audit controls. Failed mandatory dependencies withhold successful responses. Test keys remain health checks only and cannot read production assets. API clients should retain request IDs for support.

QR codes still resolve to authenticated portal records. Certificate download continues through /portal/asset-management/records/{asset}/evidence/{maintenance} with a human session, Asset Management permission, company/owner checks and access logging. No machine evidence-download bypass is introduced.

A future due date, uploaded certificate, planned task or recorded calibration result does not establish safe condition or legal compliance. Consumers must distinguish required, missing, overdue and completed information and preserve raw calibration results, including out_of_tolerance and conditional. Deleted links do not mean the underlying compliance obligation has ended.
Deployment and verification
Run 20261108_asset_management_integration_extension.sql after the existing Phase 2 foundation and November Asset Management migrations. It is transactional, checks required columns, preserves the old export definitions and is safe to reapply. Do not rerun the older stabilization migration afterwards: it contains the earlier permissions constraint. Apply rollback only as a separately reviewed forward migration; do not delete change history or resurrect revoked keys.

Deploy the supplied application files together after SQL succeeds. Old keys continue to access their released summary/export capabilities. Verify with a newly scoped company key: summary, one planned record, one completed calibration, link lists, a fresh snapshot and a subsequent update/delete. Check a key without the new scopes receives 403, test keys cannot read registers, another company cannot obtain the asset, and revoked keys return 401. A health response alone does not verify the new database migration or resource feeds.

Local release verification executes application handlers with an isolated adapter and SQL migrations in PGlite. This is not verification of production database state, hosting configuration or real credentials. Complete production smoke checks after deployment without publishing keys or evidence.
