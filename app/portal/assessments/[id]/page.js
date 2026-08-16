import { redirect } from "next/navigation";
import { createClient } from "../../../../lib/supabase/server";

export default async function AssessmentPage({ params }) {
  const { id } = await params;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/portal/login");
  }

  const { data: assessment, error } = await supabase
    .from("assessments")
    .select("*")
    .eq("id", id)
    .eq("owner_id", user.id)
    .single();

  if (error || !assessment) {
    redirect("/portal");
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f3f6f9",
        padding: "40px",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: "900px",
          margin: "0 auto",
        }}
      >
        <p
          style={{
            color: "#1459D9",
            fontWeight: 700,
          }}
        >
          RPG Intelligence
        </p>

        <h1>{assessment.standard} Assessment</h1>

        <p>
          Status: <strong>{assessment.status}</strong>
        </p>

        <div
          style={{
            marginTop: "30px",
            background: "white",
            padding: "30px",
            borderRadius: "14px",
          }}
        >
          <h2>Assessment workspace</h2>

          <p>Your assessment has been created successfully.</p>

          <p>
            Next we will add the ISO clauses, questions, evidence and scoring
            engine here.
          </p>
        </div>
      </div>
    </main>
  );
}
