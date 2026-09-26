import Link from "next/link";
import { requestPasswordReset } from "../login/actions";

export const metadata = {
  title: "Reset password | RPG Intelligence",
  description: "Request secure password recovery for RPG Intelligence.",
};

const safeNext = (value) => {
  const next = String(value || "");
  return next.startsWith("/") && !next.startsWith("//")
    ? next
    : "/portal";
};

export default async function ForgotPasswordPage({ searchParams }) {
  const params = await searchParams;
  const next = safeNext(params?.next);
  const error = String(params?.error || "");

  return (
    <main className="recoveryPage">
      <style>{styles}</style>
      <section className="recoveryCard">
        <Link className="backLink" href={`/portal/login?next=${encodeURIComponent(next)}`}>
          ← Return to secure sign in
        </Link>
        <div className="lock" aria-hidden="true">🔐</div>
        <div className="eyebrow">SECURE ACCOUNT RECOVERY</div>
        <h1>Reset your password</h1>
        <p>
          Enter the email address registered to your RPG Intelligence account.
          We will send a secure, single-use recovery link.
        </p>

        {error && <div className="error" role="alert">{error}</div>}

        <form action={requestPasswordReset}>
          <input type="hidden" name="next" value={next} />
          <label>
            Work email address
            <input
              type="email"
              name="email"
              placeholder="you@company.com"
              autoComplete="email"
              required
              autoFocus
            />
          </label>
          <button type="submit">Send secure reset link →</button>
        </form>

        <div className="notice">
          For security, RPG administrators cannot view or manually assign your
          password.
        </div>
      </section>
    </main>
  );
}

const styles = `
*{box-sizing:border-box}
.recoveryPage{min-height:100vh;display:grid;place-items:center;padding:32px;background:radial-gradient(circle at 15% 10%,#dce9ff 0,transparent 30%),linear-gradient(145deg,#f8fafc,#edf3fa);color:#0a2342;font-family:Arial,sans-serif}
.recoveryCard{width:min(100%,520px);padding:42px;border:1px solid #d8e2ec;border-radius:18px;background:rgba(255,255,255,.96);box-shadow:0 24px 70px rgba(22,45,76,.14)}
.backLink{display:inline-block;margin-bottom:28px;color:#315b86;text-decoration:none;font-size:13px;font-weight:800}
.backLink:hover{text-decoration:underline}
.lock{display:grid;width:52px;height:52px;place-items:center;margin-bottom:20px;border-radius:14px;background:#e9efff;font-size:23px}
.eyebrow{color:#315fe6;font-size:11px;font-weight:950;letter-spacing:.14em}
h1{margin:9px 0 12px;font-size:38px;line-height:1.08;letter-spacing:-.035em}
p{margin:0 0 26px;color:#60758a;font-size:15px;line-height:1.6}
.error{margin-bottom:18px;padding:12px 14px;border:1px solid #efb4ad;border-radius:9px;background:#fff0ee;color:#9e281e;font-size:13px}
form{display:grid;gap:17px}
label{display:grid;gap:8px;font-size:12px;font-weight:850}
input{width:100%;padding:15px;border:1px solid #bdccda;border-radius:9px;background:#fff;color:#0c294a;font:inherit;outline:none}
input:focus{border-color:#315fe6;box-shadow:0 0 0 3px rgba(49,95,230,.12)}
button{min-height:50px;border:1px solid #315fe6;border-radius:9px;background:#315fe6;color:#fff;font-size:14px;font-weight:900;cursor:pointer;box-shadow:0 9px 24px rgba(49,95,230,.2)}
button:hover{background:#214ecb}
.notice{margin-top:22px;padding-top:18px;border-top:1px solid #e2e8ef;color:#718397;font-size:11px;line-height:1.55}
@media(max-width:560px){.recoveryPage{padding:18px}.recoveryCard{padding:30px 24px}h1{font-size:32px}}
`;
