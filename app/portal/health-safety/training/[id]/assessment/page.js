import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { createAdminClient } from "../../../../../../lib/supabase/admin";
import { createClient } from "../../../../../../lib/supabase/server";

export const metadata = {
  title: "Training Assessment | RPG Excellence",
};

export const dynamic = "force-dynamic";

function addMonths(value, months) {
  if (!months) return null;
  const date = new Date(value);
  date.setUTCMonth(date.getUTCMonth() + months);
  return date.toISOString().slice(0, 10);
}

function learnerName(user) {
  return (
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.email ||
    "Learner"
  );
}

async function submitAssessment(formData) {
  "use server";

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/portal/login");

  const enrolmentId = String(formData.get("enrolment_id") || "").trim();
  if (!enrolmentId) throw new Error("Training enrolment is missing.");

  // Establish ownership through the signed-in learner before using the
  // service-role client for protected answer keys and controlled writes.
  const { data: ownedEnrolment, error: ownershipError } = await supabase
    .from("hs_training_enrolments")
    .select("id,learner_id,organization_id,course_id,status,completed_at")
    .eq("id", enrolmentId)
    .eq("learner_id", user.id)
    .maybeSingle();

  if (ownershipError || !ownedEnrolment) {
    throw new Error("Training enrolment was not found.");
  }

  if (ownedEnrolment.status === "passed") {
    redirect(`/portal/health-safety/training/${enrolmentId}/assessment?result=passed`);
  }

  if (!["assessment_due", "failed"].includes(ownedEnrolment.status)) {
    throw new Error("Complete every course module before taking the assessment.");
  }

  const admin = createAdminClient();
  const [courseResult, questionsResult, progressResult, attemptResult] = await Promise.all([
    admin
      .from("hs_training_courses")
      .select("id,title,version,pass_mark,validity_months")
      .eq("id", ownedEnrolment.course_id)
      .eq("active", true)
      .single(),
    admin
      .from("hs_training_questions")
      .select("id,question_code,points")
      .eq("course_id", ownedEnrolment.course_id)
      .eq("active", true)
      .order("display_order", { ascending: true }),
    admin
      .from("hs_training_module_progress")
      .select("module_id,status")
      .eq("enrolment_id", enrolmentId)
      .eq("learner_id", user.id),
    admin
      .from("hs_training_attempts")
      .select("attempt_number")
      .eq("enrolment_id", enrolmentId)
      .order("attempt_number", { ascending: false })
      .limit(1),
  ]);

  const firstError = courseResult.error || questionsResult.error || progressResult.error || attemptResult.error;
  if (firstError) throw new Error(firstError.message);

  const { count: moduleCount, error: moduleCountError } = await admin
    .from("hs_training_modules")
    .select("id", { count: "exact", head: true })
    .eq("course_id", ownedEnrolment.course_id)
    .eq("active", true);

  if (moduleCountError) throw new Error(moduleCountError.message);
  const completedCount = (progressResult.data || []).filter((item) => item.status === "completed").length;
  if (!moduleCount || completedCount < moduleCount) {
    throw new Error("Complete every course module before taking the assessment.");
  }

  const questions = questionsResult.data || [];
  if (!questions.length) throw new Error("No active assessment questions are available.");

  const { data: answerKeys, error: keyError } = await admin
    .from("hs_training_question_answers")
    .select("question_id,correct_answer,grading_rule")
    .in("question_id", questions.map((question) => question.id));

  if (keyError) throw new Error(keyError.message);
  const keyMap = new Map((answerKeys || []).map((item) => [item.question_id, item]));

  let awardedPoints = 0;
  let availablePoints = 0;
  const answers = questions.map((question) => {
    const selected = String(formData.get(`answer_${question.id}`) || "").trim();
    if (!selected) throw new Error("Answer every question before submitting.");
    const key = keyMap.get(question.id);
    if (!key) throw new Error("The assessment answer key is incomplete.");
    const correct = typeof key.correct_answer === "string"
      ? key.correct_answer
      : String(key.correct_answer ?? "");
    const points = Number(question.points) || 1;
    const isCorrect = selected === correct;
    availablePoints += points;
    if (isCorrect) awardedPoints += points;
    return {
      question_id: question.id,
      question_code: question.question_code,
      selected_answer: selected,
      is_correct: isCorrect,
      points_awarded: isCorrect ? points : 0,
      points_available: points,
    };
  });

  const score = availablePoints
    ? Math.round((awardedPoints / availablePoints) * 100)
    : 0;
  const passed = score >= courseResult.data.pass_mark;
  const attemptNumber = Number(attemptResult.data?.[0]?.attempt_number || 0) + 1;
  const now = new Date().toISOString();

  const { error: attemptInsertError } = await admin
    .from("hs_training_attempts")
    .insert({
      enrolment_id: enrolmentId,
      learner_id: user.id,
      attempt_number: attemptNumber,
      score_percent: score,
      passed,
      answers,
      grading_summary: {
        awarded_points: awardedPoints,
        available_points: availablePoints,
        pass_mark: courseResult.data.pass_mark,
      },
      submitted_at: now,
    });

  if (attemptInsertError) throw new Error(attemptInsertError.message);

  const { error: enrolmentUpdateError } = await admin
    .from("hs_training_enrolments")
    .update({
      status: passed ? "passed" : "failed",
      progress_percent: 100,
      completed_at: passed ? now : null,
      expires_at: passed ? addMonths(now, courseResult.data.validity_months) : null,
    })
    .eq("id", enrolmentId)
    .eq("learner_id", user.id);

  if (enrolmentUpdateError) throw new Error(enrolmentUpdateError.message);

  if (passed) {
    const certificateNumber = `RPG-RA-${now.slice(0, 4)}-${crypto.randomUUID().replaceAll("-", "").slice(0, 10).toUpperCase()}`;
    const { error: certificateError } = await admin
      .from("hs_training_certificates")
      .upsert({
        enrolment_id: enrolmentId,
        learner_id: user.id,
        organization_id: ownedEnrolment.organization_id,
        course_id: ownedEnrolment.course_id,
        certificate_number: certificateNumber,
        learner_name: learnerName(user),
        course_title: courseResult.data.title,
        course_version: courseResult.data.version,
        score_percent: score,
        issued_at: now,
        valid_until: addMonths(now, courseResult.data.validity_months),
      }, { onConflict: "enrolment_id", ignoreDuplicates: true });

    if (certificateError) throw new Error(certificateError.message);
  }

  revalidatePath(`/portal/health-safety/training/${enrolmentId}`);
  revalidatePath(`/portal/health-safety/training/${enrolmentId}/assessment`);
  revalidatePath("/portal/health-safety/training");
  redirect(`/portal/health-safety/training/${enrolmentId}/assessment?result=${passed ? "passed" : "failed"}&score=${score}`);
}

export default async function TrainingAssessmentPage({ params, searchParams }) {
  const { id } = await params;
  const query = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/portal/login?next=/portal/health-safety/training/${id}/assessment`);

  const { data: enrolment, error: enrolmentError } = await supabase
    .from("hs_training_enrolments")
    .select("id,learner_id,course_id,status,progress_percent,completed_at,expires_at")
    .eq("id", id)
    .eq("learner_id", user.id)
    .maybeSingle();

  if (enrolmentError) throw new Error(enrolmentError.message);
  if (!enrolment) notFound();
  if (!["assessment_due", "failed", "passed"].includes(enrolment.status)) {
    redirect(`/portal/health-safety/training/${id}`);
  }

  const [courseResult, questionsResult, attemptsResult, certificateResult] = await Promise.all([
    supabase
      .from("hs_training_courses")
      .select("id,title,description,pass_mark,version")
      .eq("id", enrolment.course_id)
      .eq("active", true)
      .single(),
    supabase
      .from("hs_training_questions")
      .select("id,question_code,question_text,question_type,options,points,display_order")
      .eq("course_id", enrolment.course_id)
      .eq("active", true)
      .order("display_order", { ascending: true }),
    supabase
      .from("hs_training_attempts")
      .select("id,attempt_number,score_percent,passed,submitted_at")
      .eq("enrolment_id", id)
      .eq("learner_id", user.id)
      .order("attempt_number", { ascending: false }),
    supabase
      .from("hs_training_certificates")
      .select("certificate_number,score_percent,issued_at,valid_until,verification_code")
      .eq("enrolment_id", id)
      .eq("learner_id", user.id)
      .maybeSingle(),
  ]);

  const firstError = courseResult.error || questionsResult.error || attemptsResult.error || certificateResult.error;
  if (firstError) throw new Error(firstError.message);

  const course = courseResult.data;
  const questions = questionsResult.data || [];
  const attempts = attemptsResult.data || [];
  const certificate = certificateResult.data;
  const passed = enrolment.status === "passed";
  const displayedScore = Number(query?.score ?? attempts[0]?.score_percent ?? certificate?.score_percent);

  return (
    <main className="taPage">
      <style>{`
        *{box-sizing:border-box}.taPage{min-height:100vh;background:#f3f7fa;padding:38px 20px 80px;font-family:Arial,sans-serif;color:#092746}.taWrap{max-width:980px;margin:auto}.taTop{display:flex;justify-content:space-between;gap:20px;align-items:flex-start;flex-wrap:wrap;margin-bottom:20px}.taTop small{color:#1762ef;font-weight:900;letter-spacing:.09em}.taTop h1{margin:7px 0;font-size:38px}.taTop p{margin:0;color:#60758a;line-height:1.55}.taLink{padding:11px 15px;border:1px solid #cbd9e5;border-radius:9px;background:#fff;color:#173d60;text-decoration:none;font-weight:850}.taIntro,.taResult,.taQuestion,.taHistory{background:#fff;border:1px solid #d7e3eb;border-radius:15px}.taIntro{padding:22px;margin-bottom:15px;display:flex;justify-content:space-between;gap:20px;align-items:center}.taIntro b{display:block;font-size:20px}.taIntro span{color:#63778c}.taMark{min-width:105px;padding:12px;border-radius:10px;background:#eaf2ff;color:#1459d9;text-align:center;font-weight:900}.taResult{padding:28px;margin-bottom:18px;border-left:7px solid #0a9b70}.taResult.fail{border-left-color:#d18a13}.taResult h2{font-size:30px;margin:0 0 7px}.taScore{font-size:56px;font-weight:950;color:#087c5e}.taResult.fail .taScore{color:#a76209}.taCertificate{margin-top:14px;padding:15px;border-radius:10px;background:#ecf8f3;color:#126044;line-height:1.6}.taForm{display:grid;gap:14px}.taQuestion{padding:22px}.taQuestion legend{width:100%;font-size:17px;font-weight:850;line-height:1.5;margin-bottom:14px}.taQuestion legend span{color:#1762ef;margin-right:8px}.taOptions{display:grid;gap:9px}.taOption{display:flex;gap:11px;align-items:flex-start;padding:12px;border:1px solid #d9e4ec;border-radius:9px;cursor:pointer}.taOption:hover{border-color:#6c9ee6;background:#f5f9ff}.taOption input{margin-top:3px}.taSubmit{padding:14px 18px;border:0;border-radius:10px;background:#087f6c;color:#fff;font-size:15px;font-weight:900;cursor:pointer}.taNote{padding:15px;border-radius:10px;background:#fff6dd;color:#6d5118;line-height:1.5}.taHistory{margin-top:20px;padding:20px}.taHistory h2{margin-top:0}.taHistory table{width:100%;border-collapse:collapse}.taHistory th,.taHistory td{padding:10px;border-bottom:1px solid #e3e9ee;text-align:left}.taPill{padding:5px 8px;border-radius:999px;background:#eef3f7;font-size:12px;font-weight:850}.taPill.pass{background:#e7f7f0;color:#087052}@media(max-width:620px){.taTop h1{font-size:30px}.taIntro{align-items:flex-start;flex-direction:column}.taHistory{overflow:auto}}
      `}</style>
      <div className="taWrap">
        <header className="taTop">
          <div>
            <small>RPG TRAINING ACADEMY · FINAL ASSESSMENT</small>
            <h1>{course.title}</h1>
            <p>Answer every question. A score of at least {course.pass_mark}% is required to pass.</p>
          </div>
          <Link className="taLink" href={`/portal/health-safety/training/${id}`}>← Course content</Link>
        </header>

        <section className="taIntro">
          <div><b>{questions.length} knowledge questions</b><span>Your answers are graded when you submit the complete assessment.</span></div>
          <div className="taMark">Pass mark<br/>{course.pass_mark}%</div>
        </section>

        {(query?.result || passed) && Number.isFinite(displayedScore) && (
          <section className={`taResult ${passed ? "" : "fail"}`}>
            <h2>{passed ? "Assessment passed" : "Further learning required"}</h2>
            <div className="taScore">{displayedScore}%</div>
            <p>{passed ? "You have demonstrated the required knowledge standard." : `The required pass mark is ${course.pass_mark}%. Review the course content before attempting the assessment again.`}</p>
            {certificate && (
              <div className="taCertificate">
                <strong>Certificate {certificate.certificate_number}</strong><br/>
                <Link href={`/portal/health-safety/training/${id}/certificate`}>
                  Open and print certificate →
                </Link><br/>
                Issued {new Date(certificate.issued_at).toLocaleDateString("en-GB")}
                {certificate.valid_until ? ` · valid until ${new Date(`${certificate.valid_until}T00:00:00Z`).toLocaleDateString("en-GB")}` : ""}
              </div>
            )}
          </section>
        )}

        {!passed && (
          <form className="taForm" action={submitAssessment}>
            <input type="hidden" name="enrolment_id" value={id}/>
            {questions.map((question, index) => (
              <fieldset className="taQuestion" key={question.id}>
                <legend><span>{String(index + 1).padStart(2, "0")}</span>{question.question_text}</legend>
                <div className="taOptions">
                  {(Array.isArray(question.options) ? question.options : []).map((option) => (
                    <label className="taOption" key={String(option)}>
                      <input type="radio" name={`answer_${question.id}`} value={String(option)} required/>
                      <span>{String(option)}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            ))}
            {!questions.length ? <div className="taNote">No active assessment questions are currently available.</div> : <button className="taSubmit" type="submit">Submit final assessment</button>}
          </form>
        )}

        {attempts.length > 0 && (
          <section className="taHistory">
            <h2>Assessment history</h2>
            <table>
              <thead><tr><th>Attempt</th><th>Submitted</th><th>Score</th><th>Outcome</th></tr></thead>
              <tbody>{attempts.map((attempt) => (
                <tr key={attempt.id}>
                  <td>{attempt.attempt_number}</td>
                  <td>{attempt.submitted_at ? new Date(attempt.submitted_at).toLocaleString("en-GB") : "—"}</td>
                  <td>{attempt.score_percent}%</td>
                  <td><span className={`taPill ${attempt.passed ? "pass" : ""}`}>{attempt.passed ? "Passed" : "Not passed"}</span></td>
                </tr>
              ))}</tbody>
            </table>
          </section>
        )}
      </div>
    </main>
  );
}
