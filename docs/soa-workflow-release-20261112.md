# SoA owners, evidence and personal tasks — 12 November 2026

C-Test is paused until this release is deployed. The expanded-control layout check did not establish that assignments, attachments or action routing worked; this release implements those missing behaviours.

## Resulting workflow

- Control owner and residual-risk owner are selectors from the active company directory. Stable person IDs are saved; names are retained for existing reports. Unique legacy names are preselected where they match an active company user; ambiguous/retired assignments require review.
- Each control can link multiple existing company information-security risks, with search and direct links to the risk record. Risk edits preserve links in other SoA workspaces. An excluded control cannot retain risk-treatment links.
- Implementation/effectiveness text notes remain available. Private file attachments support PDF, PNG, JPEG, WebP, DOCX, XLSX, TXT and CSV, up to 10 MB each and three files per category per save. Evidence metadata is company/assessment/control bound; downloads recheck access before issuing a short-lived download link. Failed transaction uploads are removed.
- A recorded action requires an active company action owner and target date. Its statuses are Planned, In progress, Awaiting independent verification, Verified complete or Cancelled. Completion evidence and an independent assigned reviewer are required before verification; approval access and a recorded conclusion are required to verify.
- Saved SoA actions appear under Information Security in My Tasks & Approvals, with personal/team/oversight filtering. The personal dashboard and company-user access page show a My SoA actions and reviews panel. Links reopen the exact control, expanded and editable according to current permissions. Legacy unassigned actions remain visible to their record owner for assignment.
- Active authorised company users can open the shared SoA through their Information Security module permission. View access remains read-only; editing requires contribution access and an existing entitlement. Evidence uses the same access check. Primary account/subscription settings are unchanged.
- Saves check the loaded control version and record an audit event. Control changes, risk links and evidence metadata are committed together. Browser writes cannot bypass the server workflow.

## Activation order

1. Run `supabase/migrations/20261112_soa_owners_evidence_tasks.sql` in Supabase SQL Editor. It is transactional and repeatable. It adds the assignment/action columns, private evidence bucket, metadata/audit tables, scope guard and save functions. Existing decisions and records are retained. The final `ready` value must be true.
2. Merge the release PR and wait for the production deployment to succeed.
3. Resume C-Test using the checks below.

Do not deploy the application before the migration: the new owner/evidence/task fields and server functions must exist first.

## Retest after deployment

1. Open Company C A.5.1. Select Raf as control owner and risk owner; link the existing Company C test risk.
2. Record a fictional test action, select Raf as action owner, set a target date, and leave its status Planned. Upload a harmless test PDF under Implementation evidence. Save.
3. Reload: assignments, risk link, action and attachment must remain. Open the attachment as Raf.
4. Open My Tasks & Approvals and the personal dashboard: the action must be visible, with its date and status, and Open must return to expanded A.5.1.
5. Open the linked risk's Controls step: its saved SoA link must open A.5.1. Save a risk draft and confirm the SoA link remains.
6. In the other-company test session, try the SoA and evidence URLs and check task lists. Company C details/files/tasks must be unavailable.
7. With a second authorised company user, submit the action for independent verification. The implementer must not verify their own action; the assigned approver must be able to record a conclusion. This test remains pending while Company C has only Raf.

## Validation

Production build, full repository tests, integration API verification and PostgreSQL-compatible workflow tests are run for this release. SQL tests cover repeat application, foreign people/risks, independent review, stale updates, private storage permissions, rollback of risk-link changes on evidence failure, audit history and preservation of links in other SoA workspaces. Authenticated production UI testing remains pending.
