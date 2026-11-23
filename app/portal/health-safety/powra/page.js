import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "../../../../lib/supabase/server";
import { POWRA_ROOT, powraDate, powraDecision, powraOutstanding, powraStatus, powraTime, powraViews } from "../../../../lib/powra-workflow.mjs";
import { RecordIcon } from "../../../../components/DocumentRecordTabs";
import { DecisionBadge, PowraHero } from "./PowraUI";
import styles from "./powra.module.css";

export const metadata = {title:"POWRA Register | RPG Excellence"};
export const dynamic = "force-dynamic";

const views = { all:"All POWRA", active:"Active", review:"Awaiting Supervisor", stop:"Stop Work", completed:"Completed", closed:"Closed" };
const cards = [
  ["Total POWRA","total","all","clipboard", () => true],
  ["Safe to Start","safe","safe","checkCircle", row => row.status === "open" && powraDecision(row) === "safe_to_start"],
  ["Additional Controls Required","controls","controls","scope", row => row.status === "supervisor_review" && powraDecision(row) === "additional_controls"],
  ["Stop Work","stop","stop","alert", row => row.status === "stopped"],
  ["Supervisor Review","review","review","distribution", row => powraViews(row).includes("review")],
];
const headings = ["Task / reference","Location","Assessor","Assessment time","Safety decision","Controls outstanding","Record status"];

export default async function PowraRegisterPage({ searchParams }) {
  const query = await searchParams;
  const supabase = await createClient();
  const {data:{user}} = await supabase.auth.getUser();
  if (!user) redirect("/portal/login?next=" + POWRA_ROOT);
  const { data, error } = await supabase.from("hs_powra_assessments").select("*").eq("owner_id",user.id).order("created_at",{ascending:false});
  if (error) throw error;
  const records = data ?? [];
  const view = Object.hasOwn(views, query?.view) ? query.view : "all";
  const selectedCard = cards.find(card => card[2] === query?.focus);
  const keyword = typeof query?.q === "string" ? query.q.trim() : "";
  const site = typeof query?.site === "string" ? query.site : "";
  const assessor = typeof query?.assessor === "string" ? query.assessor : "";
  const filtered = records.filter(row =>
    (view === "all" || powraViews(row).includes(view)) && (!selectedCard || selectedCard[4](row)) &&
    (!site || site === row.site_location) && (!assessor || assessor === row.completed_by) &&
    [row.powra_reference,row.task,row.work_area,row.site_location,row.completed_by].join(" ").toLowerCase().includes(keyword.toLowerCase()));
  const options = key => [...new Set(records.map(row => row[key]).filter(Boolean))].sort();
  const listHref = (next, focus) => {
    const params = new URLSearchParams({ view:next });
    if (keyword) params.set("q", keyword);
    if (site) params.set("site",site);
    if (assessor) params.set("assessor",assessor);
    if (focus) params.set("focus",focus);
    return POWRA_ROOT + "?" + params;
  };
  return <main className={styles.page}>
    <PowraHero title="POWRA Operational Control Centre" description="Point-of-work checks, decisions and follow-up">
      <Link className={styles.button} href={POWRA_ROOT + "/new?scan=1"}><RecordIcon name="qr"/>Zone QR</Link>
      <Link className={styles.primary} href={POWRA_ROOT + "/new"}><RecordIcon name="overview"/>Start New POWRA</Link>
    </PowraHero>
    <section className={styles.metrics} aria-label="Operational status">
      {cards.map(([label,tone,key,icon,filter]) => <Link key={key} href={listHref("all",key)} className={styles.metric + " " + styles[tone]} aria-current={selectedCard?.[2] === key}>
        <span className={styles.metricIcon}><RecordIcon name={icon}/></span>
        <span className={styles.metricContent}><strong>{records.filter(filter).length}</strong>{label}</span>
      </Link>)}
    </section>
    <section className={styles.panel}>
      <h2><RecordIcon name="overview"/>POWRA register</h2>
      <nav className={styles.tabs} aria-label="Register views">{Object.entries(views).map(([key,label]) =>
        <Link key={key} href={listHref(key)} aria-current={view === key && !selectedCard ? "page" : undefined}>{label}</Link>)}</nav>
      <form className={styles.filters} action={POWRA_ROOT}>
        <input type="hidden" name="view" value={view}/>{selectedCard && <input type="hidden" name="focus" value={selectedCard[2]}/>}
        <label>Search<input name="q" type="search" defaultValue={keyword} placeholder="Reference, task, location or assessor"/></label>
        <label>Site<select name="site" defaultValue={site}><option value="">All sites</option>{options("site_location").map(value => <option key={value}>{value}</option>)}</select></label>
        <label>Assessor<select name="assessor" defaultValue={assessor}><option value="">All assessors</option>{options("completed_by").map(value => <option key={value}>{value}</option>)}</select></label>
        <button className={styles.primary}>Apply</button><Link className={styles.button} href={POWRA_ROOT}>Clear</Link>
      </form>
      {filtered.length ? <div className={styles.tableWrap}><table className={styles.table}>
        <thead><tr>{headings.map(heading => <th scope="col" key={heading}>{heading}</th>)}</tr></thead>
        <tbody>{filtered.map(row => {
          const outstanding = powraOutstanding(row);
          return <tr key={row.id}>
            <td><Link href={POWRA_ROOT+"/"+row.id}>{row.task}</Link><br/>{row.powra_reference}</td>
            <td data-label="Location">{[row.site_location,row.work_area].filter(Boolean).join(" · ") || "Not recorded"}</td>
            <td data-label="Assessor">{row.completed_by}</td>
            <td data-label="Assessment time">{row.created_at ? powraTime(row.created_at) : powraDate(row.assessment_date)}</td>
            <td data-label="Safety decision"><DecisionBadge decision={powraDecision(row)}/></td>
            <td data-label="Controls outstanding">{outstanding === 0 ? "None outstanding" : outstanding ?? "Not recorded"}</td>
            <td data-label="Record status">{powraStatus(row)}</td>
          </tr>;
        })}</tbody>
      </table></div> : <p className={styles.empty}>{records.length ? "No assessments match these filters." : "No POWRA records have been created."}</p>}
    </section>
  </main>;
}
