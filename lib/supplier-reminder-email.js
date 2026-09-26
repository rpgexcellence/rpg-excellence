const escapeHtml = (value) => String(value || "").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[character]);

export async function sendSupplierCertificateReminder({ to, organisation, supplier, parentSupplier }) {
  if (!process.env.RESEND_API_KEY) throw new Error("RESEND_API_KEY is not configured.");
  const site = process.env.NEXT_PUBLIC_SITE_URL || "https://www.rpgexcellence.com";
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.RPG_ACCESS_EMAIL_FROM || "RPG Excellence <enquiries@rpgexcellence.com>",
      to: [to],
      subject: `Supplier certificate renewal: ${supplier.legal_name}`,
      html: `<div style="font-family:Arial,sans-serif;color:#102e4c"><h1>Supplier certification renewal due</h1><p>${escapeHtml(organisation.name)} scheduled this controlled reminder for a sub-tier supplier.</p><div style="padding:16px;border-left:4px solid #315fe6;background:#f3f7fb"><b>Primary supplier:</b> ${escapeHtml(parentSupplier.legal_name)}<br/><b>Sub-tier supplier:</b> ${escapeHtml(supplier.legal_name)}<br/><b>Certification:</b> ${escapeHtml(supplier.certification_standard || "Not specified")}<br/><b>Certificate number:</b> ${escapeHtml(supplier.certificate_number || "Not recorded")}<br/><b>Renewal / expiry date:</b> ${escapeHtml(supplier.certificate_expiry || "Not recorded")}</div><p><a href="${site}/portal/suppliers?id=${parentSupplier.id}">Open the supplier assurance record</a></p></div>`,
      text: `Supplier certification renewal due\n\nPrimary supplier: ${parentSupplier.legal_name}\nSub-tier supplier: ${supplier.legal_name}\nCertification: ${supplier.certification_standard || "Not specified"}\nRenewal / expiry: ${supplier.certificate_expiry || "Not recorded"}\n\n${site}/portal/suppliers?id=${parentSupplier.id}`,
    }),
  });
  if (!response.ok) throw new Error(`Resend ${response.status}: ${(await response.text()).slice(0, 500)}`);
}
