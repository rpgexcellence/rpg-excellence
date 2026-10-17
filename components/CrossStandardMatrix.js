"use client";

import Link from "next/link";
import {
  useActionState,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  linkCrossStandardEvidence,
  saveCrossStandardControl,
} from "../app/portal/cross-standard-matrix/actions";

const STATUS_OPTIONS = [
  ["not_reviewed", "Not reviewed"],
  ["gap", "Gap identified"],
  ["developing", "Developing"],
  ["implemented", "Implemented"],
  ["effective", "Effective"],
];

const personName = (person) =>
  [
    person.first_name,
    person.last_name,
  ]
    .filter(Boolean)
    .join(" ") ||
  person.email ||
  "Unnamed Company User";

function EvidenceLinkForm({
  groupId,
  documents,
}) {
  const [
    state,
    action,
    pending,
  ] = useActionState(
    linkCrossStandardEvidence,
    null,
  );

  const [search, setSearch] =
    useState("");

  const labels = useMemo(
    () =>
      new Map(
        documents.map(
          (document) => [
            `${document.document_number} · ${document.title} · Rev ${document.revision || "—"}`,
            document.id,
          ],
        ),
      ),
    [documents],
  );

  const documentId =
    labels.get(search) || "";

  return (
    <form
      action={action}
      className="matrixEvidenceForm"
    >
      <input
        type="hidden"
        name="control_group_id"
        value={groupId}
      />

      <input
        type="hidden"
        name="controlled_document_id"
        value={documentId}
      />

      <label>
        <span>
          Add controlled evidence
        </span>

        <input
          type="search"
          list={`documents-${groupId}`}
          value={search}
          onChange={(event) =>
            setSearch(
              event.target.value,
            )
          }
          placeholder="Search current documented information…"
        />

        <datalist
          id={`documents-${groupId}`}
        >
          {documents.map(
            (document) => {
              const label =
                `${document.document_number} · ` +
                `${document.title} · Rev ` +
                `${document.revision || "—"}`;

              return (
                <option
                  value={label}
                  key={document.id}
                />
              );
            },
          )}
        </datalist>
      </label>

      <label>
        <span>
          Evidence purpose
        </span>

        <input
          name="evidence_purpose"
          placeholder="What requirement or control does this support?"
          maxLength="500"
        />
      </label>

      <button
        type="submit"
        disabled={
          pending || !documentId
        }
      >
        {pending
          ? "Adding…"
          : "+ Add"}
      </button>

      {state?.error ? (
        <p
          className="matrixMessage error"
          role="alert"
        >
          {state.error}
        </p>
      ) : null}

      {state?.success ? (
        <p
          className="matrixMessage success"
          role="status"
        >
          {state.success}
        </p>
      ) : null}
    </form>
  );
}

function MatrixControlForm({
  group,
  people,
  documents,
}) {
  const [
    state,
    action,
    pending,
  ] = useActionState(
    saveCrossStandardControl,
    null,
  );

  const control =
    group.control || {};

  const [
    status,
    setStatus,
  ] = useState(
    control.implementation_status ||
      "not_reviewed",
  );

  const [
    accountablePersonId,
    setAccountablePersonId,
  ] = useState(
    control.accountable_person_id ||
      "",
  );

  useEffect(() => {
    if (!state?.control) {
      return;
    }

    setStatus(
      state.control
        .implementation_status ||
        "not_reviewed",
    );

    setAccountablePersonId(
      state.control
        .accountable_person_id ||
        "",
    );
  }, [state?.control]);

  return (
    <div className="matrixControlPanel">
      <form
        action={action}
        className="matrixControlForm"
      >
        <input
          type="hidden"
          name="control_group_id"
          value={group.id}
        />

        <label>
          <span>
            Implementation status
          </span>

          <select
            name="implementation_status"
            value={status}
            onChange={(event) =>
              setStatus(
                event.target.value,
              )
            }
          >
            {STATUS_OPTIONS.map(
              ([value, label]) => (
                <option
                  value={value}
                  key={value}
                >
                  {label}
                </option>
              ),
            )}
          </select>
        </label>

        <label>
          <span>
            Accountable owner
          </span>

          <select
            name="accountable_person_id"
            value={
              accountablePersonId
            }
            onChange={(event) =>
              setAccountablePersonId(
                event.target.value,
              )
            }
          >
            <option value="">
              Not assigned
            </option>

            {people.map(
              (person) => (
                <option
                  value={person.id}
                  key={person.id}
                >
                  {personName(
                    person,
                  )}
                  {person.position
                    ? ` · ${person.position}`
                    : ""}
                </option>
              ),
            )}
          </select>

          <small>
            Selected only from active
            Company Users.
          </small>
        </label>

        <label className="wide">
          <span>
            Implementation summary
          </span>

          <textarea
            name="implementation_summary"
            defaultValue={
              control
                .implementation_summary ||
              ""
            }
            rows="3"
            placeholder="Describe how the shared control operates, who performs it, the interfaces and how effectiveness is evaluated."
          />
        </label>

        <label className="wide">
          <span>
            Standard-specific
            applicability and differences
          </span>

          <textarea
            name="applicability_notes"
            defaultValue={
              control
                .applicability_notes ||
              ""
            }
            rows="3"
            placeholder="Record exclusions, discipline-specific controls and why evidence cannot be treated as interchangeable."
          />
        </label>

        <label>
          <span>Last review</span>

          <input
            name="last_review_date"
            type="date"
            defaultValue={
              control
                .last_review_date ||
              ""
            }
          />
        </label>

        <label>
          <span>Next review</span>

          <input
            name="next_review_date"
            type="date"
            defaultValue={
              control
                .next_review_date ||
              ""
            }
          />
        </label>

        <div className="matrixFormFooter wide">
          <small>
            Saving this control does not
            alter source assessments,
            findings or CAPA records.
          </small>

          <button
            type="submit"
            disabled={pending}
          >
            {pending
              ? "Saving…"
              : "Save control"}
          </button>
        </div>

        {state?.error ? (
          <p
            className="matrixMessage error wide"
            role="alert"
          >
            {state.error}
          </p>
        ) : null}

        {state?.success ? (
          <p
            className="matrixMessage success wide"
            role="status"
          >
            {state.success}
          </p>
        ) : null}
      </form>

      <div className="matrixEvidence">
        <header>
          <div>
            <strong>
              Reusable evidence
            </strong>

            <small>
              {group.evidence.length}{" "}
              linked record
              {group.evidence.length ===
              1
                ? ""
                : "s"}
            </small>
          </div>

          <Link href="/portal/documents">
            Open Documented Information
            →
          </Link>
        </header>

        <EvidenceLinkForm
          groupId={group.id}
          documents={documents}
        />
      </div>
    </div>
  );
}

export default function CrossStandardMatrix({
  groups,
  people,
  documents,
  standards,
}) {
  const [
    standardFilter,
    setStandardFilter,
  ] = useState("all");

  const [
    textFilter,
    setTextFilter,
  ] = useState("");

  const filtered = groups.filter(
    (group) => {
      const standardMatch =
        standardFilter === "all" ||
        group.requirements.some(
          (item) =>
            item.standard_name ===
            standardFilter,
        );

      const haystack =
        `${group.group_code} ` +
        `${group.title} ` +
        `${group.process_area} ` +
        `${group.executive_intent}`
          .toLowerCase();

      return (
        standardMatch &&
        haystack.includes(
          textFilter.toLowerCase(),
        )
      );
    },
  );

  return (
    <>
      <section className="matrixToolbar">
        <label>
          <span>
            Search controls
          </span>

          <input
            type="search"
            value={textFilter}
            onChange={(event) =>
              setTextFilter(
                event.target.value,
              )
            }
            placeholder="Context, suppliers, audit, improvement…"
          />
        </label>

        <label>
          <span>
            Filter by standard
          </span>

          <select
            value={standardFilter}
            onChange={(event) =>
              setStandardFilter(
                event.target.value,
              )
            }
          >
            <option value="all">
              All five standards
            </option>

            {standards.map(
              (standard) => (
                <option
                  value={
                    standard.label
                  }
                  key={
                    `${standard.label}-` +
                    `${standard.edition}`
                  }
                >
                  {standard.label} ·{" "}
                  {standard.edition}
                </option>
              ),
            )}
          </select>
        </label>

        <div>
          <strong>
            {filtered.length}
          </strong>

          <span>
            control groups displayed
          </span>
        </div>
      </section>

      <section className="matrixList">
        {filtered.map((group) => {
          const status =
            group.control
              ?.implementation_status ||
            "not_reviewed";

          return (
            <details
              className="matrixGroup"
              key={group.id}
            >
              <summary>
                <span className="matrixCode">
                  {group.group_code}
                </span>

                <div>
                  <small>
                    {group.process_area}
                  </small>

                  <strong>
                    {group.title}
                  </strong>

                  <p>
                    {
                      group.executive_intent
                    }
                  </p>
                </div>

                <span
                  className={
                    `matrixStatus ` +
                    `${status}`
                  }
                >
                  {STATUS_OPTIONS.find(
                    ([value]) =>
                      value === status,
                  )?.[1] || status}
                </span>

                <b aria-hidden="true">
                  ⌄
                </b>
              </summary>

              <div className="matrixBody">
                <div className="matrixGuidance">
                  <strong>
                    Implementation guide
                  </strong>

                  <p>
                    {
                      group.implementation_guidance
                    }
                  </p>

                  <small>
                    Common does not mean
                    identical. Verify
                    every requirement
                    against the
                    applicable licensed
                    standard and
                    organisation scope.
                  </small>
                </div>

                <div className="matrixRequirements">
                  {group.requirements.map(
                    (requirement) => (
                      <article
                        key={
                          requirement.id
                        }
                      >
                        <header>
                          <strong>
                            {
                              requirement.standard_name
                            }
                          </strong>

                          <span>
                            {
                              requirement.edition
                            }
                          </span>
                        </header>

                        <b>
                          Clause{" "}
                          {
                            requirement.clause_reference
                          }
                        </b>

                        <p>
                          {
                            requirement.requirement_focus
                          }
                        </p>

                        <span
                          className={
                            `matrixRelationship ` +
                            `${requirement.relationship}`
                          }
                        >
                          {requirement.relationship.replace(
                            "_",
                            " ",
                          )}
                        </span>

                        {requirement.assessment ? (
                          <Link
                            href={
                              `/portal/assessments/` +
                              `${requirement.assessment.id}`
                            }
                            className="matrixAssessment"
                          >
                            <small>
                              Latest linked
                              assessment
                            </small>

                            <strong>
                              {requirement
                                .assessment
                                .score ===
                              null
                                ? "Assessment available"
                                : `${requirement.assessment.score}% clause-family score`}
                            </strong>

                            <span>
                              {requirement
                                .assessment
                                .status
                                ?.replaceAll(
                                  "_",
                                  " ",
                                )}
                            </span>
                          </Link>
                        ) : (
                          <div className="matrixAssessment empty">
                            <small>
                              No matching
                              assessment
                            </small>

                            <span>
                              Start or
                              complete this
                              standard&apos;s
                              gap analysis.
                            </span>
                          </div>
                        )}
                      </article>
                    ),
                  )}
                </div>

                <MatrixControlForm
                  group={group}
                  people={people}
                  documents={documents}
                />
              </div>
            </details>
          );
        })}

        {!filtered.length ? (
          <div className="matrixEmpty">
            No control group matches this
            search.
          </div>
        ) : null}
      </section>
    </>
  );
}
