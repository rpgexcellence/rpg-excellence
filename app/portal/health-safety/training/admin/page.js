import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "../../../../../lib/supabase/server";
import { createAdminClient } from "../../../../../lib/supabase/admin";

export const metadata = { title: "Training Administration | RPG Excellence" };
export const dynamic = "force-dynamic";

const formatDate = (value) => value
  ? new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value))
  : "—";

const label = (value) => String(value || "not_started")
  .replaceAll("_", " ")
  .replace(/\b\w/g, (letter) => letter.toUpperCase());

export default async function TrainingAdminPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/portal/login?next=/portal/health-safety/training/admin");

  const admin = createAdminClient();
  const { data: access, error: accessError } = await admin
    .from("portal_admins")
    .select("role,active")
    .eq("user_id", user.id)
    .eq("active", true)
    .eq("role", "admin")
    .maybeSingle();

  if (accessError || !access) redirect("/portal/health-safety/training");

  const [coursesResult, enrolmentsResult, passesResult, certificatesResult, usersResult] = await Promise.all([
    admin.from("hs_training_courses").select("id,course_code,title,version,active").order("course_code"),
    admin.from("hs_training_enrolments").select("id,learner_id,organization_id,course_id,status,progress_percent,started_at,completed_at,expires_at,updated_at").order("updated_at", { ascending: false }),
    admin.from("hs_training_passes").select("id,status,amount_paid,currency,purchased_at,access_expires_at").order("purchased_at", { ascending: false }),
    admin.from("hs_training_certificates").select("id,enrolment_id,learner_id,certificate_number,learner_name,course_title,score_percent,issued_at,valid_until,revoked_at").order("issued_at", { ascending: false }),
    admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
  ]);

  for (const result of [coursesResult, enrolmentsResult, passesResult, certificatesResult]) {
    if (result.error) throw new Error(result.error.message);
  }
  if (usersResult.error) throw new Error(usersResult.error.message);

  const courses = coursesResult.data || [];
  const enrolments = enrolmentsResult.data || [];
  const passes = passesResult.data || [];
  const certificates = certificatesResult.data || [];
  const courseMap = new Map(courses.map((course) => [course.id, course]));
  const userMap = new Map((usersResult.data?.users || []).map((item) => [
    item.id,
    item.user_metadata?.full_name || item.user_metadata?.name || item.email || "Learner",
  ]));
  const currentCertificates = certificates.filter((item) =>
    !item.revoked_at && (!item.valid_until || new Date(item.valid_until) >= new Date())
  );
  const activeEnrolments = enrolments.filter((item) =>
    ["not_started", "in_progress", "assessment_due", "failed"].includes(item.status)
  );
  const passedEnrolments = enrolments.filter((item) => item.status === "passed");
  const completionRate = enrolments.length
    ? Math.round((passedEnrolments.length / enrolments.length) * 100)
    : 0;
  const revenuePence = passes
    .filter((item) => item.status !== "refunded")
    .reduce((sum, item) => sum + (item.amount_paid || 0), 0);

  return (
    <main className="traPage">
      <style>{`
        *{box-sizing:border-box}.traPage{min-height:100vh;padding:34px 22px 80px;background:linear-gradient(135deg,#eaf3fb,#f8fafc);color:#071d3a;font-family:Arial,sans-serif}.traShell{max-width:1320px;margin:auto}.traTop{display:flex;justify-content:space-between;gap:20px;align-items:flex-start;flex-wrap:wrap}.traTop small{color:#087f6c;font-weight:900;letter-spacing:.11em}.traTop h1{font-size:34px;margin:7px 0}.traTop p{margin:0;color:#657b94}.traActions{display:flex;gap:9px;flex-wrap:wrap}.traButton{display:inline-flex;padding:12px 16px;border-radius:9px;background:#1762ef;color:#fff;font-weight:850}.traButton.secondary{background:#fff;color:#12385f;border:1px solid #cbd8e8}.traMetrics{display:grid;grid-template-columns:repeat(5,1fr);gap:13px;margin:25px 0 17px}.traMetric{min-height:125px;padding:18px;border:1px solid #d8e4ef;border-radius:14px;background:#fff;display:flex;flex-direction:column;justify-content:space-between}.traMetric span{color:#637991;font-size:11px;font-weight:900}.traMetric strong{font-size:30px}.traMetric small{color:#8393a5}.traPanel{margin-top:16px;padding:22px;border:1px solid #d8e4ef;border-radius:16px;background:#fff}.traPanelHead{display:flex;justify-content:space-between;align-items:end;gap:14px;margin-bottom:17px}.traPanelHead h2{margin:0;font-size:20px}.traPanelHead p{margin:5px 0 0;color:#6b8097}.traCount{padding:7px 10px;border-radius:999px;background:#edf3ff;color:#175fc9;font-size:12px;font-weight:850}.traTableWrap{overflow-x:auto}.traTable{width:100%;border-collapse:collapse;min-width:880px}.traTable th{text-align:left;padding:11px;border-bottom:2px solid #dce5ee;color:#61778e;font-size:11px;letter-spacing:.04em}.traTable td{padding:13px 11px;border-bottom:1px solid #e8eef4;font-size:13px;vertical-align:middle}.traTable tr:last-child td{border-bottom:0}.traTable strong,.traTable small{display:block}.traTable small{color:#7a8da2;margin-top:3px}.traStatus{display:inline-flex!important;padding:6px 9px;border-radius:999px;background:#edf3ff;color:#195bcd;font-size:11px;font-weight:850}.traStatus.passed{background:#e4f7ef;color:#08775d}.traStatus.failed{background:#fff1e2;color:#a65a00}.traStatus.expired,.traStatus.withdrawn{background:#f2f2f2;color:#676767}.traProgress{width:110px;height:8px;border-radius:999px;background:#e6edf4;overflow:hidden}.traProgress i{display:block;height:100%;background:#08a578}.traEmpty{padding:20px;border-radius:11px;background:#f1f6fb;color:#60758c}@media(max-width:1050px){.traMetrics{grid-template-columns:repeat(3,1fr)}}@media(max-width:650px){.traMetrics{grid-template-columns:1fr 1fr}.traTop h1{font-size:29px}}@media(max-width:430px){.traMetrics{grid-template-columns:1fr}}
      `}</style>
      <div className="traShell">
        <header className="traTop">
          <div>
            <small>H&amp;S HUB · CONTROLLED ADMINISTRATION</small>
            <h1>Training Administration</h1>
            <p>Monitor learner access, progress, results and certificate records.</p>
          </div>
          <div className="traActions">
            <Link className="traButton secondary" href="/portal/health-safety">H&amp;S Hub</Link>
            <Link className="traButton secondary" href="/portal/health-safety/training/admin/diagnostics">Launch readiness</Link>
            <Link className="traButton" href="/portal/health-safety/training">Training Academy</Link>
          </div>
        </header>

        <section className="traMetrics">
          <div className="traMetric"><span>ENROLMENTS</span><strong>{enrolments.length}</strong><small>All learner records</small></div>
          <div className="traMetric"><span>ACTIVE LEARNING</span><strong>{activeEnrolments.length}</strong><small>Requiring completion</small></div>
          <div className="traMetric"><span>PASSED</span><strong>{passedEnrolments.length}</strong><small>{completionRate}% completion rate</small></div>
          <div className="traMetric"><span>CURRENT CERTIFICATES</span><strong>{currentCertificates.length}</strong><small>Valid and not revoked</small></div>
          <div className="traMetric"><span>TRAINING REVENUE</span><strong>£{(revenuePence / 100).toFixed(2)}</strong><small>Excluding refunded passes</small></div>
        </section>

        <section className="traPanel">
          <div className="traPanelHead"><div><h2>Learner register</h2><p>Latest activity is shown first.</p></div><span className="traCount">{enrolments.length} records</span></div>
          {enrolments.length ? (
            <div className="traTableWrap"><table className="traTable">
              <thead><tr><th>Learner</th><th>Course</th><th>Status</th><th>Progress</th><th>Started</th><th>Completed</th><th>Access expires</th></tr></thead>
              <tbody>{enrolments.map((enrolment) => {
                const course = courseMap.get(enrolment.course_id);
                return <tr key={enrolment.id}>
                  <td><strong>{userMap.get(enrolment.learner_id) || "Learner"}</strong><small>{enrolment.learner_id}</small></td>
                  <td><strong>{course?.title || "Training course"}</strong><small>{course?.course_code || "—"} · Version {course?.version || "—"}</small></td>
                  <td><span className={`traStatus ${enrolment.status}`}>{label(enrolment.status)}</span></td>
                  <td><strong>{enrolment.progress_percent}%</strong><div className="traProgress"><i style={{ width: `${enrolment.progress_percent}%` }} /></div></td>
                  <td>{formatDate(enrolment.started_at)}</td>
                  <td>{formatDate(enrolment.completed_at)}</td>
                  <td>{formatDate(enrolment.expires_at)}</td>
                </tr>;
              })}</tbody>
            </table></div>
          ) : <div className="traEmpty">No training enrolments have been created yet.</div>}
        </section>

        <section className="traPanel">
          <div className="traPanelHead"><div><h2>Certificate register</h2><p>Controlled achievement records, including revoked certificates.</p></div><span className="traCount">{certificates.length} records</span></div>
          {certificates.length ? (
            <div className="traTableWrap"><table className="traTable">
              <thead><tr><th>Certificate</th><th>Learner</th><th>Course</th><th>Score</th><th>Issued</th><th>Valid until</th><th>Status</th></tr></thead>
              <tbody>{certificates.map((certificate) => <tr key={certificate.id}>
                <td><strong>{certificate.certificate_number}</strong></td>
                <td><strong>{certificate.learner_name || userMap.get(certificate.learner_id) || "Learner"}</strong></td>
                <td>{certificate.course_title}</td>
                <td><strong>{certificate.score_percent}%</strong></td>
                <td>{formatDate(certificate.issued_at)}</td>
                <td>{formatDate(certificate.valid_until)}</td>
                <td><span className={`traStatus ${certificate.revoked_at ? "withdrawn" : "passed"}`}>{certificate.revoked_at ? "Revoked" : "Current"}</span></td>
              </tr>)}</tbody>
            </table></div>
          ) : <div className="traEmpty">No certificates have been issued yet.</div>}
        </section>
      </div>
    </main>
  );
}

