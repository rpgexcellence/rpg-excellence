import { redirect } from "next/navigation";
import { createClient } from "../../lib/supabase/server";

export const metadata = {
  title: "RPG Intelligence Dashboard",
};

export default async function PortalPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/portal/login");
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f3f6f9",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <header
        style={{
          background: "#071A33",
          color: "white",
          padding: "20px 30px",
        }}
      >
        <h2>RPG Intelligence</h2>
        <p>{user.email}</p>
<form action="/auth/signout" method="post">
  <button
    type="submit"
    style={{
      marginTop: "15px",
      padding: "10px 18px",
      background: "#d32f2f",
      color: "white",
      border: "none",
      borderRadius: "6px",
      cursor: "pointer"
    }}
  >
    Sign Out
  </button>
</form>









        
      </header>

      <section
        style={{
          padding: "40px",
        }}
      >
        <h1>Dashboard</h1>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
            gap: "20px",
            marginTop: "30px",
          }}
        >
          <div
            style={{
              background: "white",
              padding: "20px",
              borderRadius: "12px",
            }}
          >
            <h3>Business Assurance Score</h3>
            <h2>--</h2>
          </div>

          <div
            style={{
              background: "white",
              padding: "20px",
              borderRadius: "12px",
            }}
          >
            <h3>Assessments</h3>
            <h2>0</h2>
          </div>

          <div
            style={{
              background: "white",
              padding: "20px",
              borderRadius: "12px",
            }}
          >
            <h3>Reports</h3>
            <h2>0</h2>
          </div>

          <div
            style={{
              background: "white",
              padding: "20px",
              borderRadius: "12px",
            }}
          >
            <h3>Actions</h3>
            <h2>0</h2>
          </div>
        </div>
      </section>
    </main>
  );
}
