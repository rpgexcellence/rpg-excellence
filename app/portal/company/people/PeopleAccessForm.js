"use client";

import { useActionState, useState } from "react";
import ProfessionalFunctionIcon from "../../../../components/ProfessionalFunctionIcon";
import {
  ACCESS_LEVELS,
  AUTHORISATION_STATUSES,
  PLATFORM_MODULES,
  PROFESSIONAL_FUNCTIONS,
} from "../../../../lib/people-access";
import { createPersonInvitation } from "./actions";

const initialState = { error: "" };

export default function PeopleAccessForm({ people }) {
  const [state, action, pending] = useActionState(
    createPersonInvitation,
    initialState
  );

  const [accountMode, setAccountMode] = useState("system");
  const [selectedFunctions, setSelectedFunctions] = useState(["viewer"]);

  const directoryPeople = Array.isArray(people) ? people : [];
  const systemUser = accountMode !== "directory";
  const superAdministrator = accountMode === "super_administrator";

  const chooseAccountMode = (mode) => {
    setAccountMode(mode);

    setSelectedFunctions((current) => {
      if (mode === "super_administrator") {
        return current.includes("company_administrator")
          ? current
          : ["company_administrator", ...current];
      }

      return current.filter((item) => item !== "company_administrator");
    });
  };

  const toggleFunction = (key) => {
    if (superAdministrator && key === "company_administrator") return;

    setSelectedFunctions((current) =>
      current.includes(key)
        ? current.filter((item) => item !== key)
        : [...current, key]
    );
  };

  return (
    <form action={action} className="paForm">
      <input
        type="hidden"
        name="account_type"
        value={accountMode === "directory" ? "directory" : "system"}
      />

      <input
        type="hidden"
        name="access_profile"
        value={accountMode}
      />

      {state?.error && (
        <div className="paError" role="alert">
          <b>Unable to create person</b>
          <span>{state.error}</span>
        </div>
      )}

      <section className="paSection">
        <header>
          <span>01</span>
          <div>
            <h2>Person and organisational connection</h2>
            <p>
              Create the controlled directory record and connect reporting
              relationships.
            </p>
          </div>
        </header>

        <div className="paGrid">
          <label>
            <span>First name *</span>
            <input name="first_name" required />
          </label>

          <label>
            <span>Surname *</span>
            <input name="last_name" required />
          </label>

          <label>
            <span>Work email *</span>
            <input type="email" name="email" required />
          </label>

          <label>
            <span>Company position</span>
            <input name="position" />
          </label>

          <label>
            <span>Department</span>
            <input name="department" />
          </label>

          <label>
            <span>Site</span>
            <input name="site" />
          </label>

          <label>
            <span>Employee reference</span>
            <input name="employee_reference" />
          </label>

          <label>
            <span>Direct line manager</span>
            <select name="manager_person_id">
              <option value="">Not assigned</option>
              {directoryPeople.map((person) => (
                <option value={person.id} key={person.id}>
                  {person.first_name} {person.last_name} ·{" "}
                  {person.position || "No position"}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>Functional / dotted-line manager</span>
            <select name="functional_manager_person_id">
              <option value="">Not assigned</option>
              {directoryPeople.map((person) => (
                <option value={person.id} key={person.id}>
                  {person.first_name} {person.last_name}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>Deputy / escalation contact</span>
            <select name="deputy_person_id">
              <option value="">Not assigned</option>
              {directoryPeople.map((person) => (
                <option value={person.id} key={person.id}>
                  {person.first_name} {person.last_name}
                </option>
              ))}
            </select>
          </label>

          <label className="wide">
            <span>Administrator comments</span>
            <textarea name="comments" rows="3" />
          </label>
        </div>
      </section>

      <section className="paSection">
        <header>
          <span>02</span>
          <div>
            <h2>Account decision</h2>
            <p>
              Choose a directory record, controlled system user or Super
              Administrator.
            </p>
          </div>
        </header>

        <div className="paChoice paChoiceThree">
          <label className={accountMode === "directory" ? "selected" : ""}>
            <input
              type="radio"
              name="account_mode"
              value="directory"
              checked={accountMode === "directory"}
              onChange={() => chooseAccountMode("directory")}
            />
            <b>Directory record only</b>
            <small>No platform login</small>
          </label>

          <label className={accountMode === "system" ? "selected" : ""}>
            <input
              type="radio"
              name="account_mode"
              value="system"
              checked={accountMode === "system"}
              onChange={() => chooseAccountMode("system")}
            />
            <b>RPG system user</b>
            <small>Module access is assigned individually</small>
          </label>

          <label
            className={
              accountMode === "super_administrator"
                ? "selected superAdminChoice"
                : "superAdminChoice"
            }
          >
            <input
              type="radio"
              name="account_mode"
              value="super_administrator"
              checked={accountMode === "super_administrator"}
              onChange={() => chooseAccountMode("super_administrator")}
            />
            <b>Super Administrator</b>
            <small>Full site-wide administrative rights</small>
          </label>
        </div>
      </section>

      <section className="paSection">
        <header>
          <span>03</span>
          <div>
            <h2>Professional functions</h2>
            <p>
              Select illustrated functions and set the controlled authorisation
              status for each person.
            </p>
          </div>
        </header>

        <div className="paFunctions">
          {PROFESSIONAL_FUNCTIONS.map(([key, label, description]) => {
            const selected = selectedFunctions.includes(key);
            const locked =
              superAdministrator && key === "company_administrator";

            return (
              <article
                className={selected ? "selected" : ""}
                key={key}
              >
                <button
                  type="button"
                  onClick={() => toggleFunction(key)}
                  aria-pressed={selected}
                  aria-disabled={locked}
                >
                  <ProfessionalFunctionIcon type={key} label={label} />
                  <b>{label}</b>
                  <small>{description}</small>
                  <span>
                    {locked
                      ? "Required for Super Administrator"
                      : selected
                        ? "Selected"
                        : "Select function"}
                  </span>
                </button>

                {selected && (
                  <div className="paFunctionControl">
                    <input
                      type="hidden"
                      name="selected_functions"
                      value={key}
                    />

                    <label>
                      Status
                      <select
                        name={`function_status_${key}`}
                        defaultValue="authorised"
                      >
                        {AUTHORISATION_STATUSES.map(([value, text]) => (
                          <option value={value} key={value}>
                            {text}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label>
                      Expires
                      <input
                        type="date"
                        name={`function_expiry_${key}`}
                      />
                    </label>

                    <label className="wide">
                      Competence evidence
                      <input
                        name={`function_evidence_${key}`}
                        placeholder="Qualification, experience or approval reference"
                      />
                    </label>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </section>

      <section
        className={`paSection ${!systemUser ? "disabled" : ""}`}
      >
        <header>
          <span>04</span>
          <div>
            <h2>Platform access</h2>
            <p>
              Set access independently from professional authorisation. Super
              Administrators receive full access to every module.
            </p>
          </div>
        </header>

        <div className="paPermissions">
          {PLATFORM_MODULES.map(([key, label], index) => (
            <label key={key}>
              <span>{label}</span>

              {superAdministrator && (
                <input
                  type="hidden"
                  name={`module_${key}`}
                  value="admin"
                />
              )}

              <select
                name={superAdministrator ? undefined : `module_${key}`}
                value={superAdministrator ? "admin" : undefined}
                defaultValue={
                  superAdministrator
                    ? undefined
                    : index === 0
                      ? "view"
                      : "none"
                }
                disabled={!systemUser || superAdministrator}
                readOnly={superAdministrator}
              >
                {ACCESS_LEVELS.map(([value, text]) => (
                  <option value={value} key={value}>
                    {text}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
      </section>

      <div className="paSubmit">
        <div>
          <b>
            {accountMode === "directory"
              ? "Directory record will be created"
              : superAdministrator
                ? "Super Administrator invitation will be generated"
                : "QR invitation will be generated"}
          </b>

          <span>
            {accountMode === "directory"
              ? "You can convert this person into a system user later."
              : superAdministrator
                ? "The user will receive full site-wide administrative access after secure QR activation."
                : "The QR is personal, single-use and expires after 72 hours."}
          </span>
        </div>

        <button disabled={pending}>
          {pending
            ? "Creating controlled record…"
            : accountMode === "directory"
              ? "Create directory person"
              : superAdministrator
                ? "Create Super Administrator & generate QR"
                : "Create user & generate QR"}
        </button>
      </div>
    </form>
  );
}
