import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import RiskAssessmentTrainingPlayer from "../../../../../components/RiskAssessmentTrainingPlayer";
import { createClient } from "../../../../../lib/supabase/server";

export const metadata = {
  title: "Risk Assessment Training | RPG Excellence",
};

export const dynamic = "force-dynamic";

function cleanReflection(value) {
  if (
    typeof value !== "string" ||
    value.trim() === ""
  ) {
    return null;
  }

  return value.trim();
}

async function loadTrainingRecord(
  supabase,
  userId,
  enrolmentId
) {
  const {
    data: enrolment,
    error: enrolmentError,
  } = await supabase
    .from("hs_training_enrolments")
    .select(
      `
        id,
        learner_id,
        organization_id,
        course_id,
        status,
        progress_percent,
        started_at,
        completed_at,
        expires_at,
        created_at,
        updated_at
      `
    )
    .eq("id", enrolmentId)
    .eq("learner_id", userId)
    .maybeSingle();

  if (enrolmentError) {
    throw new Error(
      enrolmentError.message
    );
  }

  if (!enrolment) {
    return null;
  }

  const [
    courseResult,
    modulesResult,
    progressResult,
  ] = await Promise.all([
    supabase
      .from("hs_training_courses")
      .select(
        `
          id,
          course_code,
          title,
          course_type,
          description,
          duration_minutes,
          pass_mark,
          validity_months,
          version,
          active
        `
      )
      .eq(
        "id",
        enrolment.course_id
      )
      .eq("active", true)
      .maybeSingle(),

    supabase
      .from("hs_training_modules")
      .select(
        `
          id,
          course_id,
          module_number,
          title,
          learning_objective,
          module_type,
          content,
          estimated_minutes,
          active
        `
      )
      .eq(
        "course_id",
        enrolment.course_id
      )
      .eq("active", true)
      .order("module_number", {
        ascending: true,
      }),

    supabase
      .from(
        "hs_training_module_progress"
      )
      .select(
        `
          id,
          enrolment_id,
          learner_id,
          module_id,
          status,
          response_data,
          started_at,
          completed_at
        `
      )
      .eq(
        "enrolment_id",
        enrolment.id
      )
      .eq(
        "learner_id",
        userId
      ),
  ]);

  if (courseResult.error) {
    throw new Error(
      courseResult.error.message
    );
  }

  if (modulesResult.error) {
    throw new Error(
      modulesResult.error.message
    );
  }

  if (progressResult.error) {
    throw new Error(
      progressResult.error.message
    );
  }

  if (!courseResult.data) {
    return null;
  }

  return {
    enrolment,
    course:
      courseResult.data,
    modules:
      modulesResult.data ?? [],
    progress:
      progressResult.data ?? [],
  };
}

async function completeModuleAction(
  formData
) {
  "use server";

  const supabase =
    await createClient();

  const {
    data: { user },
  } =
    await supabase.auth.getUser();

  if (!user) {
    redirect("/portal/login");
  }

  const enrolmentId =
    String(
      formData.get(
        "enrolment_id"
      ) ?? ""
    ).trim();

  const moduleId =
    String(
      formData.get(
        "module_id"
      ) ?? ""
    ).trim();

  const learnerReflection =
    cleanReflection(
      formData.get(
        "learner_reflection"
      )
    );

  if (
    !enrolmentId ||
    !moduleId
  ) {
    throw new Error(
      "Training module information is incomplete."
    );
  }

  const {
    data: enrolment,
    error: enrolmentError,
  } = await supabase
    .from(
      "hs_training_enrolments"
    )
    .select(
      `
        id,
        learner_id,
        course_id,
        status,
        started_at
      `
    )
    .eq("id", enrolmentId)
    .eq(
      "learner_id",
      user.id
    )
    .single();

  if (
    enrolmentError ||
    !enrolment
  ) {
    throw new Error(
      "Training enrolment not found."
    );
  }

  if (
    [
      "passed",
      "expired",
      "withdrawn",
    ].includes(
      enrolment.status
    )
  ) {
    throw new Error(
      "This enrolment cannot be updated."
    );
  }

  const {
    data: module,
    error: moduleError,
  } = await supabase
    .from(
      "hs_training_modules"
    )
    .select(
      `
        id,
        course_id,
        module_number,
        title,
        module_type,
        content,
        active
      `
    )
    .eq("id", moduleId)
    .eq(
      "course_id",
      enrolment.course_id
    )
    .eq("active", true)
    .single();

  if (
    moduleError ||
    !module
  ) {
    throw new Error(
      "Training module not found."
    );
  }

  const {
    data: earlierModules,
    error: earlierModulesError,
  } = await supabase
    .from("hs_training_modules")
    .select("id")
    .eq(
      "course_id",
      enrolment.course_id
    )
    .eq("active", true)
    .lt(
      "module_number",
      module.module_number
    );

  if (earlierModulesError) {
    throw new Error(
      earlierModulesError.message
    );
  }

  if (
    earlierModules &&
    earlierModules.length > 0
  ) {
    const earlierModuleIds =
      earlierModules.map(
        (item) => item.id
      );

    const {
      data:
        earlierProgress,
      error:
        earlierProgressError,
    } = await supabase
      .from(
        "hs_training_module_progress"
      )
      .select("module_id")
      .eq(
        "enrolment_id",
        enrolment.id
      )
      .eq(
        "learner_id",
        user.id
      )
      .eq(
        "status",
        "completed"
      )
      .in(
        "module_id",
        earlierModuleIds
      );

    if (earlierProgressError) {
      throw new Error(
        earlierProgressError.message
      );
    }

    const completedEarlier =
      new Set(
        (
          earlierProgress ??
          []
        ).map(
          (item) =>
            item.module_id
        )
      );

    const sequenceComplete =
      earlierModuleIds.every(
        (id) =>
          completedEarlier.has(
            id
          )
      );

    if (!sequenceComplete) {
      throw new Error(
        "Complete the preceding training modules before continuing."
      );
    }
  }

  const content =
    module.content ?? {};

  const requiresReflection =
    Boolean(
      content.interaction ||
        content.reflection
    );

  if (
    requiresReflection &&
    !learnerReflection
  ) {
    throw new Error(
      "Complete the module reflection or interactive challenge before continuing."
    );
  }

  const now =
    new Date().toISOString();

  const responseData = {
    learner_reflection:
      learnerReflection,
    completed_module_number:
      module.module_number,
    completed_module_title:
      module.title,
    completed_module_type:
      module.module_type,
  };

  const {
    error: progressSaveError,
  } = await supabase
    .from(
      "hs_training_module_progress"
    )
    .upsert(
      {
        enrolment_id:
          enrolment.id,
        learner_id:
          user.id,
        module_id:
          module.id,
        status:
          "completed",
        response_data:
          responseData,
        started_at:
          now,
        completed_at:
          now,
      },
      {
        onConflict:
          "enrolment_id,module_id",
      }
    );

  if (progressSaveError) {
    throw new Error(
      progressSaveError.message
    );
  }

  const [
    moduleCountResult,
    completedCountResult,
  ] = await Promise.all([
    supabase
      .from(
        "hs_training_modules"
      )
      .select(
        "id",
        {
          count: "exact",
          head: true,
        }
      )
      .eq(
        "course_id",
        enrolment.course_id
      )
      .eq("active", true),

    supabase
      .from(
        "hs_training_module_progress"
      )
      .select(
        `
          module_id,
          hs_training_modules!inner(
            course_id,
            active
          )
        `,
        {
          count: "exact",
          head: true,
        }
      )
      .eq(
        "enrolment_id",
        enrolment.id
      )
      .eq(
        "learner_id",
        user.id
      )
      .eq(
        "status",
        "completed"
      )
      .eq(
        "hs_training_modules.course_id",
        enrolment.course_id
      )
      .eq(
        "hs_training_modules.active",
        true
      ),
  ]);

  if (moduleCountResult.error) {
    throw new Error(
      moduleCountResult.error.message
    );
  }

  if (
    completedCountResult.error
  ) {
    throw new Error(
      completedCountResult.error.message
    );
  }

  const totalModules =
    moduleCountResult.count ?? 0;

  const completedModules =
    completedCountResult.count ?? 0;

  const progressPercent =
    totalModules > 0
      ? Math.min(
          100,
          Math.round(
            (
              completedModules /
              totalModules
            ) *
              100
          )
        )
      : 0;

  const allModulesComplete =
    totalModules > 0 &&
    completedModules >=
      totalModules;

  const nextStatus =
    allModulesComplete
      ? "assessment_due"
      : "in_progress";

  const {
    error:
      enrolmentUpdateError,
  } = await supabase
    .from(
      "hs_training_enrolments"
    )
    .update({
      status:
        nextStatus,
      progress_percent:
        progressPercent,
      started_at:
        enrolment.started_at ??
        now,
    })
    .eq(
      "id",
      enrolment.id
    )
    .eq(
      "learner_id",
      user.id
    );

  if (
    enrolmentUpdateError
  ) {
    throw new Error(
      enrolmentUpdateError.message
    );
  }

  revalidatePath(
    `/portal/health-safety/training/${enrolment.id}`
  );

  revalidatePath(
    "/portal/health-safety/training"
  );

  if (allModulesComplete) {
    redirect(
      `/portal/health-safety/training/${enrolment.id}/assessment`
    );
  }
}

export default async function RiskAssessmentTrainingCoursePage({
  params,
}) {
  const { id } =
    await params;

  const supabase =
    await createClient();

  const {
    data: { user },
  } =
    await supabase.auth.getUser();

  if (!user) {
    redirect(
      `/portal/login?next=/portal/health-safety/training/${id}`
    );
  }

  const record =
    await loadTrainingRecord(
      supabase,
      user.id,
      id
    );

  if (!record) {
    notFound();
  }

  const {
    enrolment,
    course,
    modules,
    progress,
  } = record;

  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "linear-gradient(135deg, #eaf3fb, #f8fafc)",
        padding:
          "34px 22px 90px",
        fontFamily:
          "Arial, sans-serif",
        color: "#071d3a",
      }}
    >
      <div
        style={{
          maxWidth:
            "1280px",
          margin: "0 auto",
        }}
      >
        <header
          style={{
            display: "flex",
            justifyContent:
              "space-between",
            gap: "20px",
            alignItems:
              "flex-start",
            flexWrap: "wrap",
            marginBottom:
              "24px",
          }}
        >
          <div>
            <div
              style={{
                color:
                  "#087f6c",
                fontSize:
                  "12px",
                fontWeight:
                  900,
                letterSpacing:
                  ".1em",
                marginBottom:
                  "7px",
              }}
            >
              H&amp;S HUB · TRAINING
            </div>

            <h1
              style={{
                margin:
                  "0 0 7px",
                fontSize:
                  "34px",
              }}
            >
              {course.title}
            </h1>

            <p
              style={{
                margin: 0,
                color:
                  "#657b93",
              }}
            >
              {course.description}
            </p>
          </div>

          <div
            style={{
              display: "flex",
              gap: "9px",
              flexWrap:
                "wrap",
            }}
          >
            <Link
              href="/portal/health-safety/training"
              style={{
                padding:
                  "11px 15px",
                border:
                  "1px solid #ccd9e4",
                borderRadius:
                  "9px",
                background:
                  "#ffffff",
                color:
                  "#173b59",
                textDecoration:
                  "none",
                fontWeight:
                  850,
              }}
            >
              ← Training Academy
            </Link>

            <Link
              href="/portal/health-safety"
              style={{
                padding:
                  "11px 15px",
                borderRadius:
                  "9px",
                background:
                  "#087f6c",
                color:
                  "#ffffff",
                textDecoration:
                  "none",
                fontWeight:
                  850,
              }}
            >
              H&amp;S Hub
            </Link>
          </div>
        </header>

        {modules.length === 0 ? (
          <section
            style={{
              padding:
                "28px",
              border:
                "1px solid #d6e2ea",
              borderRadius:
                "15px",
              background:
                "#ffffff",
              color:
                "#617087",
            }}
          >
            Course content is not
            currently available.
          </section>
        ) : (
          <RiskAssessmentTrainingPlayer
            enrolment={
              enrolment
            }
            course={course}
            modules={modules}
            progress={progress}
            completeModuleAction={
              completeModuleAction
            }
          />
        )}

        <aside
          style={{
            marginTop:
              "18px",
            padding:
              "17px 20px",
            borderLeft:
              "5px solid #e6a71d",
            borderRadius:
              "10px",
            background:
              "#fff8e7",
            color:
              "#664b13",

