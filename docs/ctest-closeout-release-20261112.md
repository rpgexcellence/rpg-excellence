# C Test follow up release

## Changes

Incomplete permit progression now displays each blocker as a separate list item. Editable drafts link directly to Edit draft permit; verification, issue and handback errors retain the Safety controls destination. The list uses two columns on desktop and one on smaller screens. Existing error URLs remain readable. Progression checks are unchanged.

The original C Test migration now includes the service role SELECT grant on internal_audit_events that was applied manually during the successful history retest. This records the existing production repair for reproducible database setup. No new database fields or functions are introduced by this follow up.

## Automated verification

- All 98 repository tests and integration API checks passed.
- SoA SQL tests passed, including persisted planned, in progress, awaiting verification and verified statuses projected through the task adapter used by the personal dashboard and My Tasks. Independent reviewer routing and rejection of self verification remain covered.
- The selected SoA workspace retains its existing control link when risk control selections are saved unchanged. Other workspace links remain intact; invalid replacements roll back.
- Inspection scheduling and checklist SQL tests passed, including independent identities, assigned fieldwork and cross company denial.
- Integration database checks passed.

## Existing release trace

The ownership, evidence, risk links and personal task workflow is already merged in PR 3. Main commit 02687b9933e057b5a5e85501b2524dc35d7e6db0 has a successful Vercel status. The PR records successful production application of 20261112_soa_owners_evidence_tasks.sql.

## Acceptance boundaries

This is a release note, not a C Test acceptance report. Automated regressions do not replace live acceptance evidence. Live independent verification and inspection assignment remain constrained by the availability of a second authorised Company C user. Full MOC, BCP and supplier approval lifecycles have not been demonstrated in this test round. No fabricated users, self approval bypass or entitlement changes are included.
