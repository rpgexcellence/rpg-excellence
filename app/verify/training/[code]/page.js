import Link from "next/link";

import { createAdminClient } from "../../../../lib/supabase/admin";

export const metadata = {
  title: "Verify Training Certificate | RPG Excellence",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

function formatDate(value) {
  if (!value) return "Not specified";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value));
}

function certificateState(certificate) {
  if (!certificate) {
    return {
      key: "invalid",
      title: "Certificate not verified",
      message: "No training certificate matches this verification code.",
    };
  }

  if (certificate.revoked_at) {
    return {
      key: "revoked",
      title: "Certificate revoked",
      message: "This certificate was issued previously but is no longer valid.",
    };
  }

  if (
    certificate.valid_until &&
    new Date(`${certificate.valid_until}T23:59:59Z`) < new Date()
  ) {
    return {
      key: "expired",
      title: "Certificate expired",
      message: "The certificate is authentic, but its validity period has ended.",
    };
  }

  return {
    key: "valid",
    title: "Certificate verified",
    message: "This is an authentic RPG Excellence training completion record.",
  };
}

export default async function VerifyTrainingCertificatePage({ params }) {
  const { code: rawCode } = await params;
  const code = String(rawCode || "").trim().toLowerCase();
  let certificate = null;

  // Verification codes are 12 random bytes represented as 24 hex characters.
  // Reject malformed values before making a privileged database query.
  if (/^[a-f0-9]{24}$/.test(code)) {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("hs_training_certificates")
      .select(`
        certificate_number,
        verification_code,
        learner_name,
        course_title,
        course_version,
        score_percent,
        issued_at,
        valid_until,
        revoked_at,
        revocation_reason
      `)
      .eq("verification_code", code)
      .maybeSingle();

    if (error) throw new Error(error.message);
    certificate = data;
  }

  const state = certificateState(certificate);

  return (
    <main className="cvPage">
      <style>{`
        *{box-sizing:border-box}.cvPage{min-height:100vh;padding:46px 20px 80px;background:#eef3f7;font-family:Arial,sans-serif;color:#092746}.cvWrap{max-width:820px;margin:auto}.cvBrand{display:flex;align-items:center;gap:11px;margin-bottom:28px;color:#082a54;font-weight:950;letter-spacing:.1em;text-decoration:none}.cvMark{display:grid;place-items:center;width:42px;height:42px;border-radius:12px;background:#082a54;color:#fff;font-size:22px}.cvCard{overflow:hidden;border:1px solid #d2dee7;border-radius:18px;background:#fff;box-shadow:0 20px 45px rgba(9,39,70,.1)}.cvStatus{padding:30px;color:#fff;background:#087f63}.cvStatus.invalid,.cvStatus.revoked{background:#9e2b23}.cvStatus.expired{background:#a9670b}.cvIcon{display:grid;place-items:center;width:54px;height:54px;margin-bottom:15px;border:2px solid rgba(255,255,255,.7);border-radius:50%;font-size:28px;font-weight:900}.cvStatus h1{margin:0 0 7px;font-size:35px}.cvStatus p{margin:0;line-height:1.55;opacity:.92}.cvBody{padding:28px}.cvDetails{display:grid;grid-template-columns:1fr 1fr;gap:13px}.cvDetail{padding:15px;border:1px solid #dce5eb;border-radius:10px;background:#f9fbfc}.cvDetail.wide{grid-column:1/-1}.cvDetail span,.cvDetail strong{display:block}.cvDetail span{margin-bottom:6px;color:#6b7f91;font-size:11px;font-weight:900;letter-spacing:.07em;text-transform:uppercase}.cvDetail strong{line-height:1.45}.cvWarning{margin-top:17px;padding:15px;border-left:5px solid #b42318;border-radius:9px;background:#fff0ee;color:#8b211a;line-height:1.5}.cvCode{margin-top:19px;padding-top:17px;border-top:1px solid #e0e7ec;color:#697d8f;font-size:12px;overflow-wrap:anywhere}.cvInfo{margin-top:18px;padding:17px;border-radius:11px;background:#eaf3ff;color:#264d73;line-height:1.55}.cvActions{display:flex;gap:10px;flex-wrap:wrap;margin-top:20px}.cvActions a{padding:11px 15px;border:1px solid #cbd9e4;border-radius:9px;background:#fff;color:#173e61;text-decoration:none;font-weight:850}.cvActions a.primary{border-color:#082a54;background:#082a54;color:#fff}@media(max-width:620px){.cvStatus,.cvBody{padding:23px}.cvStatus h1{font-size:29px}.cvDetails{grid-template-columns:1fr}.cvDetail.wide{grid-column:auto}}
      `}</style>

      <div className="cvWrap">
        <Link className="cvBrand" href="/"><span className="cvMark">R</span>RPG EXCELLENCE</Link>

        <article className="cvCard">
          <header className={`cvStatus ${state.key}`}>
            <div className="cvIcon">{state.key === "valid" ? "✓" : "!"}</div>
            <h1>{state.title}</h1>
            <p>{state.message}</p>
          </header>

          <div className="cvBody">
            {certificate ? (
              <>
                <section className="cvDetails">
                  <div className="cvDetail wide"><span>Learner</span><strong>{certificate.learner_name}</strong></div>
                  <div className="cvDetail wide"><span>Course</span><strong>{certificate.course_title}</strong></div>
                  <div className="cvDetail"><span>Certificate number</span><strong>{certificate.certificate_number}</strong></div>
                  <div className="cvDetail"><span>Assessment score</span><strong>{certificate.score_percent}%</strong></div>
                  <div className="cvDetail"><span>Issued</span><strong>{formatDate(certificate.issued_at)}</strong></div>
                  <div className="cvDetail"><span>Valid until</span><strong>{formatDate(certificate.valid_until)}</strong></div>
                  <div className="cvDetail"><span>Course version</span><strong>{certificate.course_version}</strong></div>
                  <div className="cvDetail"><span>Current status</span><strong>{state.key.toUpperCase()}</strong></div>
                </section>

                {certificate.revoked_at && (
                  <div className="cvWarning">
                    Revoked {formatDate(certificate.revoked_at)}.
                    {certificate.revocation_reason ? ` ${certificate.revocation_reason}` : " Contact RPG Excellence for further information."}
                  </div>
                )}

                <div className="cvCode">Verification code: {certificate.verification_code}</div>
              </>
            ) : (
              <div className="cvInfo">
                Check that the complete verification address or 24-character verification code was entered correctly. No personal or training information has been disclosed.
              </div>
            )}

            <div className="cvActions">
              <Link className="primary" href="/en/hs-hub/training">View training</Link>
              <Link href="/en/contact">Contact RPG Excellence</Link>
            </div>
          </div>
        </article>
      </div>
    </main>
  );
}
