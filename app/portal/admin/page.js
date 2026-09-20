import Link from "next/link";
import { redirect } from "next/navigation";

import { createAdminClient } from "../../../lib/supabase/admin";
import { createClient } from "../../../lib/supabase/server";

export const metadata = {
  title: "Platform Administration | RPG Excellence",
};

export const dynamic = "force-dynamic";

const tools = [
  {
    group: "Diagnostics",
    title: "Training launch readiness",
    description:
      "Check course publication, modules, questions, answers, Stripe and site configuration.",
    href: "/portal/health-safety/training/admin/diagnostics",
    code: "7/7",
  },
  {
    group: "Training",
    title: "Training administration",
    description:
      "Review learner enrolments, progress, certificates, passes and training revenue.",
    href: "/portal/health-safety/training/admin",
    code: "TRN",
  },
  {
    group: "Documents",
    title: "Controlled documents",
    description:
      "Create, revise, supersede and withdraw controlled platform documents.",
    href: "/portal/documents/admin",
    code: "DOC",
  },
  {
    group: "Training",
    title: "Training academy",
    description:
      "Open the customer-facing academy and verify course availability and presentation.",
    href: "/portal/health-safety/training",
    code: "ACA",
  },
  {
    group: "Platform",
    title: "Customer portal",
    description:
      "Review the portal as an authenticated platform administrator.",
    href: "/portal",
    code: "PRT",
  },
  {
    group: "Platform",
    title: "Public pricing",
    description:
      "Check live plans, assessment passes, training products and purchase routes.",
    href: "/en/pricing",
    code: "£",
  },
];

function Check({ label, ready, detail }) {
  return (
    <article className={`pahCheck ${ready ? "ready" : "action"}`}>
      <span>{ready ? "READY" : "ACTION"}</span>
      <strong>{label}</strong>
      <small>{detail}</small>
    </article>
  );
}

export default async function PlatformAdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/portal/login?next=/portal/admin");
  }

  const admin = createAdminClient();
  const { data: access, error: accessError } = await admin
    .from("portal_admins")
    .select("role,active")
    .eq("user_id", user.id)
    .eq("active", true)
    .eq("role", "admin")
    .maybeSingle();

  if (accessError || !access) {
    redirect("/portal");
  }

  const [coursesResult, documentsResult, subscriptionsResult, enquiriesResult] =
    await Promise.all([
      admin
        .from("hs_training_courses")
        .select("id", { count: "exact", head: true }),
      admin
        .from("controlled_documents")
        .select("id", { count: "exact", head: true }),
      admin
        .from("subscriptions")
        .select("id", { count: "exact", head: true }),
      admin
        .from("contact_enquiries")
        .select("id", { count: "exact", head: true }),
    ]);

  const databaseReady = [
    coursesResult,
    documentsResult,
    subscriptionsResult,
    enquiriesResult,
  ].every((result) => !result.error);

  const checks = [
    {
      label: "Administrator access",
      ready: true,
      detail: user.email || "Authenticated administrator",
    },
    {
      label: "Supabase database",
      ready: databaseReady,
      detail: databaseReady
        ? "Core platform tables responded successfully."
        : "One or more core tables could not be read.",
    },
    {
      label: "Supabase service key",
      ready: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
      detail: process.env.SUPABASE_SERVICE_ROLE_KEY
        ? "Server-side administration is configured."
        : "SUPABASE_SERVICE_ROLE_KEY is missing.",
    },
    {
      label: "Stripe secret",
      ready: Boolean(process.env.STRIPE_SECRET_KEY),
      detail: process.env.STRIPE_SECRET_KEY
        ? "Server-side Stripe access is configured."
        : "STRIPE_SECRET_KEY is missing.",
    },
    {
      label: "Stripe webhook",
      ready: Boolean(process.env.STRIPE_WEBHOOK_SECRET),
      detail: process.env.STRIPE_WEBHOOK_SECRET
        ? "Webhook verification is configured."
        : "STRIPE_WEBHOOK_SECRET is missing.",
    },
    {
      label: "Public site URL",
      ready: Boolean(process.env.NEXT_PUBLIC_SITE_URL),
      detail:
        process.env.NEXT_PUBLIC_SITE_URL || "NEXT_PUBLIC_SITE_URL is missing.",
    },
  ];

  const readyCount = checks.filter((check) => check.ready).length;
  const metrics = [
    ["Training courses", coursesResult.count ?? "—"],
    ["Controlled documents", documentsResult.count ?? "—"],
    ["Subscriptions", subscriptionsResult.count ?? "—"],
    ["Contact enquiries", enquiriesResult.count ?? "—"],
  ];

  return (
    <main className="pahPage">
      <style>{`
        *{box-sizing:border-box}.pahPage{min-height:100vh;padding:36px 22px 84px;background:linear-gradient(145deg,#eaf3fb 0%,#f8fafc 48%,#eef8f5 100%);color:#08294f;font-family:Arial,sans-serif}.pahShell{max-width:1240px;margin:auto}.pahTop{display:flex;justify-content:space-between;align-items:flex-start;gap:24px;flex-wrap:wrap}.pahKicker{display:block;color:#087f6c;font-size:12px;font-weight:900;letter-spacing:.13em}.pahTop h1{margin:8px 0 7px;font-size:38px;line-height:1.08}.pahTop p{max-width:720px;margin:0;color:#647b92;line-height:1.55}.pahIdentity{padding:13px 16px;border:1px solid #cfddeb;border-radius:12px;background:#fff;box-shadow:0 8px 20px #0b31520d}.pahIdentity strong,.pahIdentity small{display:block}.pahIdentity small{margin-top:4px;color:#74879b}.pahSummary{display:grid;grid-template-columns:repeat(4,1fr);gap:13px;margin:26px 0}.pahMetric{padding:18px;border:1px solid #d5e2ed;border-radius:14px;background:#fff}.pahMetric span{display:block;color:#677d93;font-size:11px;font-weight:900;text-transform:uppercase}.pahMetric strong{display:block;margin-top:10px;font-size:30px}.pahPanel{margin-top:18px;padding:23px;border:1px solid #d5e2ed;border-radius:17px;background:#fff;box-shadow:0 12px 32px #113d6110}.pahPanelHead{display:flex;justify-content:space-between;align-items:end;gap:15px;margin-bottom:18px}.pahPanelHead h2{margin:0;font-size:22px}.pahPanelHead p{margin:5px 0 0;color:#6c8095}.pahScore{padding:8px 12px;border-radius:999px;background:#e6f7f1;color:#08765e;font-size:12px;font-weight:900}.pahChecks{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.pahCheck{min-height:132px;padding:17px;border:1px solid #dce6ef;border-radius:13px;background:#f8fbfd}.pahCheck span{display:inline-flex;padding:5px 8px;border-radius:999px;background:#e4f7ef;color:#08765e;font-size:10px;font-weight:900;letter-spacing:.05em}.pahCheck.action span{background:#fff0df;color:#a55700}.pahCheck strong,.pahCheck small{display:block}.pahCheck strong{margin-top:13px;font-size:16px}.pahCheck small{margin-top:7px;color:#718499;line-height:1.45}.pahTools{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}.pahTool{position:relative;min-height:180px;padding:21px;border:1px solid #d4e0eb;border-radius:15px;background:linear-gradient(145deg,#fff,#f5f9fc);color:#08294f;text-decoration:none;transition:.18s ease}.pahTool:hover{transform:translateY(-2px);border-color:#2d6fca;box-shadow:0 12px 26px #0c3f7220}.pahTool b{display:grid;place-items:center;width:42px;height:42px;border-radius:11px;background:#155fca;color:#fff;font-size:13px}.pahTool span{display:block;margin-top:15px;color:#087f6c;font-size:10px;font-weight:900;letter-spacing:.08em;text-transform:uppercase}.pahTool strong{display:block;margin-top:5px;font-size:18px}.pahTool p{margin:8px 0 0;color:#6a7f94;font-size:13px;line-height:1.48}.pahTool i{position:absolute;right:18px;bottom:17px;color:#1762cf;font-style:normal;font-weight:900}.pahFooter{display:flex;justify-content:space-between;gap:15px;flex-wrap:wrap;margin-top:20px;padding:17px 3px;color:#6d8296;font-size:12px}.pahFooter a{color:#155fca;font-weight:850;text-decoration:none}@media(max-width:980px){.pahSummary,.pahTools{grid-template-columns:repeat(2,1fr)}.pahChecks{grid-template-columns:repeat(2,1fr)}}@media(max-width:620px){.pahPage{padding:24px 14px 70px}.pahTop h1{font-size:31px}.pahSummary,.pahChecks,.pahTools{grid-template-columns:1fr}.pahPanel{padding:18px}}
      `}</style>

      <div className="pahShell">
        <header className="pahTop">
          <div>
            <span className="pahKicker">RPG EXCELLENCE · CONTROLLED ACCESS</span>
            <h1>Platform Administration</h1>
            <p>
              Central access to administration, diagnostics and live platform
              verification tools. No secret values are displayed on this page.
            </p>
          </div>
          <div className="pahIdentity">
            <strong>Active administrator</strong>
            <small>{user.email}</small>
          </div>
        </header>

        <section className="pahSummary">
          {metrics.map(([label, value]) => (
            <article className="pahMetric" key={label}>
              <span>{label}</span>
              <strong>{value}</strong>
            </article>
          ))}
        </section>

        <section className="pahPanel">
          <div className="pahPanelHead">
            <div>
              <h2>Platform readiness</h2>
              <p>High-level production configuration and connectivity checks.</p>
            </div>
            <span className="pahScore">
              {readyCount}/{checks.length} ready
            </span>
          </div>
          <div className="pahChecks">
            {checks.map((check) => (
              <Check key={check.label} {...check} />
            ))}
          </div>
        </section>

        <section className="pahPanel">
          <div className="pahPanelHead">
            <div>
              <h2>Administration and diagnostic tools</h2>
              <p>Open each controlled tool from one administration dashboard.</p>
            </div>
          </div>
          <div className="pahTools">
            {tools.map((tool) => (
              <Link className="pahTool" href={tool.href} key={tool.href}>
                <b>{tool.code}</b>
                <span>{tool.group}</span>
                <strong>{tool.title}</strong>
                <p>{tool.description}</p>
                <i>Open →</i>
              </Link>
            ))}
          </div>
        </section>

        <footer className="pahFooter">
          <span>Access is restricted through the portal_admins register.</span>
          <Link href="/portal">Return to customer portal →</Link>
        </footer>
      </div>
    </main>
  );
}
