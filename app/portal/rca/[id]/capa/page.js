// VERIFIED_CAPA_PAGE_DRAFT_20261021: explicit conditions and unique draft keys.
import ControlledDeviceDrafts from "../../../../../components/ControlledDeviceDrafts";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "../../../../../lib/supabase/server";
import { saveCapaStage } from "./actions";
const META = {
  "correction": {
    "title": "1. Correction and containment",
    "guide": "Control the detected nonconformity, correct the immediate issue and assess whether similar outputs are affected.",
    "prompt": "Describe the correction, containment, affected scope and confirmation that further escape is controlled."
  },
  "cause_analysis": {
    "title": "2. Cause and extent analysis",
    "guide": "Use evidence to determine why the nonconformity occurred and whether it exists elsewhere. Match analytical depth to risk and recurrence.",
    "prompt": "Record the evidence-supported cause, extent review and why the analysis is proportionate."
  },
  "corrective_action": {
    "title": "3. Corrective action",
    "guide": "Define action that removes the cause, with an accountable owner, due date, resources and measurable effectiveness criteria.",
    "prompt": "Describe the approved action, implementation result and the criterion that will demonstrate effectiveness."
  },
  "effectiveness_review": {
    "title": "4. Independent effectiveness review",
    "guide": "After enough operating time, independently verify that action was implemented, the cause was controlled and recurrence has not occurred.",
    "prompt": "Record the sample, monitoring period, result and independent conclusion. An ineffective result reopens corrective action."
  }
};
const pretty = v => String(v || "").replaceAll("_", " ").replace(/\b\w/g, c => c.toUpperCase());
export default async function CapaCasePage({
  params
}) {
  const {
    id
  } = await params;
  const supabase = await createClient();
  const {
    data: {
      user
    }
  } = await supabase.auth.getUser();
  if (!user) redirect("/portal/login");
  const [{
    data: rcaCase,
    error
  }, {
    data: stages,
    error: stageError
  }] = await Promise.all([supabase.from("rca_cases").select("*").eq("id", id).eq("owner_id", user.id).maybeSingle(), supabase.from("rca_capa_stages").select("*").eq("case_id", id).eq("owner_id", user.id).order("stage_order")]);
  if (error) throw new Error(error.message);
  if (!rcaCase) notFound();
  if (rcaCase.case_type !== "capa") redirect("/portal/rca/" + id);
  if (stageError) throw new Error(stageError.message);
  const completed = (stages || []).filter(row => row.completed_at).length;
  const progress = Math.round(completed / 4 * 100);
  return <ControlledDeviceDrafts userId={user.id} organizationId={rcaCase.organization_id} recordKey={'capa:' + id} label="CAPA" baseline={{
    "rcaCase": rcaCase,
    "stages": stages
  }}><main className="capaDetail">
      <style>
        {"\n    .capaDetail,.capaDetail *{box-sizing:border-box}.capaDetail{min-height:100vh;background:#edf3fa;color:#061a35;padding:28px clamp(16px,2.2vw,32px) 70px}.capaDetailWrap{width:100%;max-width:none;min-width:0;margin:0}.capaDetailTop{display:flex;justify-content:space-between;gap:20px;align-items:flex-start;flex-wrap:wrap}.capaDetailEyebrow{color:#155eef;font-weight:900;letter-spacing:.1em;font-size:12px}.capaDetailTop h1{font-size:clamp(26px,2.4vw,34px);line-height:1.2;margin:7px 0}.capaDetailTop p{color:#61758d}.capaDetailBack{padding:12px 15px;background:#fff;border:1px solid #cbd8e7;border-radius:10px;color:#061a35;text-decoration:none;font-weight:850}.capaDetailHero{margin:18px 0;min-height:0;height:auto;display:grid;grid-template-columns:1fr 260px;gap:22px;padding:24px 28px;border-radius:18px;background:linear-gradient(115deg,#0b2343,#173e72);color:#fff}.capaDetailHero p{color:#c6d8ec;line-height:1.55}.capaDetailMeter{align-self:center}.capaDetailBar{height:10px;background:#ffffff24;border-radius:99px;overflow:hidden}.capaDetailBar i{display:block;height:100%;background:#51ded1}.capaDetailMeter strong{display:block;font-size:30px;margin-bottom:9px}.capaDetailGrid{display:grid;gap:16px}.capaDetailCard{padding:24px;border:1px solid #d5e1ed;border-left:5px solid #a8b8ca;border-radius:16px;background:#fff}.capaDetailCard.capaDetailActive{border-left-color:#155eef}.capaDetailCard.capaDetailDone{border-left-color:#0a9b69}.capaDetailHead{display:flex;justify-content:space-between;gap:18px;align-items:flex-start}.capaDetailHead h2{margin:0 0 6px;font-size:21px}.capaDetailGuide{margin:0;color:#60758e;line-height:1.55}.capaDetailState{white-space:nowrap;padding:7px 10px;border-radius:99px;background:#eef3f8;font-size:12px;font-weight:900}.capaDetailForm{display:grid;grid-template-columns:1fr 1fr;gap:13px;margin-top:18px}.capaDetailWide{grid-column:1/-1}.capaDetailField{display:grid;gap:7px;font-size:13px;font-weight:850}.capaDetailField :is(input,textarea,select){width:100%;min-height:46px;padding:12px;border:1px solid #cbd8e7;border-radius:9px;background:#fff;font:inherit}.capaDetailActions{display:flex;gap:10px}.capaDetailBtn{padding:12px 16px;border:0;border-radius:9px;background:#155eef;color:#fff;font-weight:900;cursor:pointer}.capaDetailBtn.capaDetailSecondary{background:#eaf0f8;color:#123}.capaDetailLocked{margin-top:15px;padding:13px;border-radius:9px;background:#f4f6f9;color:#6c7b8b}@media(max-width:720px){.capaDetailHero,.capaDetailForm{grid-template-columns:1fr}.capaDetailWide{grid-column:auto}}\n  \n.capaDetail{font-family:Arial,sans-serif}.capaDetailTop p{margin:6px 0 0;line-height:1.5}.capaDetailHero h2{font-size:24px;line-height:1.3;margin-bottom:10px}.capaDetailHero p{margin:0;max-width:780px}.capaDetailHero>div,.capaDetailCard,.capaDetailField{min-width:0}.capaDetailHead h2{line-height:1.3}.capaDetailActions{flex-wrap:wrap}.capaDetailBack{display:inline-flex;align-items:center;justify-content:center;font-size:13px}.capaDetailHeaderLinks{display:flex;flex-wrap:wrap;gap:10px}.capaDetailState{align-self:flex-start}.capaDetailField textarea{resize:vertical;line-height:1.55;min-height:108px}.capaDetailBtn{font:inherit;font-size:13px}.capaDetailCard:focus-within{border-color:#8da8ed}@media(max-width:720px){.capaDetailHero{padding:22px;gap:18px}.capaDetailCard{padding:18px}.capaDetailHead{flex-wrap:wrap}.capaDetailMeter strong{font-size:25px}.capaDetailHeaderLinks{width:100%}.capaDetailTop{gap:14px}}\n"}
      </style>
      <div className="capaDetailWrap">
        <header className="capaDetailTop">
          <div>
            <div className="capaDetailEyebrow">
              {rcaCase.case_reference} · CONTROLLED CAPA
            </div>
            <h1>{rcaCase.title}</h1>
            <p>
              {pretty(rcaCase.source_type)} · {pretty(rcaCase.severity)} ·{" "}
              {pretty(rcaCase.status)}
            </p>
          </div>
          <div className="capaDetailHeaderLinks">
            {rcaCase.assessment_id && <Link className="capaDetailBack" href={"/portal/assessments/" + rcaCase.assessment_id + "/findings"}>
                Source assessment
              </Link>}
            <Link className="capaDetailBack" href="/portal/rca">
              CAPA–8D register
            </Link>
          </div>
        </header>
        <section className="capaDetailHero">
          <div>
            <h2 style={{
              "marginTop": 0
            }}>
              Proportionate corrective-action workflow
            </h2>
            <p>
              This four-stage route maintains traceability from nonconformity through
              correction, cause, corrective action and independent effectiveness
              verification. Closure is permitted only after effectiveness is confirmed.
            </p>
          </div>
          <div className="capaDetailMeter">
            <strong>{progress}% complete</strong>
            <div className="capaDetailBar">
              <i style={{
                "width": "" + progress + "%"
              }} />
            </div>
          </div>
        </section>
        <section className="capaDetailGrid">
          {(stages || []).map((row, index) => {
            const meta = META[row.stage];
            const previousComplete = index === 0 || stages[index - 1]?.completed_at;
            const locked = !previousComplete;
            const done = Boolean(row.completed_at);
            return <article key={row.id} className={"capaDetailCard " + (() => {
              if (done) {
                return "capaDetailDone";
              }
              return (() => {
                if (rcaCase.capa_current_stage === row.stage) {
                  return "capaDetailActive";
                }
                return "";
              })();
            })()}>
                <div className="capaDetailHead">
                  <div>
                    <h2>{meta.title}</h2>
                    <p className="capaDetailGuide">{meta.guide}</p>
                  </div>
                  <span className="capaDetailState">
                    {(() => {
                    if (done) {
                      return "Completed";
                    }
                    return (() => {
                      if (locked) {
                        return "Locked";
                      }
                      return "Available";
                    })();
                  })()}
                  </span>
                </div>
                {(() => {
                if (locked) {
                  return <div className="capaDetailLocked">
                    Complete the preceding stage to unlock this controlled record.
                  </div>;
                }
                return <form action={saveCapaStage} className="capaDetailForm">
                    <input type="hidden" name="case_id" value={id} />
                    <input type="hidden" name="stage" value={row.stage} />
                    <label className="capaDetailField capaDetailWide">
                      Controlled record
                      <textarea name="narrative" required rows={4} defaultValue={row.narrative || ""} placeholder={meta.prompt} />
                    </label>
                    <label className="capaDetailField">
                      Objective evidence / reference
                      <input name="evidence_reference" required defaultValue={row.evidence_reference || ""} placeholder="File, record, ticket, audit sample or controlled link" />
                    </label>
                    <label className="capaDetailField">
                      Due or review date
                      <input name="due_date" type="date" defaultValue={row.due_date || ""} />
                    </label>
                    {row.stage === "effectiveness_review" && <label className="capaDetailField capaDetailWide">
                        Effectiveness decision
                        <select name="decision" required defaultValue={row.decision || ""}>
                          <option value="">Select decision</option>
                          <option value="effective">
                            Effective — criteria met; close CAPA
                          </option>
                          <option value="ineffective">
                            Ineffective — return to corrective action
                          </option>
                        </select>
                      </label>}
                    <div className="capaDetailActions capaDetailWide">
                      <button className="capaDetailBtn capaDetailSecondary" name="intent" value="save">
                        Save draft
                      </button>
                      {!done && <button className="capaDetailBtn" name="intent" value="complete">
                          Complete stage →
                        </button>}
                    </div>
                  </form>;
              })()}
              </article>;
          })}
        </section>
      </div>
    </main></ControlledDeviceDrafts>;
}
