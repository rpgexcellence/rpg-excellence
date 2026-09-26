import Link from "next/link";
import { redirect } from "next/navigation";
import ProfessionalFunctionIcon from "../../../components/ProfessionalFunctionIcon";
import { functionLabel, moduleLabel, accessLabel } from "../../../lib/people-access";
import { createAdminClient } from "../../../lib/supabase/admin";
import { createClient } from "../../../lib/supabase/server";
import { confirmCompanyAccess } from "./actions";

export const metadata = { title: "Confirm company access | RPG Excellence" };
export const dynamic = "force-dynamic";

export default async function ConfirmCompanyAccessPage({ searchParams }) {
  const query = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/portal/login?next=/portal/confirm-company-access");

  const admin = createAdminClient();
  const email = String(user.email || "").trim().toLowerCase();
  const { data: person } = await admin
    .from("organization_people")
    .select("*")
    .eq("email", email)
    .eq("account_type", "system")
    .eq("account_status", "invited")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!person) redirect("/portal/my-access");

  const [{ data: organisation }, { data: functions = [] }, { data: permissions = [] }, managerResult] =
    await Promise.all([
      admin.from("organizations").select("id,name").eq("id", person.organization_id).single(),
      admin.from("organization_person_authorizations").select("*").eq("person_id", person.id),
      admin.from("organization_person_permissions").select("*").eq("person_id", person.id).neq("access_level", "none"),
      person.manager_person_id
        ? admin.from("organization_people").select("first_name,last_name").eq("id", person.manager_person_id).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

  const manager = managerResult.data;
  const activeFunctions = functions.filter((item) => item.status === "authorised");

  return (
    <main className="confirmPage">
      <style>{styles}</style>
      <section className="confirmShell">
        <header>
          <div className="brand">RPG <span>Excellence</span></div>
          <span className="eyebrow">{organisation?.name} · COMPANY INVITATION</span>
          <h1>Confirm your company profile</h1>
          <p>
            Your administrator has already created the company workspace and
            assigned your details. Review them below—do not create another site
            or organisation.
          </p>
        </header>

        {query?.error && (
          <div className="error" role="alert">
            {query.error === "confirm"
              ? "Confirm that the details belong to you before activating access."
              : "The invitation could not be activated. Ask your company administrator to issue a new invitation."}
          </div>
        )}

        <section className="profile">
          <div>
            <small>INVITED PERSON</small>
            <h2>{person.first_name} {person.last_name}</h2>
            <p>{person.email}</p>
          </div>
          <dl>
            <div><dt>Position</dt><dd>{person.position || "Not assigned"}</dd></div>
            <div><dt>Department</dt><dd>{person.department || "Not assigned"}</dd></div>
            <div><dt>Site</dt><dd>{person.site || "Organisation-wide"}</dd></div>
            <div><dt>Reports to</dt><dd>{manager ? `${manager.first_name} ${manager.last_name}` : "Not assigned"}</dd></div>
          </dl>
        </section>

        <section className="panel">
          <h2>Authorised professional functions</h2>
          <div className="functions">
            {activeFunctions.length ? activeFunctions.map((item) => (
              <article key={item.id}>
                <ProfessionalFunctionIcon type={item.function_key} label={functionLabel(item.function_key)} size={62} />
                <b>{functionLabel(item.function_key)}</b>
                <small>Authorised</small>
              </article>
            )) : <p>No professional function has been assigned.</p>}
          </div>
        </section>

        <section className="panel">
          <h2>Platform areas assigned to you</h2>
          <div className="modules">
            {permissions.map((item) => (
              <div key={item.id}>
                <b>{moduleLabel(item.module_key)}</b>
                <span>{accessLabel(item.access_level)}</span>
              </div>
            ))}
          </div>
        </section>

        <form action={confirmCompanyAccess} className="confirmation">
          <input type="hidden" name="person_id" value={person.id} />
          <label>
            <input type="checkbox" name="confirm_details" value="yes" required />
            <span>I confirm this is my profile and I accept access to {organisation?.name}.</span>
          </label>
          <button type="submit">Confirm details &amp; activate access →</button>
        </form>

        <footer>
          <span>Are any details incorrect? Contact your company administrator before activating.</span>
          <form action="/auth/signout" method="post"><button>Sign out</button></form>
        </footer>
      </section>
    </main>
  );
}

const styles = `*{box-sizing:border-box}.confirmPage{min-height:100vh;padding:34px 20px 70px;background:linear-gradient(145deg,#eaf3fb,#f8fafc 55%,#edf8f5);color:#08294f;font-family:Arial,sans-serif}.confirmShell{max-width:1050px;margin:auto}.brand{margin-bottom:29px;color:#082a54;font-size:21px;font-weight:950}.brand span{font-weight:400}.eyebrow{color:#315fe6;font-size:10px;font-weight:950;letter-spacing:.14em}.confirmShell>header h1{margin:9px 0 9px;font-size:40px;letter-spacing:-.035em}.confirmShell>header p{max-width:760px;margin:0;color:#60758a;line-height:1.6}.error{margin-top:18px;padding:14px 16px;border:1px solid #efb4ad;border-radius:10px;background:#fff0ee;color:#922f26;font-size:12px}.profile,.panel,.confirmation{margin-top:18px;padding:22px;border:1px solid #d5e1ec;border-radius:16px;background:#fff;box-shadow:0 12px 30px #173f6910}.profile{display:grid;grid-template-columns:.72fr 1.28fr;gap:20px;align-items:center;background:linear-gradient(135deg,#082a54,#0c3d73);color:#fff}.profile small{color:#62dfdc;font-size:9px;font-weight:950;letter-spacing:.12em}.profile h2{margin:7px 0 4px;font-size:26px}.profile p{margin:0;color:#bdd0e2}.profile dl{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:0}.profile dl div{padding:11px;border-radius:9px;background:#ffffff0e}.profile dt{color:#aac0d5;font-size:8px;text-transform:uppercase}.profile dd{margin:4px 0 0;font-size:11px;font-weight:850}.panel h2{margin:0 0 15px;font-size:19px}.functions{display:flex;gap:11px;overflow-x:auto}.functions article{min-width:145px;padding:13px;border:1px solid #d8e3ec;border-radius:11px;text-align:center}.functions svg{display:block;margin:auto;color:#1762cf}.functions b,.functions small{display:block}.functions b{font-size:11px}.functions small{margin-top:4px;color:#0b8c61;font-size:9px}.modules{display:grid;grid-template-columns:repeat(3,1fr);gap:9px}.modules div{padding:13px;border-radius:9px;background:#f1f6fa}.modules b,.modules span{display:block}.modules b{font-size:11px}.modules span{margin-top:4px;color:#6d8196;font-size:9px}.confirmation{display:flex;justify-content:space-between;align-items:center;gap:20px;border-color:#a9d8cb;background:#f2fbf7}.confirmation label{display:flex;align-items:flex-start;gap:10px;color:#234761;font-size:12px;font-weight:800;line-height:1.45}.confirmation input{width:18px;height:18px;accent-color:#0b9b69}.confirmation button{min-height:48px;padding:0 18px;border:0;border-radius:9px;background:#0b8f63;color:#fff;font-weight:900;cursor:pointer}.confirmShell>footer{display:flex;justify-content:space-between;align-items:center;gap:15px;padding:17px 5px;color:#718397;font-size:10px}.confirmShell>footer button{padding:7px 11px;border:1px solid #cad7e3;border-radius:7px;background:#fff;color:#294b6b;cursor:pointer}@media(max-width:760px){.profile{grid-template-columns:1fr}.profile dl{grid-template-columns:1fr 1fr}.modules{grid-template-columns:1fr 1fr}.confirmation{align-items:stretch;flex-direction:column}.confirmation button{width:100%}}@media(max-width:500px){.confirmPage{padding:24px 13px 50px}.confirmShell>header h1{font-size:33px}.profile dl,.modules{grid-template-columns:1fr}}`;
