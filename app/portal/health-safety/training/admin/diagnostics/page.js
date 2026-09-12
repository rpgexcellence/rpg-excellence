import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "../../../../../../lib/supabase/server";
import { createAdminClient } from "../../../../../../lib/supabase/admin";

export const metadata = { title: "Training Readiness | RPG Excellence" };
export const dynamic = "force-dynamic";

function Check({ title, ready, detail }) {
  return (
    <article className={ready ? "trdCheck ready" : "trdCheck action"}>
      <span>{ready ? "READY" : "ACTION REQUIRED"}</span>
      <h2>{title}</h2>
      <p>{detail}</p>
    </article>
  );
}

export default async function TrainingDiagnosticsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/portal/login?next=/portal/health-safety/training/admin/diagnostics");

  const admin = createAdminClient();
  const { data: access, error: accessError } = await admin
    .from("portal_admins")
    .select("user_id")
    .eq("user_id", user.id)
    .eq("active", true)
    .eq("role", "admin")
    .maybeSingle();

  if (accessError || !access) redirect("/portal/health-safety/training");

  const [coursesResult, modulesResult, questionsResult, answersResult] = await Promise.all([
    admin.from("hs_training_courses").select("id,course_code,title,active,published_at,price_pence,currency,pass_mark,validity_months").order("course_code"),
    admin.from("hs_training_modules").select("id,course_id,active"),
    admin.from("hs_training_questions").select("id,course_id,active"),
    admin.from("hs_training_question_answers").select("question_id"),
  ]);

  const queryResults = [coursesResult, modulesResult, questionsResult, answersResult];
  const databaseReachable = queryResults.every((result) => !result.error);
  const courses = coursesResult.data || [];
  const modules = modulesResult.data || [];
  const questions = questionsResult.data || [];
  const answers = answersResult.data || [];
  const requiredCodes = ["RA-INITIAL-001", "RA-REFRESHER-001"];
  const requiredCourses = requiredCodes.map((code) => courses.find((course) => course.course_code === code));
  const activeCoursesReady = requiredCourses.every((course) =>
    course?.active && course?.published_at && course.price_pence >= 0 && course.currency === "gbp"
  );
  const answerIds = new Set(answers.map((answer) => answer.question_id));
  const activeQuestions = questions.filter((question) => question.active);
  const unansweredQuestions = activeQuestions.filter((question) => !answerIds.has(question.id));
  const contentReady = requiredCourses.every((course) =>
    course && modules.some((module) => module.course_id === course.id && module.active)
  ) && activeQuestions.length > 0;
  const answersReady = activeQuestions.length > 0 && unansweredQuestions.length === 0;
  const stripeSecretReady = Boolean(process.env.STRIPE_SECRET_KEY);
  const stripeWebhookReady = Boolean(process.env.STRIPE_WEBHOOK_SECRET);
  const siteUrlReady = Boolean(process.env.NEXT_PUBLIC_SITE_URL);

  const checks = [
    {
      title: "Training database",
      ready: databaseReachable,
      detail: databaseReachable
        ? "All required training tables responded successfully."
        : "One or more training tables could not be read. Confirm the foundation and content migrations have been applied.",
    },
    {
      title: "Published courses",
      ready: activeCoursesReady,
      detail: activeCoursesReady
        ? "Initial and refresher courses are active, published and priced in GBP."
        : "Both required course codes must be active, published and have valid GBP prices.",
    },
    {
      title: "Learning content",
      ready: contentReady,
      detail: contentReady
        ? `${modules.filter((item) => item.active).length} active modules and ${activeQuestions.length} active assessment questions are available.`
        : "Each required course needs active modules and the assessment bank must contain active questions.",
    },
    {
      title: "Secure answer key",
      ready: answersReady,
      detail: answersReady
        ? "Every active assessment question has a server-side answer record."
        : `${unansweredQuestions.length} active question(s) do not have a corresponding answer record.`,
    },
    {
      title: "Stripe server connection",
      ready: stripeSecretReady,
      detail: stripeSecretReady
        ? "The Stripe secret key is configured on the server."
        : "Add STRIPE_SECRET_KEY to the production environment.",
    },
    {
      title: "Stripe webhook verification",
      ready: stripeWebhookReady,
      detail: stripeWebhookReady
        ? "The webhook signing secret is configured."
        : "Add STRIPE_WEBHOOK_SECRET and configure Stripe to call /api/stripe/webhook.",
    },
    {
      title: "Production return URL",
      ready: siteUrlReady,
      detail: siteUrlReady
        ? "NEXT_PUBLIC_SITE_URL is configured for checkout return links and certificate verification."
        : "Add NEXT_PUBLIC_SITE_URL using the public HTTPS origin of the deployed site.",
    },
  ];

  const readyCount = checks.filter((check) => check.ready).length;
  const launchReady = readyCount === checks.length;

  return (
    <main className="trdPage">
      <style>{`
        *{box-sizing:border-box}.trdPage{min-height:100vh;padding:34px 22px 80px;background:linear-gradient(135deg,#eaf3fb,#f8fafc);color:#071d3a;font-family:Arial,sans-serif}.trdShell{max-width:1180px;margin:auto}.trdTop{display:flex;justify-content:space-between;gap:20px;align-items:flex-start;flex-wrap:wrap}.trdTop small{color:#087f6c;font-weight:900;letter-spacing:.11em}.trdTop h1{font-size:34px;margin:7px 0}.trdTop p{margin:0;color:#657b94}.trdActions{display:flex;gap:9px;flex-wrap:wrap}.trdButton{display:inline-flex;padding:12px 16px;border-radius:9px;background:#1762ef;color:#fff;font-weight:850}.trdButton.secondary{background:#fff;color:#12385f;border:1px solid #cbd8e8}.trdSummary{margin:25px 0 17px;padding:27px;border-radius:18px;background:${launchReady ? "#087768" : "#8a5a08"};color:#fff;display:flex;justify-content:space-between;align-items:center;gap:20px}.trdSummary span{font-size:12px;font-weight:900;letter-spacing:.08em}.trdSummary h2{margin:7px 0 0;font-size:25px}.trdSummary strong{font-size:46px;white-space:nowrap}.trdGrid{display:grid;grid-template-columns:1fr 1fr;gap:14px}.trdCheck{padding:21px;border:1px solid #d8e4ef;border-radius:15px;background:#fff}.trdCheck span{display:inline-flex;padding:6px 9px;border-radius:999px;font-size:10px;font-weight:950;letter-spacing:.05em}.trdCheck.ready span{background:#e4f7ef;color:#08775d}.trdCheck.action{border-color:#efd49d}.trdCheck.action span{background:#fff1d5;color:#8a5700}.trdCheck h2{font-size:18px;margin:14px 0 7px}.trdCheck p{margin:0;color:#667b91;line-height:1.55}.trdNote{margin-top:17px;padding:20px 22px;border-left:5px solid #1762ef;border-radius:10px;background:#fff;color:#526b85;line-height:1.55}.trdNote strong{display:block;color:#173b64;margin-bottom:5px}@media(max-width:720px){.trdGrid{grid-template-columns:1fr}.trdSummary{align-items:flex-start}.trdSummary strong{font-size:36px}}
      `}</style>
      <div className="trdShell">
        <header className="trdTop">
          <div>
            <small>H&amp;S HUB · ADMIN DIAGNOSTICS</small>
            <h1>Training Launch Readiness</h1>
            <p>Server-side preflight checks for course content, payment and certification dependencies.</p>
          </div>
          <div className="trdActions">
            <Link className="trdButton secondary" href="/portal/health-safety/training/admin">Administration</Link>
            <Link className="trdButton" href="/portal/health-safety/training">Training Academy</Link>
          </div>
        </header>

        <section className="trdSummary">
          <div><span>OVERALL STATUS</span><h2>{launchReady ? "Ready for controlled transaction testing" : "Configuration actions remain"}</h2></div>
          <strong>{readyCount}/{checks.length}</strong>
        </section>

        <section className="trdGrid">
          {checks.map((check) => <Check key={check.title} {...check} />)}
        </section>

        <aside className="trdNote">
          <strong>This page does not expose credentials or perform a charge.</strong>
          When all checks are ready, complete one Stripe test-mode purchase and verify the resulting pass, enrolment, course completion, certificate download and public verification journey.
        </aside>
      </div>
    </main>
  );
}

