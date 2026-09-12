# H&S Hub Training Academy — Controlled Test Plan

## Purpose

Use this plan to verify the complete learner, payment, administration and certificate journey before enabling live Stripe payments.

## Test environment

- Use a non-production Supabase project or controlled test account.
- Keep Stripe in test mode until every acceptance test passes.
- Apply the database migrations in filename order.
- Deploy the latest application build.
- Set the server environment variables:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `STRIPE_SECRET_KEY`
  - `STRIPE_WEBHOOK_SECRET`
  - `NEXT_PUBLIC_SITE_URL`
- Configure the Stripe webhook endpoint as:
  - `https://YOUR-DOMAIN/api/stripe/webhook`
- Subscribe the endpoint to:
  - `checkout.session.completed`
  - `checkout.session.async_payment_succeeded`
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.paid`
  - `invoice.payment_failed`

## Test identities

Prepare two separate accounts:

1. An active `portal_admins` user with role `admin`.
2. An ordinary learner with no administrator record.

Do not perform access-control tests while signed into both accounts in the same browser profile.

## 1. Build and migration verification

1. Run `npm run build`.
2. Confirm the build completes without compilation, lint or type errors.
3. Confirm these migrations have been applied:
   - `20260911_hs_hub_foundation.sql`
   - `20260911_hs_training_content.sql`
   - `20260912_hs_training_payment_idempotency.sql`
4. Sign in as the administrator.
5. Open:
   - `/portal/health-safety/training/admin/diagnostics`
6. Confirm the page reports **7/7 — Ready for controlled transaction testing**.

Acceptance: all seven readiness checks show **Ready**.

## 2. Access-control verification

### Administrator

1. Sign in as the administrator.
2. Open `/portal/health-safety/training`.
3. Confirm the **Administration** button is visible.
4. Open `/portal/health-safety/training/admin`.
5. Confirm the learner and certificate registers load.

### Ordinary learner

1. Sign out and sign in as the ordinary learner.
2. Open `/portal/health-safety/training`.
3. Confirm the **Administration** button is not visible.
4. Manually request `/portal/health-safety/training/admin`.
5. Confirm the learner is redirected to `/portal/health-safety/training`.
6. Repeat for `/portal/health-safety/training/admin/diagnostics`.

Acceptance: administration data is available only to an active administrator.

## 3. Portal navigation

1. Open `/portal`.
2. Confirm **Health & Safety Hub** appears in the sidebar.
3. Test each link:
   - H&S Dashboard
   - Risk Assessments
   - Risk Actions
   - My Training
   - My Certificates
4. Confirm no link returns a 404 page.

Acceptance: every H&S Hub destination is reachable from the main portal.

## 4. Public training catalogue

1. Open `/en/hs-hub/training`.
2. Confirm both courses are displayed:
   - `RA-INITIAL-001`
   - `RA-REFRESHER-001`
3. Confirm titles, duration, pass mark and prices agree with the database.
4. Confirm the certificate verification link opens `/verify/training`.

Acceptance: published course information is accurate and both purchase journeys are available.

## 5. Stripe test purchase

1. Sign in as the ordinary learner.
2. Select the initial course from the public training catalogue.
3. Complete checkout using an approved Stripe test-mode payment method.
4. Confirm Stripe returns to:
   - `/portal/billing/success?session_id=...`
5. Confirm the page displays:
   - **Your training course is ready**
   - The correct course code
   - The 12-month access statement
   - **Open My Training**
6. Open **My Training**.
7. Confirm the purchased course displays **Start course**.

Acceptance: one successful payment creates one consumed pass and one learner enrolment.

## 6. Payment-record verification

Using the Supabase table editor or read-only SQL, verify:

```sql
select
  stripe_checkout_session_id,
  status,
  owner_id,
  assigned_to,
  course_id,
  amount_paid,
  currency,
  purchased_at,
  access_expires_at
from public.hs_training_passes
order by purchased_at desc;
```

```sql
select
  training_pass_id,
  learner_id,
  course_id,
  status,
  progress_percent,
  expires_at
from public.hs_training_enrolments
order by created_at desc;
```

Confirm:

- Pass status is `consumed`.
- `owner_id` and `assigned_to` identify the learner.
- Enrolment status is `not_started`.
- Pass and enrolment course IDs match.
- Pass and enrolment expiry dates match.
- Access expires approximately 12 months after purchase.

## 7. Webhook retry and idempotency

1. Record the pass ID, enrolment ID, `purchased_at` and `access_expires_at`.
2. Replay the same successful checkout event from Stripe test mode.
3. Recheck the database.

Acceptance:

- The number of passes has not increased.
- The number of enrolments has not increased.
- The pass ID and enrolment ID are unchanged.
- `purchased_at` is unchanged.
- `access_expires_at` is unchanged.
- Stripe receives a successful webhook response.

## 8. Course progression

1. Open the purchased course.
2. Confirm only the correct learner can access the enrolment URL.
3. Complete every module in order.
4. Refresh the page after several modules.
5. Confirm saved progress remains correct.
6. Confirm progress reaches 100%.
7. Confirm the final assessment becomes available only after all active modules are complete.

Acceptance: progress is persistent, correctly calculated and cannot be advanced through another learner's enrolment.

## 9. Assessment failure and retry

1. Submit an assessment that does not reach the pass mark.
2. Confirm:
   - The result is recorded as failed.
   - No certificate is issued.
   - A subsequent attempt is available.
3. Confirm attempt numbers increase without overwriting the earlier result.

Acceptance: failed attempts remain traceable and cannot produce a certificate.

## 10. Assessment pass and certificate

1. Complete a subsequent assessment above the course pass mark.
2. Confirm:
   - Enrolment status becomes `passed`.
   - Completion date is recorded.
   - One certificate is created.
   - Score, course title, version and learner name are correct.
3. Reopen or refresh the assessment result.
4. Confirm a second certificate is not created.

Acceptance: passing creates exactly one controlled certificate for the enrolment.

## 11. Certificate display and PDF

1. Open the certificate from the learner course page.
2. Confirm:
   - Certificate number
   - Learner name
   - Course title and version
   - Score
   - Issue date
   - Valid-until date
   - Verification code or link
3. Download the PDF.
4. Open the PDF and confirm the same controlled information is legible.
5. Print or save the browser certificate view to confirm the print layout remains usable.

Acceptance: browser and PDF records agree and are suitable for retained evidence.

## 12. Public certificate verification

1. Sign out.
2. Open `/verify/training`.
3. Search using the valid verification code.
4. Confirm the public result displays the correct certificate status and controlled details.
5. Open `/verify/training/CODE` directly.
6. Test an invalid code.

Acceptance:

- A valid current certificate is confirmed.
- An invalid code does not disclose learner or system data.
- Public verification works without authentication.

## 13. Duplicate-purchase prevention

1. Sign in as the learner who already has current access.
2. Attempt to purchase the same course again.

Acceptance: checkout is not created and the learner is told that current course access already exists.

## 14. Responsive and browser checks

Test the following pages at desktop and mobile widths:

- H&S Hub dashboard
- Public training catalogue
- Learner Training Academy
- Course workspace
- Final assessment
- Certificate
- Certificate search and public verification
- Training Administration
- Launch Readiness diagnostics

Use the current supported versions of Chrome, Edge and Safari where available.

Acceptance: critical controls remain visible, readable and usable without horizontal page loss.

## Launch approval record

Record the following before enabling live payments:

| Item | Record |
| --- | --- |
| Test date | |
| Environment and deployment | |
| Application commit | |
| Database migration version | |
| Stripe mode | Test |
| Test checkout session | |
| Test certificate number | |
| Tester | |
| Outstanding defects | |
| Launch decision | Approved / Not approved |
| Approver | |

## Exit criteria

Live payment must remain disabled until:

- The production build passes.
- Readiness diagnostics report 7/7.
- All critical tests above pass.
- No open defect could create incorrect access, duplicate records, unauthorised disclosure or an invalid certificate.
- The Stripe live webhook is configured separately with the correct live signing secret.
- A named approver records the launch decision.

