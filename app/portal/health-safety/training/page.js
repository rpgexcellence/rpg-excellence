import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "../../../../lib/supabase/server";
import { createAdminClient } from "../../../../lib/supabase/admin";

export const metadata = { title: "Training Academy | RPG Excellence" };
export const dynamic = "force-dynamic";

const formatDate = (value) => value
  ? new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value))
  : "—";

const titleCase = (value) => String(value || "not_started")
  .replaceAll("_", " ")
  .replace(/\b\w/g, (letter) => letter.toUpperCase());

const catalogue = [
  {
    code: "RA-INITIAL-001",
    type: "Initial training",
    title: "Workplace Risk Assessment",
    description: "Learn to identify hazards, evaluate credible risk, choose effective controls and produce a suitable and sufficient assessment.",
    duration: "50–60 minutes",
    price: "£19.99 + VAT",
  },
  {
    code: "RA-REFRESHER-001",
    type: "Annual refresher",
    title: "Risk Assessment Refresher",
    description: "Recalibrate risk-scoring judgement, reinforce the hierarchy of control and revisit essential review triggers.",
    duration: "25–35 minutes",
    price: "£12.99 + VAT",
  },
];

function CourseCard({ item, course, enrolment }) {
  const progress = enrolment?.progress_percent || 0;
  const href = enrolment ? "/portal/health-safety/training/" + enrolment.id : "/en/hs-hub/training";
  return <article className="taCourse">
    <div className="taCourseTop"><span>{item.type}</span><b>{enrolment ? titleCase(enrolment.status) : "Available"}</b></div>
    <h2>{course?.title || item.title}</h2>
    <p>{course?.description || item.description}</p>
    <div className="taFacts"><span>{course?.duration_minutes ? course.duration_minutes + " minutes" : item.duration}</span><span>{course?.pass_mark || 80}% pass mark</span><span>Certificate</span></div>
    {enrolment ? <><div className="taProgress"><i style={{ width: progress + "%" }} /></div><div className="taProgressText"><span>{progress}% complete</span><span>{enrolment.completed_at ? "Completed " + formatDate(enrolment.completed_at) : "Continue learning"}</span></div></> : <div className="taPrice">{course ? "Included in your access" : item.price}</div>}
    <Link className="taButton" href={href}>{enrolment ? progress ? "Continue course →" : "Start course →" : "View access options →"}</Link>
  </article>;
}

export default async function TrainingAcademyPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/portal/login?next=/portal/health-safety/training");
  const admin = createAdminClient();

  const [coursesResult, enrolmentsResult, certificatesResult, adminAccessResult] = await Promise.all([
    supabase.from("hs_training_courses").select("id,course_code,title,course_type,description,duration_minutes,pass_mark,validity_months,price_pence,version").eq("active", true).order("course_type"),
    supabase.from("hs_training_enrolments").select("id,course_id,status,progress_percent,started_at,completed_at,expires_at,updated_at").eq("learner_id", user.id).order("updated_at", { ascending: false }),
    supabase.from("hs_training_certificates").select("id,course_id,certificate_number,course_title,score_percent,issued_at,valid_until,revoked_at").eq("learner_id", user.id).order("issued_at", { ascending: false }),
    admin.from("portal_admins").select("user_id").eq("user_id", user.id).eq("active", true).eq("role", "admin").maybeSingle(),
  ]);

  for (const result of [coursesResult, enrolmentsResult, certificatesResult]) {
    if (result.error) throw new Error(result.error.message);
  }
  const canAdministerTraining = !adminAccessResult.error && Boolean(adminAccessResult.data);

  const courses = coursesResult.data || [];
  const enrolments = enrolmentsResult.data || [];
  const certificates = (certificatesResult.data || []).filter((item) => !item.revoked_at);
  const courseByCode = new Map(courses.map((course) => [course.course_code, course]));
  const enrolmentByCourse = new Map(enrolments.map((enrolment) => [enrolment.course_id, enrolment]));
  const activeLearning = enrolments.filter((item) => ["not_started", "in_progress", "assessment_due", "failed"].includes(item.status));
  const passed = enrolments.filter((item) => item.status === "passed");
  const averageProgress = activeLearning.length
    ? Math.round(activeLearning.reduce((sum, item) => sum + item.progress_percent, 0) / activeLearning.length)
    : 0;

  return <main className="taPage"><style>{`
    *{box-sizing:border-box}.taPage{min-height:100vh;padding:34px 22px 80px;background:linear-gradient(135deg,#eaf3fb,#f8fafc);color:#071d3a;font-family:Arial,sans-serif}.taShell{max-width:1280px;margin:auto}.taTop{display:flex;justify-content:space-between;gap:22px;align-items:flex-start;flex-wrap:wrap}.taTop small{color:#087f6c;font-weight:900;letter-spacing:.11em}.taTop h1{font-size:36px;margin:7px 0}.taTop p{margin:0;color:#657b94}.taTopActions{display:flex;gap:9px;flex-wrap:wrap}.taButton{display:inline-flex;align-items:center;justify-content:center;padding:12px 16px;border-radius:9px;background:#1762ef;color:#fff;text-decoration:none;font-weight:850}.taButton.secondary{background:#fff;color:#12385f;border:1px solid #cbd8e8}.taHero{margin-top:25px;padding:30px;border-radius:19px;background:linear-gradient(120deg,#072650,#087768);color:#fff;display:grid;grid-template-columns:1fr auto;gap:28px;align-items:center}.taHero h2{font-size:27px;margin:0 0 8px}.taHero p{max-width:760px;margin:0;color:#d4e8e7;line-height:1.55}.taHero strong{font-size:48px}.taMetrics{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin:16px 0}.taMetric{min-height:128px;padding:19px;border:1px solid #d8e4ef;border-radius:14px;background:#fff;display:flex;flex-direction:column;justify-content:space-between}.taMetric span{color:#637991;font-size:12px;font-weight:850}.taMetric strong{font-size:32px}.taMetric small{color:#8393a5}.taSection{margin-top:17px;padding:23px;border:1px solid #d8e4ef;border-radius:16px;background:#fff}.taSectionHead{display:flex;justify-content:space-between;gap:15px;align-items:end;margin-bottom:18px}.taSectionHead h2{margin:0}.taSectionHead p{margin:5px 0 0;color:#6b8097}.taCourses{display:grid;grid-template-columns:1fr 1fr;gap:15px}.taCourse{padding:23px;border:1px solid #dbe5ee;border-radius:15px;background:#fbfdff}.taCourseTop{display:flex;justify-content:space-between;gap:12px}.taCourseTop span{color:#1762ef;font-size:11px;font-weight:900;letter-spacing:.09em;text-transform:uppercase}.taCourseTop b{padding:5px 8px;border-radius:999px;background:#e6f7f1;color:#08775d;font-size:11px}.taCourse h2{margin:15px 0 8px}.taCourse p{min-height:64px;color:#60758c;line-height:1.5}.taFacts{display:flex;gap:7px;flex-wrap:wrap;margin:17px 0}.taFacts span{padding:7px 9px;border-radius:999px;background:#edf3f9;color:#3a5774;font-size:11px;font-weight:800}.taProgress{height:10px;margin:21px 0 7px;background:#e4ebf2;border-radius:999px;overflow:hidden}.taProgress i{display:block;height:100%;background:#08a578}.taProgressText{display:flex;justify-content:space-between;color:#61778e;font-size:12px;margin-bottom:17px}.taPrice{font-size:19px;font-weight:900;margin:22px 0 17px}.taCertificates{display:grid;gap:9px}.taCertificate{display:grid;grid-template-columns:1.5fr .7fr .7fr auto;gap:16px;align-items:center;padding:15px;border:1px solid #dde6ee;border-radius:11px}.taCertificate strong,.taCertificate small{display:block}.taCertificate small{color:#75899d;margin-top:4px}.taScore{color:#079468;font-weight:900}.taEmpty{padding:22px;border-radius:12px;background:#f1f6fb;color:#5f748c}.taGuidance{margin-top:17px;padding:20px 23px;border-left:5px solid #e6a71d;border-radius:10px;background:#fff8e7;color:#664b13}.taGuidance strong{display:block;margin-bottom:5px}.taGuidance p{margin:0;line-height:1.5}@media(max-width:850px){.taMetrics{grid-template-columns:1fr 1fr}.taCourses{grid-template-columns:1fr}.taCertificate{grid-template-columns:1fr auto}.taCertificate>:nth-child(2),.taCertificate>:nth-child(3){display:none}}@media(max-width:520px){.taMetrics{grid-template-columns:1fr}.taHero{grid-template-columns:1fr}.taHero strong{font-size:38px}}
  `}</style><div className="taShell">
    <header className="taTop"><div><small>H&amp;S HUB · TRAINING ACADEMY</small><h1>Risk Assessment Training</h1><p>Build, demonstrate and maintain practical risk-assessment competence.</p></div><div className="taTopActions"><Link className="taButton secondary" href="/portal">← Product Dashboard</Link><Link className="taButton secondary" href="/portal/health-safety">H&amp;S Hub</Link>{canAdministerTraining ? <Link className="taButton secondary" href="/portal/health-safety/training/admin">Administration</Link> : null}<Link className="taButton" href="/portal/health-safety/training/certificates">My certificates</Link></div></header>
    <section className="taHero"><div><h2>Scenario-led learning linked to safer workplace decisions</h2><p>Complete interactive exercises, receive immediate feedback and retain verified evidence of achievement.</p></div><strong>{averageProgress}%</strong></section>
    <section className="taMetrics"><div className="taMetric"><span>ACTIVE LEARNING</span><strong>{activeLearning.length}</strong><small>Courses requiring attention</small></div><div className="taMetric"><span>COURSES PASSED</span><strong>{passed.length}</strong><small>Completed successfully</small></div><div className="taMetric"><span>CERTIFICATES</span><strong>{certificates.length}</strong><small>Current learner records</small></div><div className="taMetric"><span>AVERAGE PROGRESS</span><strong>{averageProgress}%</strong><small>Across active learning</small></div></section>
    <section className="taSection"><div className="taSectionHead"><div><h2>Your courses</h2><p>Start, continue or review available risk-assessment learning.</p></div></div><div className="taCourses">{catalogue.map((item) => { const course = courseByCode.get(item.code); return <CourseCard item={item} course={course} enrolment={course ? enrolmentByCourse.get(course.id) : null} key={item.code}/>; })}</div></section>
    <section className="taSection"><div className="taSectionHead"><div><h2>Certificates</h2><p>Controlled evidence of completed learning and assessment results.</p></div></div>{certificates.length ? <div className="taCertificates">{certificates.map((certificate) => <div className="taCertificate" key={certificate.id}><div><strong>{certificate.course_title}</strong><small>{certificate.certificate_number}</small></div><div><strong>Issued</strong><small>{formatDate(certificate.issued_at)}</small></div><div><strong>Valid until</strong><small>{formatDate(certificate.valid_until)}</small></div><span className="taScore">{certificate.score_percent}%</span></div>)}</div> : <div className="taEmpty">Certificates will appear here after a course and its final assessment have been passed.</div>}</section>
    <aside className="taGuidance"><strong>Competence reminder</strong><p>Course completion supports knowledge and understanding. Employers must still consider the skills and experience required for the complexity and risk of the work.</p></aside>
  </div></main>;
}

