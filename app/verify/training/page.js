import Link from "next/link";
import { redirect } from "next/navigation";

import { createAdminClient } from "../../../lib/supabase/admin";

export const metadata = {
  title: "Verify a Training Certificate | RPG Excellence",
  description: "Verify an RPG Excellence training certificate using its certificate number or verification code.",
};

export const dynamic = "force-dynamic";

async function verifyCertificate(formData) {
  "use server";

  const rawValue = String(formData.get("certificate_reference") || "").trim();
  const compactValue = rawValue.replaceAll(" ", "");
  const verificationCode = compactValue.toLowerCase();

  if (/^[a-f0-9]{24}$/.test(verificationCode)) {
    redirect(`/verify/training/${verificationCode}`);
  }

  const certificateNumber = compactValue.toUpperCase();
  if (!/^RPG-RA-\d{4}-[A-Z0-9]{10}$/.test(certificateNumber)) {
    redirect("/verify/training?error=invalid-format");
  }

  const admin = createAdminClient();
  const { data: certificate, error } = await admin
    .from("hs_training_certificates")
    .select("verification_code")
    .eq("certificate_number", certificateNumber)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!certificate) redirect("/verify/training?error=not-found");

  redirect(`/verify/training/${certificate.verification_code}`);
}

export default async function TrainingCertificateVerificationSearchPage({ searchParams }) {
  const query = await searchParams;
  const error = query?.error;
  const message = error === "not-found"
    ? "No certificate matches that certificate number. Check the reference and try again."
    : error === "invalid-format"
      ? "Enter the complete certificate number or 24-character verification code."
      : null;

  return (
    <main className="vsPage">
      <style>{`
        *{box-sizing:border-box}.vsPage{min-height:100vh;padding:50px 20px 90px;background:linear-gradient(145deg,#edf4f8 0%,#f8fbfd 55%,#e5f3ee 100%);font-family:Arial,sans-serif;color:#092746}.vsWrap{max-width:760px;margin:auto}.vsBrand{display:inline-flex;align-items:center;gap:11px;margin-bottom:38px;color:#082a54;font-weight:950;letter-spacing:.1em;text-decoration:none}.vsMark{display:grid;place-items:center;width:44px;height:44px;border-radius:12px;background:#082a54;color:#fff;font-size:23px}.vsCard{overflow:hidden;border:1px solid #cfdee8;border-radius:20px;background:#fff;box-shadow:0 24px 55px rgba(9,39,70,.12)}.vsHead{padding:36px;background:#082a54;color:#fff}.vsHead small{color:#72dbc0;font-weight:900;letter-spacing:.11em}.vsHead h1{margin:10px 0 9px;font-size:40px}.vsHead p{max-width:590px;margin:0;color:#d4e2ed;line-height:1.65}.vsBody{padding:32px}.vsForm{display:grid;gap:12px}.vsForm label{font-size:13px;font-weight:900;color:#274764}.vsInputRow{display:grid;grid-template-columns:1fr auto;gap:9px}.vsInputRow input{width:100%;padding:14px;border:1px solid #bfcfdb;border-radius:10px;font:inherit;color:#092746;text-transform:none}.vsInputRow input:focus{outline:3px solid rgba(23,98,239,.16);border-color:#1762ef}.vsInputRow button{padding:14px 20px;border:0;border-radius:10px;background:#0a8d73;color:#fff;font-weight:900;cursor:pointer}.vsHelp{margin:0;color:#697d90;font-size:12px;line-height:1.55}.vsError{padding:13px 15px;border-left:5px solid #b42318;border-radius:9px;background:#fff0ee;color:#8c2119;font-weight:750;line-height:1.45}.vsTrust{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:27px}.vsTrust div{padding:15px;border-radius:10px;background:#f2f6f8}.vsTrust strong,.vsTrust span{display:block}.vsTrust strong{margin-bottom:5px;color:#173f61}.vsTrust span{color:#6a7d8f;font-size:12px;line-height:1.45}.vsFoot{margin-top:24px;padding-top:20px;border-top:1px solid #e0e8ed;color:#64798c;font-size:13px;line-height:1.6}.vsFoot a{color:#1459d9;font-weight:800}@media(max-width:620px){.vsHead,.vsBody{padding:25px}.vsHead h1{font-size:31px}.vsInputRow{grid-template-columns:1fr}.vsTrust{grid-template-columns:1fr}}
      `}</style>

      <div className="vsWrap">
        <Link className="vsBrand" href="/"><span className="vsMark">R</span>RPG EXCELLENCE</Link>

        <section className="vsCard">
          <header className="vsHead">
            <small>TRAINING RECORD VALIDATION</small>
            <h1>Verify a certificate</h1>
            <p>Confirm whether an RPG Excellence training certificate is authentic, current, expired or revoked.</p>
          </header>

          <div className="vsBody">
            <form className="vsForm" action={verifyCertificate}>
              <label htmlFor="certificate_reference">Certificate number or verification code</label>
              <div className="vsInputRow">
                <input
                  id="certificate_reference"
                  name="certificate_reference"
                  required
                  autoComplete="off"
                  placeholder="RPG-RA-2026-XXXXXXXXXX or 24-character code"
                />
                <button type="submit">Verify certificate</button>
              </div>
              <p className="vsHelp">The reference appears on the learner’s certificate and downloaded PDF.</p>
              {message && <div className="vsError">{message}</div>}
            </form>

            <section className="vsTrust">
              <div><strong>Authenticity</strong><span>Confirms that the record was issued by RPG Excellence.</span></div>
              <div><strong>Validity</strong><span>Shows whether the certificate remains within its validity period.</span></div>
              <div><strong>Status</strong><span>Identifies certificates that have expired or been revoked.</span></div>
            </section>

            <div className="vsFoot">
              Verification confirms the training record only. Employers remain responsible for determining workplace competence, experience and supervision. For assistance, <Link href="/en/contact">contact RPG Excellence</Link>.
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
