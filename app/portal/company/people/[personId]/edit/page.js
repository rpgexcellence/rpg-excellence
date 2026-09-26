import Link from "next/link";
import { redirect } from "next/navigation";
import ProfessionalFunctionIcon from "../../../../../../components/ProfessionalFunctionIcon";
import {
  ACCESS_LEVELS,
  AUTHORISATION_STATUSES,
  PLATFORM_MODULES,
  PROFESSIONAL_FUNCTIONS,
} from "../../../../../../lib/people-access";
import { requirePeopleAdmin, updatePersonAccess } from "../../actions";

export const metadata = { title: "Edit person and access | RPG Excellence" };
export const dynamic = "force-dynamic";

export default async function EditPersonAccessPage({ params, searchParams }) {
  const { personId } = await params;
  const query = await searchParams;
  const { user, admin, organization } = await requirePeopleAdmin();

  const [personResult, peopleResult, functionsResult, permissionsResult] = await Promise.all([
    admin.from("organization_people").select("*").eq("id", personId).eq("organization_id", organization.id).maybeSingle(),
    admin.from("organization_people").select("id,first_name,last_name,position").eq("organization_id", organization.id).neq("id", personId).order("last_name"),
    admin.from("organization_person_authorizations").select("*").eq("person_id", personId),
    admin.from("organization_person_permissions").select("*").eq("person_id", personId),
  ]);

  const person = personResult.data;
  if (!person) redirect("/portal/company/people?error=person");
  const people = peopleResult.data || [];
  const authorizations = functionsResult.data || [];
  const permissions = permissionsResult.data || [];
  const authorizationByKey = new Map(authorizations.map((item) => [item.function_key, item]));
  const permissionByKey = new Map(permissions.map((item) => [item.module_key, item]));
  const editingSelf = person.user_id === user.id;
  const errorMessages = {
    identity: "Enter a valid name and email address.",
    profile: "The person’s profile could not be updated.",
    authorisations: "Professional authorisations could not be updated.",
    permissions: "Module permissions could not be updated.",
  };

  return (
    <main className="editPage">
      <style>{styles}</style>
      <div className="editShell">
        <header className="editTop">
          <div>
            <span>RPG EXCELLENCE · CONTROLLED ACCESS ADMINISTRATION</span>
            <h1>Edit {person.first_name} {person.last_name}</h1>
            <p>Update the company profile, reporting relationships, professional credentials and module permissions.</p>
          </div>
          <Link href="/portal/company/people">← People register</Link>
        </header>

        {query?.error && <div className="editError" role="alert">{errorMessages[query.error] || "The changes could not be saved."}</div>}
        {editingSelf && <div className="editProtection"><b>Self-protection is active.</b><span>Your Company Administrator authorisation and People, Roles &amp; Access administration permission cannot be removed from your own account.</span></div>}

        <form action={updatePersonAccess}>
          <input type="hidden" name="person_id" value={person.id} />

          <section className="editSection">
            <header><span>01</span><div><h2>Person and organisational connection</h2><p>Maintain controlled directory details and reporting relationships.</p></div></header>
            <div className="fieldGrid">
              <label><span>First name *</span><input name="first_name" required defaultValue={person.first_name} /></label>
              <label><span>Surname *</span><input name="last_name" required defaultValue={person.last_name} /></label>
              <label><span>Work email *</span><input type="email" name="email" required defaultValue={person.email} readOnly={Boolean(person.user_id)} /><small>{person.user_id ? "Email is locked after account activation. Use authenticated email-change control." : "The active invitation will use this email."}</small></label>
              <label><span>Company position</span><input name="position" defaultValue={person.position || ""} /></label>
              <label><span>Department</span><input name="department" defaultValue={person.department || ""} /></label>
              <label><span>Site</span><input name="site" defaultValue={person.site || ""} /></label>
              <label><span>Employee reference</span><input name="employee_reference" defaultValue={person.employee_reference || ""} /></label>
              <label><span>Direct line manager</span><select name="manager_person_id" defaultValue={person.manager_person_id || ""}><option value="">Not assigned</option>{people.map((item) => <option value={item.id} key={item.id}>{item.first_name} {item.last_name} · {item.position || "No position"}</option>)}</select></label>
              <label><span>Functional / dotted-line manager</span><select name="functional_manager_person_id" defaultValue={person.functional_manager_person_id || ""}><option value="">Not assigned</option>{people.map((item) => <option value={item.id} key={item.id}>{item.first_name} {item.last_name}</option>)}</select></label>
              <label><span>Deputy / escalation contact</span><select name="deputy_person_id" defaultValue={person.deputy_person_id || ""}><option value="">Not assigned</option>{people.map((item) => <option value={item.id} key={item.id}>{item.first_name} {item.last_name}</option>)}</select></label>
              <label><span>Account status</span><select name="account_status" defaultValue={person.account_status}><option value="directory">Directory only</option><option value="invited">Invited</option><option value="active">Active</option><option value="suspended">Suspended</option></select></label>
              <label className="wide"><span>Administrator comments</span><textarea name="comments" rows="3" defaultValue={person.comments || ""} /></label>
            </div>
          </section>

          <section className="editSection">
            <header><span>02</span><div><h2>Professional credentials and functions</h2><p>Tick a function to retain or add it. Untick it to remove that credential from the profile.</p></div></header>
            <div className="functionGrid">
              {PROFESSIONAL_FUNCTIONS.map(([key, label, description]) => {
                const current = authorizationByKey.get(key);
                const protectedFunction = editingSelf && key === "company_administrator";
                return <article key={key} className={current || protectedFunction ? "selected" : ""}>
                  <label className="functionChoice">
                    <input type="checkbox" name="selected_functions" value={key} defaultChecked={Boolean(current) || protectedFunction} disabled={protectedFunction} />
                    {protectedFunction && <input type="hidden" name="selected_functions" value={key} />}
                    <ProfessionalFunctionIcon type={key} label={label} size={56} />
                    <span><b>{label}</b><small>{description}</small></span>
                  </label>
                  <div className="functionControls">
                    <label>Status<select name={`function_status_${key}`} defaultValue={protectedFunction ? "authorised" : current?.status || "authorised"}>{AUTHORISATION_STATUSES.map(([value, text]) => <option value={value} key={value}>{text}</option>)}</select></label>
                    <label>Expires<input type="date" name={`function_expiry_${key}`} defaultValue={current?.expires_at || ""} disabled={protectedFunction} /></label>
                    <label className="wide">Competence evidence<input name={`function_evidence_${key}`} defaultValue={current?.competence_evidence || ""} placeholder="Qualification, experience or approval reference" /></label>
                  </div>
                </article>;
              })}
            </div>
          </section>

          <section className="editSection">
            <header><span>03</span><div><h2>Platform permissions</h2><p>Access is controlled independently for every module. Select “No access” to remove a module.</p></div></header>
            <div className="permissionGrid">
              {PLATFORM_MODULES.map(([key, label]) => {
                const protectedPermission = editingSelf && key === "people_access";
                return <label key={key}><span>{label}{protectedPermission ? " · protected" : ""}</span>{protectedPermission && <input type="hidden" name={`module_${key}`} value="admin" />}<select name={protectedPermission ? undefined : `module_${key}`} defaultValue={protectedPermission ? "admin" : permissionByKey.get(key)?.access_level || "none"} disabled={protectedPermission}>{ACCESS_LEVELS.map(([value, text]) => <option value={value} key={value}>{text}</option>)}</select></label>;
              })}
            </div>
          </section>

          <div className="saveBar"><div><b>Controlled access change</b><span>Saving creates an auditable event. Passwords are not changed here.</span></div><div><Link href="/portal/company/people">Cancel</Link><button type="submit">Save profile &amp; access changes →</button></div></div>
        </form>
      </div>
    </main>
  );
}

const styles = `*{box-sizing:border-box}.editPage{min-height:100vh;padding:34px 20px 80px;background:linear-gradient(145deg,#eaf3fb,#f7fafc 48%,#edf8f5);color:#08294f;font-family:Arial,sans-serif}.editShell{max-width:1380px;margin:auto}.editTop{display:flex;justify-content:space-between;align-items:flex-start;gap:24px}.editTop>div>span{color:#315fe6;font-size:11px;font-weight:950;letter-spacing:.14em}.editTop h1{margin:8px 0;font-size:42px}.editTop p{margin:0;color:#60758b;font-size:15px}.editTop>a{padding:11px 14px;border:1px solid #cbd9e6;border-radius:9px;background:#fff;color:#173b60;text-decoration:none;font-weight:850}.editError,.editProtection{display:grid;gap:4px;margin-top:18px;padding:14px 16px;border:1px solid #eba69f;border-radius:10px;background:#fff0ee;color:#922f26}.editProtection{border-color:#9fc5ec;background:#edf6ff;color:#155dca}.editProtection span{font-size:12px}.editSection{margin-top:18px;padding:20px;border:1px solid #d5e1ec;border-radius:16px;background:#fff;box-shadow:0 12px 30px #173f6910}.editSection>header{display:flex;gap:12px;align-items:flex-start;margin-bottom:17px}.editSection>header>span{display:grid;place-items:center;min-width:32px;height:32px;border:1px solid #b9cde1;border-radius:8px;color:#315fe6;font-size:11px;font-weight:950}.editSection h2{margin:0;font-size:20px}.editSection header p{margin:4px 0 0;color:#718499;font-size:13px}.fieldGrid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.fieldGrid label,.functionControls label,.permissionGrid label{display:grid;gap:6px}.fieldGrid label>span,.functionControls label,.permissionGrid label>span{font-size:12px;font-weight:900}.fieldGrid .wide,.functionControls .wide{grid-column:1/-1}.fieldGrid input,.fieldGrid select,.fieldGrid textarea,.functionControls input,.functionControls select,.permissionGrid select{width:100%;min-height:46px;padding:10px;border:1px solid #c8d6e4;border-radius:8px;background:#fff;color:#102f51;font:inherit}.fieldGrid input[readonly]{background:#eef3f7;color:#65798d}.fieldGrid label small{color:#718499;font-size:10px;line-height:1.4}.functionGrid{display:grid;grid-template-columns:repeat(3,1fr);gap:11px}.functionGrid article{overflow:hidden;border:1px solid #d4e0eb;border-radius:12px;background:#fff}.functionGrid article.selected{border-color:#315fe6;box-shadow:0 0 0 2px #315fe611}.functionChoice{display:grid;grid-template-columns:auto 58px 1fr;gap:10px;align-items:center;padding:14px;cursor:pointer}.functionChoice>input{width:18px;height:18px;accent-color:#315fe6}.functionChoice svg{color:#1762cf}.functionChoice b,.functionChoice small{display:block}.functionChoice b{font-size:13px}.functionChoice small{margin-top:4px;color:#718499;font-size:10px;line-height:1.4}.functionControls{display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:12px;background:#edf4ff}.functionControls label{font-size:10px}.permissionGrid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.permissionGrid label{padding:12px;border:1px solid #d7e2ec;border-radius:9px;background:#f9fbfd}.permissionGrid label>span{min-height:29px}.saveBar{position:sticky;bottom:12px;display:flex;justify-content:space-between;align-items:center;gap:20px;margin-top:18px;padding:16px 19px;border:1px solid #9fc5ec;border-radius:13px;background:#082a54;color:#fff;box-shadow:0 18px 45px #082a5445}.saveBar b,.saveBar span{display:block}.saveBar span{margin-top:4px;color:#b7cbe0;font-size:11px}.saveBar>div:last-child{display:flex;gap:10px;align-items:center}.saveBar a{color:#d4e2ef;text-decoration:none}.saveBar button{min-height:46px;padding:0 17px;border:0;border-radius:9px;background:#315fe6;color:#fff;font-weight:900;cursor:pointer}@media(max-width:1000px){.fieldGrid,.functionGrid,.permissionGrid{grid-template-columns:1fr 1fr}}@media(max-width:700px){.editPage{padding:22px 12px 60px}.editTop{display:block}.editTop>a{display:inline-block;margin-top:15px}.editTop h1{font-size:34px}.fieldGrid,.functionGrid,.permissionGrid{grid-template-columns:1fr}.saveBar{position:static;align-items:stretch;flex-direction:column}.saveBar>div:last-child{justify-content:space-between}}`;
