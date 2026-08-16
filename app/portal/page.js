import { redirect } from "next/navigation";
import { createClient } from "../../lib/supabase/server";
import { createOrganization } from "./actions";
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

const { data: organizations } = await supabase
  .from("organizations")
  .select("*")
  .eq("owner_id", user.id)
  .order("created_at", { ascending: true });

const organization = organizations?.[0] ?? null;

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
{organization && (
  <div
    style={{
      marginTop: "12px",
      marginBottom: "24px",
      color: "#617087"
    }}
  >
    <strong style={{ color: "#071A33" }}>
      {organization.name}
    </strong>

    {organization.industry && (
      <span> · {organization.industry}</span>
    )}

    {organization.country && (
      <span> · {organization.country}</span>
    )}
  </div>
)}
{!organization && (
  <form
    action={createOrganization}
    style={{
      background: "white",
      padding: "24px",
      borderRadius: "12px",
      marginTop: "24px",
      marginBottom: "30px",
      display: "grid",
      gap: "14px",
      maxWidth: "600px",
    }}
  >
    <h2>Create your organization</h2>

    <input
      name="name"
      type="text"
      placeholder="Organization name"
      required
    />

    <input
      name="industry"
      type="text"
      placeholder="Industry"
    />

    <input
      name="country"
      type="text"
      placeholder="Country"
    />

    <input
      name="employees"
      type="number"
      placeholder="Number of employees"
      min="1"
    />

    <button
      type="submit"
      style={{
        padding: "12px",
        background: "#1459D9",
        color: "white",
        border: "none",
        borderRadius: "8px",
        cursor: "pointer",
      }}
    >
      Save Organization
    </button>
  </form>
)}

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
