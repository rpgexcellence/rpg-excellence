import { signIn, signUp } from "./actions";

export const metadata = {
  title: "RPG Intelligence Login",
};

export default function LoginPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        background: "#071A33",
        padding: "2rem",
      }}
    >
      <div
        style={{
          background: "#fff",
          padding: "2rem",
          borderRadius: "16px",
          width: "100%",
          maxWidth: "420px",
        }}
      >
        <h1>RPG Intelligence</h1>
        <p>AI-Powered Business Assurance</p>

        <form style={{ display: "grid", gap: "1rem" }}>
          <input
            type="email"
            name="email"
            placeholder="Email"
            required
          />

          <input
            type="password"
            name="password"
            placeholder="Password"
            required
          />

          <button
            formAction={signIn}
            style={{
              padding: "12px",
              background: "#1459D9",
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
            }}
          >
            Sign In
          </button>

          <button
            formAction={signUp}
            style={{
              padding: "12px",
              background: "#D6A539",
              color: "#071A33",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
            }}
          >
            Create Account
          </button>
        </form>
      </div>
    </main>
  );
}
