export const requestTable = "hs_permit_subcontractor_requests";
export const maxPdfBytes = 2 * 1024 * 1024;

export const isRequestId = value =>
  typeof value === "string" && /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(value);

export function businessEmail(value) {
  const email = typeof value === "string" ? value.trim().toLowerCase() : "";
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

export function recipientMatches(user, recipientEmail) {
  return Boolean(user?.id && user.email_confirmed_at && businessEmail(user.email) === recipientEmail);
}

export function requestOpen(row, permit, now = Date.now()) {
  return Boolean(row && !row.revoked_at && !row.submitted_at && Date.parse(row.expires_at) > now &&
    permit?.status === "draft" && permit.updated_at === row.permit_updated_at);
}

export function parseSubcontractorDetails(form) {
  const text = name => typeof form.get(name) === "string" ? form.get(name).trim() : "";
  const fields = {
    company: text("company"),
    work_lead: text("work_lead"),
    telephone: text("telephone") || null,
    method_summary: text("method_summary"),
  };
  if (!fields.company || fields.company.length > 160 ||
      !fields.work_lead || fields.work_lead.length > 160 ||
      (fields.telephone?.length ?? 0) > 40 ||
      !fields.method_summary || fields.method_summary.length > 4000) return null;
  return fields;
}

export function isPdfEvidence(file, bytes) {
  return file?.type === "application/pdf" && /\.pdf$/i.test(file.name) && bytes.length <= maxPdfBytes &&
    bytes.subarray(0, 8).toString("ascii").startsWith("%PDF-") &&
    /%%EOF\s*$/.test(bytes.subarray(-1024).toString("latin1"));
}
