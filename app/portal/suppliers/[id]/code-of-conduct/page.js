import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "../../../../../lib/supabase/server";
import { SUPPLIER_STANDARDS } from "../../../../../lib/supplier-assurance";

export const metadata = {
  title: "Supplier Code of Conduct | RPG Excellence",
};
export const dynamic = "force-dynamic";

const displayDate = (value) =>
  value
    ? new Intl.DateTimeFormat("en-GB", {
        dateStyle: "long",
      }).format(new Date(value))
    : "Not recorded";

export default async function SupplierCodePage({
  params,
  searchParams,
}) {
  const { id } = await params;
  const query = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(
      `/portal/login?next=/portal/suppliers/${id}/code-of-conduct`,
    );
  }

  const { data: supplier, error: supplierError } = await supabase
    .from("suppliers")
    .select("id,legal_name,supplier_reference")
    .eq("id", id)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (supplierError || !supplier) notFound();

  let request = supabase
    .from("supplier_code_of_conduct_documents")
    .select("*")
    .eq("supplier_id", id)
    .eq("owner_id", user.id);

  if (query?.document) {
    request = request.eq("id", query.document);
  }

  const { data: document, error } = await request
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !document) notFound();

  const snapshot = document.supplier_snapshot || {};
  const organization = document.organization_snapshot || {};
  const standardLabels = (document.standards_snapshot || []).map(
    (standardId) =>
      SUPPLIER_STANDARDS.find(
        (standard) => standard.id === standardId,
      )?.label || standardId,
  );

  return (
    <main className="cocPage">
      <style>{styles}</style>

      <header className="cocToolbar">
        <div>
          <Link href={`/portal/suppliers?id=${id}`}>
            ← Supplier Assurance Hub
          </Link>
          <span>
            {document.document_reference} · Version {document.version}
          </span>
        </div>
        <a
          className="download"
          href={`/portal/suppliers/${id}/code-of-conduct/pdf?document=${document.id}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          Download controlled PDF
        </a>
      </header>

      <article className="cocDocument">
        <div className="cocBar" />

        <header className="cocHeader">
          <div>
            <b>RPG EXCELLENCE</b>
            <span>CONTROLLED SUPPLIER ASSURANCE DOCUMENT</span>
          </div>
          <dl>
            <div>
              <dt>Document reference</dt>
              <dd>{document.document_reference}</dd>
            </div>
            <div>
              <dt>Version</dt>
              <dd>{document.version}.0</dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>{document.status}</dd>
            </div>
            <div>
              <dt>Effective</dt>
              <dd>{displayDate(document.effective_date)}</dd>
            </div>
          </dl>
        </header>

        <section className="cocTitle">
          <small>
            ISSUED BY{" "}
            {organization.name || "RPG Excellence customer"}
          </small>
          <h1>
            Supplier Code of Conduct
            <br />
            &amp; Assurance Requirements
          </h1>
          <p>
            A proportionate, risk-based code generated for the
            approved supply relationship and applicable assurance
            frameworks.
          </p>
        </section>

        <section className="cocIdentity">
          <div>
            <span>SUPPLIER</span>
            <strong>{snapshot.legalName}</strong>
            <p>
              {snapshot.address}
              <br />
              {snapshot.companyNumber
                ? `Registration: ${snapshot.companyNumber}`
                : ""}
              <br />
              {snapshot.contactName
                ? `Contact: ${snapshot.contactName}${snapshot.contactTitle ? `, ${snapshot.contactTitle}` : ""}`
                : ""}
              <br />
              {snapshot.contactEmail || ""}
            </p>
          </div>
          <div>
            <span>APPROVED SUPPLY</span>
            <strong>{snapshot.supplyDescription}</strong>
            <p>
              {snapshot.approvalScope ||
                "Scope subject to contract, purchase order and approved supplier record."}
            </p>
          </div>
        </section>

        <section className="cocFrameworks">
          <span>APPLICABLE ASSURANCE FRAMEWORKS</span>
          <div>
            {standardLabels.map((standardLabel) => (
              <b key={standardLabel}>{standardLabel}</b>
            ))}
          </div>
        </section>

        <div className="cocSections">
          {(document.sections || []).map((section, index) => (
            <section key={section.id}>
              <header>
                <b>{String(index + 1).padStart(2, "0")}</b>
                <div>
                  <h2>{section.title}</h2>
                  <span>
                    Applicability: {section.applicability}
                  </span>
                </div>
              </header>
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
              <ul>
                {section.requirements.map((requirement) => (
                  <li key={requirement}>{requirement}</li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <section className="cocDeclaration">
          <small>SUPPLIER ACKNOWLEDGEMENT</small>
          <h2>Declaration and acceptance</h2>
          <p>{document.declaration?.acknowledgement}</p>
          <div className="cocSign">
            <div>
              <span>Authorised representative</span>
            </div>
            <div>
              <span>Title</span>
            </div>
            <div>
              <span>Signature</span>
            </div>
            <div>
              <span>Date</span>
            </div>
          </div>
          <p className="cocReturn">
            Return the accepted document within{" "}
            {document.declaration?.responseDueDays || 20} days of
            receipt, unless otherwise agreed.
          </p>
        </section>

        <footer>
          <span>
            Controlled document · Review date{" "}
            {displayDate(document.review_date)}
          </span>
          <span>
            Printed copies are uncontrolled unless formally issued.
          </span>
        </footer>
      </article>
    </main>
  );
}

const styles = `
*{box-sizing:border-box}
.cocPage{min-height:100vh;padding:25px;background:#eaf0f6;color:#112942;font-family:Arial,sans-serif}
.cocToolbar{width:min(980px,100%);display:flex;justify-content:space-between;align-items:center;gap:18px;margin:0 auto 15px}
.cocToolbar>div{display:grid;gap:5px}
.cocToolbar a{color:#245bcf;font-weight:900;text-decoration:none}
.cocToolbar span{color:#6e8194;font-size:10px}
.cocToolbar .download{padding:12px 15px;border-radius:8px;background:#315fe6;color:#fff;font-size:12px}
.cocDocument{position:relative;width:min(980px,100%);margin:auto;overflow:hidden;border:1px solid #c7d4e0;background:#fff;box-shadow:0 18px 55px #14395f1c}
.cocBar{height:9px;background:linear-gradient(90deg,#07294f 0 72%,#35c6bc 72%)}
.cocHeader{display:grid;grid-template-columns:1fr 1.6fr;gap:25px;padding:24px 45px;border-bottom:1px solid #d6e0e9}
.cocHeader>div{display:grid;align-content:start;gap:5px}
.cocHeader>div b{color:#07294f;font-size:19px}
.cocHeader>div span,.cocTitle small,.cocIdentity span,.cocFrameworks>span,.cocDeclaration>small{color:#315fe6;font-size:8px;font-weight:950;letter-spacing:.13em}
.cocHeader dl{display:grid;grid-template-columns:1fr 1fr;margin:0;border:1px solid #d6e0e9}
.cocHeader dl>div{padding:8px 10px;border-right:1px solid #d6e0e9;border-bottom:1px solid #d6e0e9}
.cocHeader dt{color:#718397;font-size:7px;font-weight:900;text-transform:uppercase}
.cocHeader dd{margin:3px 0 0;font-size:9px;font-weight:850;text-transform:capitalize}
.cocTitle{padding:55px 45px 35px;background:linear-gradient(120deg,#f4f8fc,#fff)}
.cocTitle h1{margin:12px 0;font-size:42px;line-height:1.02;letter-spacing:-.04em}
.cocTitle p{max-width:720px;margin:0;color:#607589;line-height:1.6}
.cocIdentity{display:grid;grid-template-columns:1fr 1fr;gap:12px;padding:0 45px 30px}
.cocIdentity>div{padding:18px;border:1px solid #d5e0e9;border-radius:10px}
.cocIdentity strong{display:block;margin-top:7px}
.cocIdentity p{margin:6px 0 0;color:#687c90;font-size:10px;line-height:1.5;white-space:pre-line}
.cocFrameworks{padding:20px 45px;background:#07294f;color:#fff}
.cocFrameworks>span{color:#61dcd5}
.cocFrameworks>div{display:flex;gap:6px;flex-wrap:wrap;margin-top:10px}
.cocFrameworks b{padding:7px 9px;border:1px solid #ffffff2b;border-radius:999px;background:#ffffff0d;font-size:8px}
.cocSections{padding:30px 45px}
.cocSections>section{padding:20px 0;border-bottom:1px solid #dce4eb}
.cocSections header{display:grid;grid-template-columns:44px 1fr;gap:12px}
.cocSections header>b{display:grid;place-items:center;width:42px;height:42px;border-radius:9px;background:#eaf1ff;color:#315fe6}
.cocSections h2{margin:1px 0 5px;font-size:18px}
.cocSections header span{color:#6f8294;font-size:8px;font-weight:800}
.cocSections p{margin:12px 0 8px;color:#526a80;font-size:11px;line-height:1.65}
.cocSections ul{margin:10px 0 0 56px;padding-left:16px}
.cocSections li{margin:7px 0;color:#263f58;font-size:10px;line-height:1.45}
.cocSections li::marker{color:#1ba999}
.cocDeclaration{margin:0 45px 35px;padding:25px;border:1px solid #8fadd3;border-radius:12px;background:#f1f6fc}
.cocDeclaration h2{margin:7px 0}
.cocDeclaration p{color:#526a80;font-size:11px;line-height:1.6}
.cocSign{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:24px}
.cocSign div{height:55px;border-bottom:1px solid #7790aa}
.cocSign span{color:#697f95;font-size:8px;font-weight:800}
.cocDeclaration .cocReturn{margin:18px 0 0;color:#254566;font-weight:850}
.cocDocument>footer{display:flex;justify-content:space-between;gap:15px;padding:15px 45px;background:#07294f;color:#bcd0e2;font-size:8px}
@media(max-width:680px){
  .cocPage{padding:0}
  .cocToolbar{padding:12px;flex-direction:column;align-items:stretch}
  .cocToolbar .download{text-align:center}
  .cocDocument{border:0}
  .cocHeader,.cocIdentity{grid-template-columns:1fr}
  .cocHeader,.cocTitle,.cocIdentity,.cocFrameworks,.cocSections{padding-left:22px;padding-right:22px}
  .cocTitle h1{font-size:33px}
  .cocDeclaration{margin-left:22px;margin-right:22px}
  .cocSign{grid-template-columns:1fr}
  .cocDocument>footer{padding:15px 22px;display:grid}
}
@media print{
  .cocPage{padding:0;background:#fff}
  .cocToolbar{display:none}
  .cocDocument{width:100%;border:0;box-shadow:none}
  .cocSections>section{break-inside:avoid}
}`;
