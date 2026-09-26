import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "../../../lib/supabase/server";
import { updatePassword } from "./actions";

export const metadata = {
  title: "Set a new password | RPG Excellence",
};

export default async function UpdatePasswordPage({ searchParams }) {
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(
      "/portal/login?error=Open the secure password-reset link from your email first."
    );
  }

  return (
    <main className="passwordPage">
      <style>{styles}</style>
      <section className="passwordCard">
        <Link href="/">RPG Excellence</Link>
        <span>SECURE ACCOUNT RECOVERY</span>
        <h1>Choose a new password</h1>
        <p>
          Set a new password for <b>{user.email}</b>. Your company
          administrator cannot see or retrieve it.
        </p>
        {params?.error && (
          <div className="passwordError" role="alert">
            {params.error}
          </div>
        )}
        <form action={updatePassword}>
          <label>
            New password
            <input
              type="password"
              name="password"
              minLength="8"
              autoComplete="new-password"
              required
            />
          </label>
          <label>
            Confirm new password
            <input
              type="password"
              name="password_confirmation"
              minLength="8"
              autoComplete="new-password"
              required
            />
          </label>
          <button>Save new password →</button>
        </form>
        <small>
          Recovery links are personal and time-limited. Never forward the
          recovery email.
        </small>
      </section>
    </main>
  );
}

const styles = `*{box-sizing:border-box}.passwordPage{min-height:100vh;display:grid;place-items:center;padding:24px;background:radial-gradient(circle at 12% 10%,#dceaff,transparent 34%),linear-gradient(145deg,#eef4fa,#f8fafc);color:#08294f;font-family:Arial,sans-serif}.passwordCard{width:min(520px,100%);padding:36px;border:1px solid #d1dfeb;border-radius:20px;background:#fff;box-shadow:0 24px 65px #12395f1f}.passwordCard>a{display:inline-block;margin-bottom:34px;color:#08294f;text-decoration:none;font-weight:950}.passwordCard>span{display:block;color:#315fe6;font-size:10px;font-weight:950;letter-spacing:.14em}.passwordCard h1{margin:9px 0 10px;font-size:36px}.passwordCard>p{color:#60758a;line-height:1.55}.passwordCard form{display:grid;gap:15px;margin-top:23px}.passwordCard label{display:grid;gap:7px;font-size:12px;font-weight:850}.passwordCard input{width:100%;padding:14px;border:1px solid #bdccda;border-radius:9px;font:inherit}.passwordCard input:focus{border-color:#315fe6;outline:3px solid #315fe620}.passwordCard button{min-height:50px;border:0;border-radius:9px;background:#315fe6;color:#fff;font-weight:900;cursor:pointer}.passwordCard>small{display:block;margin-top:18px;color:#7c8d9e;line-height:1.5;text-align:center}.passwordError{margin-top:15px;padding:12px;border:1px solid #e8a49d;border-radius:8px;background:#fff0ee;color:#922f26;font-size:12px}`;
