import test from "node:test";
import assert from "node:assert/strict";
import { businessEmail, recipientMatches, requestOpen, parseSubcontractorDetails, isPdfEvidence, maxPdfBytes } from "../lib/permit-subcontractor.mjs";

test("only the verified recipient address opens the request", () => {
  const user = { id: "recipient", email: "Lead@Contractor.example", email_confirmed_at: "2026-11-19" };
  const target = "lead@contractor.example";
  assert.equal(businessEmail(" Lead@Contractor.example "), target);
  assert.equal(businessEmail("lead@\ncontractor.example"), null);
  assert.equal(recipientMatches(user, target), true);
  assert.equal(recipientMatches(user, "other@contractor.example"), false);
  assert.equal(recipientMatches({ ...user, email_confirmed_at: null }, target), false);
});

test("a request closes on expiry, submission, revocation or a permit change", () => {
  const permit = { status: "draft", updated_at: "2026-11-19T09:00:00Z" };
  const now = Date.parse(permit.updated_at);
  const row = { permit_updated_at: permit.updated_at, expires_at: "2026-11-20T09:00:00Z" };
  assert.equal(requestOpen(row, permit, now), true);
  assert.equal(requestOpen(row, permit, Date.parse(row.expires_at)), false);
  assert.equal(requestOpen({ ...row, revoked_at: permit.updated_at }, permit, now), false);
  assert.equal(requestOpen({ ...row, submitted_at: permit.updated_at }, permit, now), false);
  assert.equal(requestOpen(row, { ...permit, updated_at: "2026-11-19T10:00:00Z" }, now), false);
  assert.equal(requestOpen(row, { ...permit, status: "awaiting_verification" }, now), false);
});

test("subcontractor submissions permit only bounded text fields and PDF evidence", () => {
  const form = new FormData();
  form.set("company", " Example Contractor ");
  form.set("work_lead", "Example Work Lead");
  form.set("method_summary", "Summary");
  form.set("status", "issued");
  assert.deepEqual(parseSubcontractorDetails(form), {
    company: "Example Contractor", work_lead: "Example Work Lead", method_summary: "Summary", telephone: null,
  });
  form.set("method_summary", "x".repeat(4001));
  assert.equal(parseSubcontractorDetails(form), null);
  const file = { name: "rams.pdf", type: "application/pdf" };
  const sample = Buffer.from("%PDF-1.7\n%%EOF\n");
  assert.equal(isPdfEvidence(file, sample), true);
  assert.equal(isPdfEvidence(file, Buffer.from("not a PDF")), false);
  assert.equal(isPdfEvidence(file, Buffer.alloc(maxPdfBytes + 1)), false);
  assert.equal(isPdfEvidence({ ...file, name: "rams.html" }, sample), false);
});
