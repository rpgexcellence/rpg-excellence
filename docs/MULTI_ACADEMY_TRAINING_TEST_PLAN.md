# RPG Excellence Multi-Academy Training — Controlled Launch Test Plan

## Scope

This plan verifies the complete commercial training journey for:

| Academy | Course | Code | Price |
| --- | --- | --- | --- |
| Health & Safety | Interactive Workplace Risk Assessment Training | RA-INITIAL-001 | £19.99 + VAT |
| Health & Safety | Workplace Risk Assessment Refresher | RA-REFRESHER-001 | £12.99 + VAT |
| Internal Audit | Internal Auditor Refresher | IA-REFRESHER-001 | £19.99 + VAT |
| RCA–8D | RCA and Corrective Action Practitioner | RCA-8D-001 | £49.99 + VAT |

Run all payment tests in Stripe test mode. Do not enable live payments until the launch approval record is complete.

## 1. Preflight

- [ ] Latest application deployment is successful.
- [ ] `npm run build` completes without errors.
- [ ] Administrator opens `/portal/health-safety/training/admin/diagnostics`.
- [ ] Diagnostics reports **7/7 — Ready for controlled transaction testing**.
- [ ] Stripe webhook endpoint is `https://www.rpgexcellence.com/api/stripe/webhook`.
- [ ] Stripe endpoint receives `checkout.session.completed` and `checkout.session.async_payment_succeeded`.
- [ ] Test administrator and ordinary learner accounts are available in separate browser profiles.

## 2. Public Hub and course discovery

Verify every route loads without a 404:

- [ ] `/en`
- [ ] `/en/hs-hub`
- [ ] `/en/hs-hub/training`
- [ ] `/en/internal-audit`
- [ ] `/en/internal-audit-training`
- [ ] `/en/capa-8d`
- [ ] `/en/rca-8d-training`
- [ ] `/verify/training`

Confirm the front-page Hub cards open the correct public Hub and display these offers:

- [ ] H&S training from £12.99 + VAT.
- [ ] Internal Auditor Refresher at £19.99 + VAT.
- [ ] RCA Practitioner Training at £49.99 + VAT.

## 3. Checkout matrix

Use a learner without current access to the selected course.

| Test | Product key | Expected course | Expected return Academy |
| --- | --- | --- | --- |
| H&S Initial | risk-assessment-initial | RA-INITIAL-001 | `/portal/health-safety/training` |
| H&S Refresher | risk-assessment-refresher | RA-REFRESHER-001 | `/portal/health-safety/training` |
| Internal Audit | internal-auditor-refresher | IA-REFRESHER-001 | `/portal/internal-audit/training` |
| RCA–8D | rca-8d-practitioner | RCA-8D-001 | `/portal/rca/training` |

For each course:

1. Start checkout from its public course page.
2. Confirm the amount and GBP currency in Stripe Checkout.
3. Pay with an approved Stripe test card.
4. Confirm return to `/portal/billing/success?session_id=...`.
5. Confirm the displayed title and course code are correct.
6. Select **Open My Training** and confirm the correct Academy opens.

Acceptance:

- [ ] One paid session creates one consumed training pass.
- [ ] One paid session creates one learner enrolment.
- [ ] The pass and enrolment reference the purchased course.
- [ ] Replaying the webhook does not create duplicates or extend dates.
- [ ] Attempting to repurchase a course with current access is blocked.

## 4. Academy isolation and access control

For each purchased course:

- [ ] The course appears only in its correct Academy.
- [ ] A learner cannot open another learner's enrolment URL.
- [ ] An H&S enrolment cannot open through an Internal Audit or RCA route.
- [ ] An Internal Audit enrolment cannot open through an H&S or RCA route.
- [ ] An RCA enrolment cannot open through an H&S or Internal Audit route.
- [ ] Ordinary learners cannot open training administration or diagnostics.
- [ ] Only an active `portal_admins` user with role `admin` can access administration.

## 5. Interactive module progression

Test at least one complete course in every Academy and complete every RCA module.

- [ ] Later modules are locked until preceding modules are complete.
- [ ] Each practical exercise requires a selected response.
- [ ] A rationale shorter than 25 characters cannot be submitted where required.
- [ ] Guidance must be checked and reviewed before completion.
- [ ] An incorrect decision does not unlock submission.
- [ ] Refreshing the page retains completed progress.
- [ ] Stored module evidence contains the decision, rationale, outcome and guidance acknowledgement.
- [ ] Completion reaches 100% and changes enrolment status to `assessment_due`.
- [ ] The final assessment cannot be opened before all active modules are complete.

RCA-specific checks:

- [ ] All 10 modules display module-specific content and decisions.
- [ ] Occurrence, escape and system causal paths are distinguished.
- [ ] Human and organisational factors avoid blame-only conclusions.
- [ ] Corrective-action choices distinguish strong controls from weak administrative responses.
- [ ] Effectiveness decisions distinguish action completion from sustained results.

## 6. Protected final assessment

For Internal Audit and RCA, and one H&S course:

1. Submit a result below 80%.
2. Confirm the enrolment becomes `failed`.
3. Confirm no certificate is created.
4. Confirm the failed attempt remains in assessment history.
5. Retake and achieve at least 80%.

Acceptance:

- [ ] Every question must be answered.
- [ ] Answer keys are not present in browser page data or source.
- [ ] Grading occurs server-side.
- [ ] Attempt numbers increase without overwriting earlier attempts.
- [ ] Passing changes enrolment status to `passed`.
- [ ] Exactly one certificate is created per enrolment.
- [ ] Reopening the result does not create another certificate.

## 7. Certificate and verification

For each Academy:

- [ ] Certificate page shows learner name, course title/version, score, issue date and valid-until date.
- [ ] Certificate number prefix is appropriate, including `RPG-IA` and `RPG-RCA`.
- [ ] PDF downloads and opens correctly.
- [ ] PDF information matches the browser certificate.
- [ ] Public verification link opens without authentication.
- [ ] Valid verification code returns the correct current certificate.
- [ ] Invalid code discloses no learner or system data.
- [ ] Revoked certificate is visibly reported as revoked.

## 8. Responsive and browser check

Test the front page, three public Hubs, three Academies, course player, assessment and certificate at:

- [ ] Desktop Chrome.
- [ ] Desktop Edge.
- [ ] Safari where available.
- [ ] Mobile width near 390 px.
- [ ] Tablet width near 768 px.

Confirm no critical control is hidden, clipped or inaccessible by keyboard.

## 9. Live-payment release gate

Live mode may be enabled only when:

- [ ] All tests above pass.
- [ ] No Severity 1 or Severity 2 defect remains.
- [ ] Prices and VAT wording are approved.
- [ ] Refund, privacy and terms links are available.
- [ ] Live Stripe secret and webhook signing keys are configured.
- [ ] A low-value controlled live transaction is approved and assigned to a named tester.
- [ ] Evidence of the test, payment, enrolment and certificate is retained.

## Launch approval record

| Item | Record |
| --- | --- |
| Test date | |
| Environment/deployment | |
| Application commit | |
| Database migration | |
| Diagnostics result | 7/7 |
| Stripe mode | Test |
| H&S checkout session | |
| Internal Audit checkout session | |
| RCA checkout session | |
| Test certificate numbers | |
| Tester | |
| Outstanding defects | |
| Release decision | |
| Approved by/date | |

