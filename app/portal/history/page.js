import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "../../lib/supabase/server";

export const metadata = {
  title: "Assessment History",
};

export default async function HistoryPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/portal/login");
  }

  const { data: organisations } = await supabase
    .from("organizations")
    .select("id")
    .eq("owner_id", user.id);

  const ids = (organisations ?? []).map((o) => o.id);

  const { data: assessments } = await supabase
    .from("assessments")
    .select("*")
    .in("organization_id", ids)
    .order("created_at", {
      ascending: false,
    });

  return (
    <main
      style={{
        maxWidth: 1100,
        margin: "50px auto",
        padding: 20,
      }}
    >
      <h1>Assessment History</h1>

      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
        }}
      >
        <thead>
          <tr>
            <th align="left">Standard</th>
            <th align="left">Status</th>
            <th align="left">Created</th>
            <th align="left"></th>
          </tr>
        </thead>

        <tbody>
          {(assessments ?? []).map((assessment) => (
            <tr key={assessment.id}>
              <td>{assessment.standard}</td>

              <td>{assessment.status}</td>

              <td>
                {new Date(
                  assessment.created_at
                ).toLocaleDateString()}
              </td>

              <td>
                {assessment.status ===
                "completed" ? (
                  <Link
                    href={`/portal/assessments/${assessment.id}/summary`}
                  >
                    View Report
                  </Link>
                ) : (
                  <Link
                    href={`/portal/assessments/${assessment.id}`}
                  >
                    Continue
                  </Link>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
