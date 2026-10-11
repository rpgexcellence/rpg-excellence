import Link from "next/link";
import {notFound,redirect} from "next/navigation";
import {createClient} from "../../../../../../lib/supabase/server";
import {getPermitAccess,mayEditPermit} from "../../../../../../lib/permitAccess";
import {
  addAtmosphereTest,
  addIsolation,
  recordHandover,
  reinstateIsolation
} from "./actions";
import PermitHandoverForm from "../../../../../../components/PermitHandoverForm";

export const dynamic="force-dynamic";

const local=value=>{
  const date=new Date(value);
  date.setMinutes(
    date.getMinutes()-date.getTimezoneOffset()
  );
  return date.toISOString().slice(0,16);
};

const format=value=>
  value
    ?new Intl.DateTimeFormat("en-GB",{
        dateStyle:"medium",
        timeStyle:"short"
      }).format(new Date(value))
    :"—";

const personName=person=>
  [person.first_name,person.last_name]
    .filter(Boolean)
    .join(" ")
    .trim()||
  person.email;

const PeopleSelect=({
  people,
  name,
  label
})=>
  <label>
    {label}
    <select name={name} required>
      <option value="">
        Select active company user
      </option>

      {people.map(person=>
        <option
          key={person.id}
          value={person.id}
        >
          {personName(person)}
          {person.position
            ?` — ${person.position}`
            :""
          }
        </option>
      )}
    </select>
  </label>;

export default async function PermitControlsPage({
  params
}){
  const {id}=await params;
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();

  if(!user){
    redirect(
      `/portal/login?next=/portal/health-safety/permits/${id}/controls`
    );
  }

  const access=await getPermitAccess(user.id,id);

  if(!access.allowed||!access.permit){
    notFound();
  }

  if(!mayEditPermit(access)){
    throw new Error(
      "Contributor access is required to manage permit controls."
    );
  }

  const {admin,permit}=access;

  const [
    peopleResult,
    isolationResult,
    testResult,
    handoverResult
  ]=await Promise.all([
    admin
      .from("organization_people")
      .select(
        "id,first_name,last_name,email,position"
      )
      .eq(
        "organization_id",
        permit.organization_id
      )
      .eq("account_status","active")
      .order("last_name"),

    admin
      .from("hs_permit_isolations")
      .select("*")
      .eq("permit_id",id)
      .order("created_at"),

    admin
      .from("hs_permit_atmosphere_tests")
      .select("*")
      .eq("permit_id",id)
      .order("tested_at",{ascending:false}),

    admin
      .from("hs_permit_handovers")
      .select("*")
      .eq("permit_id",id)
      .order("handed_over_at",{ascending:false}),
  ]);

  const people=peopleResult.data||[];
  const isolations=isolationResult.data||[];
  const tests=testResult.data||[];
  const handovers=handoverResult.data||[];
  const now=local(new Date());

  return (
    <main className="ctPage">
      <style>{`
        *{
          box-sizing:border-box;
        }

        .ctPage{
          min-height:100vh;
          padding:30px 22px 90px;
          background:#edf4f8;
          color:#071d3a;
          font-family:Arial,sans-serif;
        }

        .ctShell{
          max-width:1180px;
          margin:auto;
        }

        .ctTop{
          display:flex;
          justify-content:space-between;
          gap:15px;
          align-items:flex-start;
          flex-wrap:wrap;
        }

        .ctTop small{
          color:#087f6c;
          font-weight:900;
          letter-spacing:.08em;
        }

        .ctTop h1{
          margin:6px 0;
        }

        .ctTop p,
        .ctPanel>p{
          color:#657b91;
        }

        .ctBack,
        .ctButton{
          padding:11px 15px;
          border:1px solid #c8d7e2;
          border-radius:9px;
          background:#fff;
          color:#173b59;
          text-decoration:none;
          font-weight:850;
          cursor:pointer;
        }

        .ctPanel{
          margin-top:15px;
          padding:21px;
          border:1px solid #d4e1e9;
          border-radius:14px;
          background:#fff;
        }

        .ctPanel h2{
          margin:0 0 5px;
        }

        .ctGuide{
          padding:13px;
          border-left:4px solid #087f6c;
          border-radius:8px;
          background:#eef8f4;
          color:#315c5a;
        }

        .ctForm,
        .ctGrid{
          display:grid;
          grid-template-columns:1fr 1fr;
          gap:12px;
        }

        .ctForm{
          margin-top:15px;
        }

        .ctForm label{
          display:grid;
          gap:5px;
          font-size:12px;
          font-weight:850;
          color:#294964;
        }

        .ctForm label.full{
          grid-column:1/-1;
        }

        .ctForm input,
        .ctForm select,
        .ctForm textarea{
          width:100%;
          min-width:0;
          min-height:46px;
          padding:10px;
          border:1px solid #c9d7e3;
          border-radius:8px;
          background:#fff;
          font:inherit;
        }

        .ctForm textarea{
          min-height:85px;
        }

        .ctButton{
          grid-column:1/-1;
          background:#087f6c;
          color:#fff;
          border:0;
        }

        .ctRecord{
          padding:14px;
          border:1px solid #d8e3ea;
          border-radius:10px;
          background:#f7fafc;
        }

        .ctRecord strong,
        .ctRecord span{
          display:block;
        }

        .ctRecord span{
          margin-top:5px;
          color:#61798e;
          font-size:13px;
        }

        .ctFail{
          border-left:5px solid #b6372d;
        }

        .ctPass{
          border-left:5px solid #087f6c;
        }

        .ctReinstate{
          margin-top:12px;
          padding-top:12px;
          border-top:1px solid #d8e3ea;
        }

        @media(max-width:700px){
          .ctForm,
          .ctGrid{
            grid-template-columns:1fr;
          }

          .ctForm label.full,
          .ctButton{
            grid-column:auto;
          }

          .ctPage{
            padding:20px 12px 70px;
          }
        }
      `}</style>

      <div className="ctShell">
        <header className="ctTop">
          <div>
            <small>
              {permit.permit_reference}
              {" · "}
              SAFETY CONTROL RECORDS
            </small>

            <h1>
              Isolation, testing and handover
            </h1>

            <p>
              {permit.task_description}
            </p>
          </div>

          <Link
            className="ctBack"
            href={`/portal/health-safety/permits/${id}`}
          >
            ← Permit record
          </Link>
        </header>

        <section className="ctPanel">
          <h2>
            Add and verify an isolation
          </h2>

          <p className="ctGuide">
            Identify every energy source and isolation
            point. The person applying the isolation and
            the independent verifier must be different
            active company users. The isolation must remain
            active until the work is complete and controlled
            reinstatement is authorised.
          </p>

          <form
            action={addIsolation}
            className="ctForm"
          >
            <input
              type="hidden"
              name="permit_id"
              value={id}
            />

            <label>
              Energy type *
              <select
                name="energy_type"
                required
              >
                <option value="">
                  Select
                </option>

                {[
                  "Electrical",
                  "Mechanical",
                  "Hydraulic",
                  "Pneumatic",
                  "Pressure",
                  "Thermal",
                  "Chemical/process",
                  "Gravity",
                  "Stored energy",
                  "Other"
                ].map(value=>
                  <option key={value}>
                    {value}
                  </option>
                )}
              </select>
            </label>

            <label>
              Isolation point/plant ID *
              <input
                name="isolation_point"
                required
              />
            </label>

            <label>
              Isolation method *
              <input
                name="isolation_method"
                required
                placeholder="Switch, valve, blank, disconnection..."
              />
            </label>

            <label>
              Lock/tag number
              <input name="lock_tag_number"/>
            </label>

            <PeopleSelect
              people={people}
              name="applied_by"
              label="Applied by *"
            />

            <label>
              Applied date and time *
              <input
                type="datetime-local"
                name="applied_at"
                defaultValue={now}
                required
              />
            </label>

            <PeopleSelect
              people={people}
              name="verified_by"
              label="Independent verifier *"
            />

            <label>
              Verified date and time *
              <input
                type="datetime-local"
                name="verified_at"
                defaultValue={now}
                required
              />
            </label>

            <label className="full">
              Verification method *
              <textarea
                name="verification_method"
                required
                placeholder="Test for dead, try-start, zero pressure, drain/vent, visual break or other objective verification"
              />
            </label>

            <button className="ctButton">
              Save verified isolation
            </button>
          </form>
        </section>

        <section className="ctPanel">
          <h2>
            Isolation register
          </h2>

          <p>
            Active isolations must remain controlled until
            authorised reinstatement and independent
            verification. A reinstated isolation no longer
            supports issue of the permit.
          </p>

          <div className="ctGrid">
            {isolations.length
              ?isolations.map(item=>
                <article
                  className={`ctRecord ${
                    item.reinstated_at
                      ?"ctPass"
                      :""
                  }`}
                  key={item.id}
                >
                  <strong>
                    {item.energy_type}
                    {" · "}
                    {item.isolation_point}
                  </strong>

                  <span>
                    {item.isolation_method}
                    {item.lock_tag_number
                      ?` · Lock/tag ${item.lock_tag_number}`
                      :""
                    }
                  </span>

                  <span>
                    Applied: {item.applied_by_name}
                    {" · "}
                    {format(item.applied_at)}
                  </span>

                  <span>
                    Verified: {item.verified_by_name}
                    {" · "}
                    {format(item.verified_at)}
                  </span>

                  {item.reinstated_at
                    ?<span>
                      <b>Reinstated:</b>
                      {" "}
                      {item.reinstated_by_name}
                      {"; verified by "}
                      {item.reinstatement_verified_by_name}
                    </span>
                    :<form
                      action={reinstateIsolation}
                      className="ctForm ctReinstate"
                    >
                      <input
                        type="hidden"
                        name="permit_id"
                        value={id}
                      />

                      <input
                        type="hidden"
                        name="isolation_id"
                        value={item.id}
                      />

                      <PeopleSelect
                        people={people}
                        name="reinstated_by"
                        label="Removed by *"
                      />

                      <PeopleSelect
                        people={people}
                        name="reinstatement_verified_by"
                        label="Independent verifier *"
                      />

                      <button className="ctButton">
                        Confirm reinstatement
                      </button>
                    </form>
                  }
                </article>
              )
              :<div className="ctRecord">
                No structured isolations recorded.
              </div>
            }
          </div>
        </section>

        <section className="ctPanel">
          <h2>
            Atmospheric testing
          </h2>

          <p className="ctGuide">
            Record measured values—not only “safe”. The
            latest test for each parameter controls
            readiness. Oxygen is system-controlled at
            19.5%–23.5% volume and cannot be overridden
            by user-entered limits. Expired tests do not
            authorise work.
          </p>

          <form
            action={addAtmosphereTest}
            className="ctForm"
          >
            <input
              type="hidden"
              name="permit_id"
              value={id}
            />

            <label>
              Parameter *
              <select
                name="parameter"
                required
              >
                <option value="">
                  Select
                </option>

                {[
                  "Oxygen",
                  "Flammable gas/LEL",
                  "Hydrogen sulphide",
                  "Carbon monoxide",
                  "Carbon dioxide",
                  "Specific toxic gas",
                  "Other"
                ].map(value=>
                  <option key={value}>
                    {value}
                  </option>
                )}
              </select>
            </label>

            <label>
              Unit *
              <select
                name="unit"
                required
              >
                <option value="">
                  Select
                </option>

                {[
                  "% volume",
                  "% LEL",
                  "ppm",
                  "mg/m³"
                ].map(value=>
                  <option key={value}>
                    {value}
                  </option>
                )}
              </select>
            </label>

            <label>
              Minimum acceptable limit
              <input
                type="number"
                step="any"
                name="minimum_limit"
                placeholder="Oxygen is fixed at 19.5"
              />
            </label>

            <label>
              Maximum acceptable limit
              <input
                type="number"
                step="any"
                name="maximum_limit"
                placeholder="Oxygen is fixed at 23.5"
              />
            </label>

            <label>
              Actual reading *
              <input
                type="number"
                step="any"
                name="actual_reading"
                required
              />
            </label>

            <label>
              Instrument ID *
              <input
                name="instrument_id"
                required
              />
            </label>

            <label>
              Calibration due
              <input
                type="date"
                name="calibration_due"
              />
            </label>

            <PeopleSelect
              people={people}
              name="tested_by"
              label="Competent tester *"
            />

            <label>
              Test date and time *
              <input
                type="datetime-local"
                name="tested_at"
                defaultValue={now}
                required
              />
            </label>

            <label>
              Retest interval (minutes)
              <input
                type="number"
                min="1"
                name="retest_interval_minutes"
              />
            </label>

            <button className="ctButton">
              Save atmospheric test
            </button>
          </form>

          <div
            className="ctGrid"
            style={{marginTop:14}}
          >
            {tests.map(item=>
              <article
                className={`ctRecord ${
                  item.result==="pass"
                    ?"ctPass"
                    :"ctFail"
                }`}
                key={item.id}
              >
                <strong>
                  {item.parameter}
                  {": "}
                  {item.actual_reading}
                  {" "}
                  {item.unit}
                  {" — "}
                  {item.result.toUpperCase()}
                </strong>

                <span>
                  Accepted range:
                  {" "}
                  {item.minimum_limit??"No minimum"}
                  {" to "}
                  {item.maximum_limit??"No maximum"}
                  {" "}
                  {item.unit}
                </span>

                <span>
                  Tester: {item.tested_by_name}
                  {" · "}
                  {format(item.tested_at)}
                </span>

                <span>
                  Instrument: {item.instrument_id}
                  {" · "}
                  Expires: {format(item.expires_at)}
                </span>
              </article>
            )}
          </div>
        </section>

        <section className="ctPanel">
          <h2>
            Shift/person-in-charge handover
          </h2>

          <p className="ctGuide">
            Work remains stopped until a different incoming
            person understands the current state, accepts the
            permit and the issuer reauthorises it.
          </p>

          <PermitHandoverForm
            action={recordHandover}
            permitId={id}
            people={people}
          />

          <div
            className="ctGrid"
            style={{marginTop:14}}
          >
            {handovers.map(item=>
              <article
                className="ctRecord"
                key={item.id}
              >
                <strong>
                  {item.outgoing_person_name}
                  {" → "}
                  {item.incoming_person_name}
                </strong>

                <span>
                  {format(item.handed_over_at)}
                  {" · authorised by "}
                  {item.authorised_by_name}
                </span>

                <span>
                  {item.work_status}
                </span>
              </article>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
