import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "../../../../../lib/supabase/server";

export const metadata = {
  title: "My Training Certificates | RPG Excellence",
};

export const dynamic = "force-dynamic";

function formatDate(value) {
  if (!value) return "Not specified";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value));
}

function statusOf(certificate) {
  if (certificate.revoked_at) {
    return { key: "revoked", label: "Revoked" };
  }
  if (
    certificate.valid_until &&
    new Date(`${certificate.valid_until}T23:59:59Z`) < new Date()
  ) {
    return { key: "expired", label: "Expired" };
  }
  return { key: "valid", label: "Valid" };
}

export default async function LearnerCertificateRegisterPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/portal/login?next=/portal/health-safety/training/certificates");
  }

  const { data: certificates, error } = await supabase
    .from("hs_training_certificates")
    .select(`
      id,
      enrolment_id,
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
    .eq("learner_id", user.id)
    .order("issued_at", { ascending: false });

  if (error) throw new Error(error.message);

  const records = certificates || [];
  const validCount = records.filter((item) => statusOf(item).key === "valid").length;
  const expiredCount = records.filter((item) => statusOf(item).key === "expired").length;

  return (
    <main className="crPage">
      <style>{`
        *{box-sizing:border-box}.crPage{min-height:100vh;padding:38px 20px 80px;background:#f2f6f9;font-family:Arial,sans-serif;color:#092746}.crWrap{max-width:1120px;margin:auto}.crHead{display:flex;justify-content:space-between;gap:20px;align-items:flex-start;flex-wrap:wrap;margin-bottom:20px}.crHead small{color:#1762ef;font-weight:900;letter-spacing:.09em}.crHead h1{margin:7px 0;font-size:39px}.crHead p{margin:0;color:#63788c}.crBack{padding:11px 15px;border:1px solid #cbd9e4;border-radius:9px;background:#fff;color:#173e61;text-decoration:none;font-weight:850}.crMetrics{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:18px}.crMetric{padding:19px;border:1px solid #d8e3ea;border-radius:13px;background:#fff}.crMetric span,.crMetric strong{display:block}.crMetric span{color:#6b7f91;font-size:11px;font-weight:900;letter-spacing:.07em;text-transform:uppercase}.crMetric strong{margin-top:7px;font-size:29px}.crList{display:grid;gap:13px}.crCard{padding:22px;border:1px solid #d6e2ea;border-radius:15px;background:#fff;display:grid;grid-template-columns:minmax(0,1.5fr) repeat(3,minmax(105px,.45fr)) auto;gap:17px;align-items:center}.crCourse strong,.crCourse span{display:block}.crCourse strong{font-size:18px;line-height:1.4}.crCourse span{margin-top:6px;color:#677b8e;font-size:12px}.crFact span,.crFact strong{display:block}.crFact span{margin-bottom:5px;color:#738597;font-size:10px;font-weight:900;text-transform:uppercase}.crFact strong{font-size:13px}.crPill{display:inline-flex;padding:6px 9px;border-radius:999px;background:#e5f7ef;color:#087052;font-size:12px;font-weight:900}.crPill.expired{background:#fff1d9;color:#955b06}.crPill.revoked{background:#ffe9e7;color:#9b251c}.crActions{display:flex;gap:7px;flex-wrap:wrap;justify-content:flex-end}.crActions a{padding:9px 11px;border:1px solid #cbd9e4;border-radius:8px;color:#173e61;text-decoration:none;font-size:12px;font-weight:850}.crActions a.primary{border-color:#0a846e;background:#0a846e;color:#fff}.crEmpty{padding:38px;border:1px dashed #bfd0dd;border-radius:15px;background:#fff;text-align:center}.crEmpty h2{margin-top:0}.crEmpty p{color:#667b8f}.crEmpty a{display:inline-flex;margin-top:8px;padding:11px 15px;border-radius:9px;background:#0a56e8;color:#fff;text-decoration:none;font-weight:850}.crNote{margin-top:19px;padding:16px;border-left:5px solid #e0a21e;border-radius:9px;background:#fff7df;color:#6d5118;line-height:1.55}@media(max-width:880px){.crCard{grid-template-columns:1fr 1fr}.crCourse,.crActions{grid-column:1/-1}.crActions{justify-content:flex-start}}@media(max-width:570px){.crMetrics{grid-template-columns:1fr}.crCard{grid-template-columns:1fr}.crCourse,.crActions{grid-column:auto}.crHead h1{font-size:31px}}
      `}</style>

      <div className="crWrap">
        <header className="crHead">
          <div>
            <small>RPG TRAINING ACADEMY</small>
            <h1>My certificates</h1>
            <p>Your controlled training completion records and current validity status.</p>
          </div>
          <Link className="crBack" href="/portal/health-safety/training">← Training dashboard</Link>
        </header>

        <section className="crMetrics">
          <div className="crMetric"><span>Total certificates</span><strong>{records.length}</strong></div>
          <div className="crMetric"><span>Currently valid</span><strong>{validCount}</strong></div>
          <div className="crMetric"><span>Expired</span><strong>{expiredCount}</strong></div>
        </section>

        {records.length ? (
          <section className="crList">
            {records.map((certificate) => {
              const status = statusOf(certificate);
              return (
                <article className="crCard" key={certificate.id}>
                  <div className="crCourse">
                    <strong>{certificate.course_title}</strong>
                    <span>{certificate.certificate_number} · course version {certificate.course_version}</span>
                  </div>
                  <div className="crFact"><span>Issued</span><strong>{formatDate(certificate.issued_at)}</strong></div>
                  <div className="crFact"><span>Valid until</span><strong>{formatDate(certificate.valid_until)}</strong></div>
                  <div className="crFact"><span>Score / status</span><strong>{certificate.score_percent}% · <i className={`crPill ${status.key}`}>{status.label}</i></strong></div>
                  <div className="crActions">
                    <Link className="primary" href={`/portal/health-safety/training/${certificate.enrolment_id}/certificate`}>Open</Link>
                    <a href={`/portal/health-safety/training/${certificate.enrolment_id}/certificate/pdf`}>PDF</a>
                    <Link href={`/verify/training/${certificate.verification_code}`}>Verify</Link>
                  </div>
                </article>
              );
            })}
          </section>
        ) : (
          <section className="crEmpty">
            <h2>No certificates yet</h2>
            <p>Your certificates will appear here after you pass a final course assessment.</p>
            <Link href="/portal/health-safety/training">View my training</Link>
          </section>
        )}

        <aside className="crNote">
          A certificate confirms completion of the learning and assessment shown. Employers must still determine whether the learner has the experience, practical capability and supervision required for the work.
        </aside>
      </div>
    </main>
  );
}
