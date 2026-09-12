import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { createClient } from "../../../../../../lib/supabase/server";

export const metadata = {
  title: "Training Certificate | RPG Excellence",
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

export default async function TrainingCertificatePage({ params }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/portal/login?next=/portal/health-safety/training/${id}/certificate`);
  }

  const { data: enrolment, error: enrolmentError } = await supabase
    .from("hs_training_enrolments")
    .select("id,learner_id,status,completed_at,expires_at")
    .eq("id", id)
    .eq("learner_id", user.id)
    .maybeSingle();

  if (enrolmentError) throw new Error(enrolmentError.message);
  if (!enrolment) notFound();

  if (enrolment.status !== "passed") {
    redirect(`/portal/health-safety/training/${id}/assessment`);
  }

  const { data: certificate, error: certificateError } = await supabase
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
    .eq("enrolment_id", id)
    .eq("learner_id", user.id)
    .maybeSingle();

  if (certificateError) throw new Error(certificateError.message);
  if (!certificate) notFound();

  const revoked = Boolean(certificate.revoked_at);

  return (
    <main className="tcPage">
      <style>{`
        *{box-sizing:border-box}.tcPage{min-height:100vh;padding:38px 20px 80px;background:#eaf0f5;font-family:Arial,sans-serif;color:#092746}.tcWrap{max-width:1040px;margin:auto}.tcNav{display:flex;justify-content:space-between;gap:14px;align-items:center;margin-bottom:18px;flex-wrap:wrap}.tcNav a{padding:11px 15px;border:1px solid #c8d7e3;border-radius:9px;background:#fff;color:#173d60;text-decoration:none;font-weight:850}.tcHint{color:#62778b;font-size:13px}.tcPaper{position:relative;overflow:hidden;min-height:690px;padding:64px 70px;border:1px solid #c7d5df;border-radius:18px;background:#fff;box-shadow:0 22px 50px rgba(9,39,70,.13);text-align:center}.tcPaper:before,.tcPaper:after{content:'';position:absolute;width:250px;height:250px;border:32px solid #0a8d73;border-radius:50%;opacity:.08}.tcPaper:before{top:-150px;left:-150px}.tcPaper:after{right:-150px;bottom:-150px}.tcBrand{display:inline-flex;align-items:center;gap:11px;color:#082a54;font-weight:950;letter-spacing:.12em}.tcMark{display:grid;place-items:center;width:42px;height:42px;border-radius:12px;background:#082a54;color:#fff;font-size:22px}.tcKicker{display:block;margin-top:46px;color:#0a8d73;font-size:13px;font-weight:950;letter-spacing:.2em}.tcPaper h1{margin:13px 0 20px;font-family:Georgia,serif;font-size:55px;font-weight:500;color:#082a54}.tcAwarded{color:#61758a}.tcName{margin:18px auto 13px;padding-bottom:11px;max-width:650px;border-bottom:1px solid #aabac7;font-family:Georgia,serif;font-size:37px;color:#0a6d5b}.tcCourse{margin:15px auto 7px;max-width:760px;font-size:25px;line-height:1.35}.tcStatement{margin:8px auto 28px;max-width:660px;color:#5a7187;line-height:1.6}.tcMeta{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin:32px auto 0;max-width:790px}.tcMeta div{padding:14px;border-top:2px solid #d5e0e7}.tcMeta span,.tcMeta strong{display:block}.tcMeta span{margin-bottom:6px;color:#718396;font-size:11px;font-weight:900;letter-spacing:.08em;text-transform:uppercase}.tcMeta strong{font-size:14px}.tcCode{margin-top:33px;color:#687c8f;font-size:12px}.tcCode strong{color:#243f59}.tcRevoked{margin:24px auto 0;max-width:720px;padding:16px;border:2px solid #b42318;border-radius:10px;background:#fff0ee;color:#8f1d15;font-weight:850}.tcFoot{display:flex;justify-content:space-between;gap:15px;margin-top:45px;padding-top:18px;border-top:1px solid #dbe4ea;color:#6b7e90;font-size:11px;text-align:left}.tcFoot span:last-child{text-align:right}@media(max-width:700px){.tcPaper{padding:42px 24px}.tcPaper h1{font-size:39px}.tcName{font-size:29px}.tcCourse{font-size:21px}.tcMeta{grid-template-columns:1fr}.tcFoot{display:block;text-align:center}.tcFoot span{display:block;margin-top:8px}.tcFoot span:last-child{text-align:center}}@media print{.tcPage{padding:0;background:#fff}.tcNav{display:none}.tcWrap{max-width:none}.tcPaper{min-height:100vh;border:10px double #082a54;border-radius:0;box-shadow:none;page-break-inside:avoid}}
      `}</style>

      <div className="tcWrap">
        <nav className="tcNav">
          <Link href={`/portal/health-safety/training/${id}/assessment`}>← Assessment record</Link>
          <a href={`/portal/health-safety/training/${id}/certificate/pdf`}>Download PDF ↓</a>
        </nav>

        <article className="tcPaper">
          <div className="tcBrand"><span className="tcMark">R</span>RPG EXCELLENCE</div>
          <span className="tcKicker">CERTIFICATE OF COMPLETION</span>
          <h1>Professional Learning</h1>
          <p className="tcAwarded">This certificate is awarded to</p>
          <div className="tcName">{certificate.learner_name}</div>
          <p className="tcAwarded">for successfully completing</p>
          <h2 className="tcCourse">{certificate.course_title}</h2>
          <p className="tcStatement">
            The learner completed the prescribed learning and achieved the required standard in the final knowledge assessment.
          </p>

          <section className="tcMeta">
            <div><span>Assessment score</span><strong>{certificate.score_percent}%</strong></div>
            <div><span>Date issued</span><strong>{formatDate(certificate.issued_at)}</strong></div>
            <div><span>Valid until</span><strong>{formatDate(certificate.valid_until)}</strong></div>
          </section>

          {revoked && (
            <div className="tcRevoked">
              This certificate was revoked on {formatDate(certificate.revoked_at)}.
              {certificate.revocation_reason ? ` ${certificate.revocation_reason}` : ""}
            </div>
          )}

          <div className="tcCode">
            Certificate <strong>{certificate.certificate_number}</strong> · Verification code{" "}
            <Link href={`/verify/training/${certificate.verification_code}`}>
              <strong>{certificate.verification_code}</strong>
            </Link>
          </div>

          <footer className="tcFoot">
            <span>Course version {certificate.course_version}<br/>RPG Excellence Training Academy</span>
            <span>Knowledge completion record<br/>Competence must be confirmed through appropriate experience and supervision.</span>
          </footer>
        </article>
      </div>
    </main>
  );
}
