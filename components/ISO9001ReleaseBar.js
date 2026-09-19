"use client";

import Link from "next/link";
import { useState } from "react";

const clauses = [
  [
    "3",
    "Terms",
    "New emphasis on ethical behaviour and quality culture is reflected in the terminology.",
  ],
  [
    "4",
    "Context",
    "Climate change and sustainability are made more explicit when understanding the organisation and interested parties.",
  ],
  [
    "5",
    "Leadership",
    "Leaders are expected to actively shape quality culture and demonstrate ethical behaviour.",
  ],
  [
    "6",
    "Planning",
    "Risk and opportunity are clearer, with more attention to resilience and opportunity-based thinking.",
  ],
  [
    "7",
    "Support",
    "Awareness now connects people more directly with quality culture and ethical behaviour.",
  ],
  [
    "9–10",
    "Evaluate & improve",
    "Core evaluation remains familiar, while data use, leadership and continual improvement receive sharper emphasis.",
  ],
];

export default function ISO9001ReleaseBar({ locale }) {
  const [expanded, setExpanded] = useState(false);
  const [activeClause, setActiveClause] = useState(null);

  return (
    <section
      className={`isoReleaseBar ${expanded ? "isExpanded" : ""}`}
      aria-label="ISO 9001:2026 release update"
    >
      <div className="isoReleaseSummary">
        <div className="isoReleaseMessage">
          <span className="isoReleaseBadge">NEW STANDARD</span>
          <strong>ISO 9001:2026 is now published</strong>
          <span>
            See what changed and prepare your quality management system.
          </span>
        </div>
        <div className="isoReleaseActions">
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            aria-expanded={expanded}
          >
            {expanded ? "Close" : "Learn more"}{" "}
            <span aria-hidden="true">{expanded ? "↑" : "↓"}</span>
          </button>
          <Link href={`/${locale}/insights/iso-9001-2026-update`}>
            Read full update <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
      {expanded && (
        <div className="isoReleaseDetails">
          <div className="isoReleaseIntro">
            <span>AT A GLANCE</span>
            <h2>A familiar structure with sharper expectations.</h2>
            <p>
              Select a clause to see a short overview. These summaries support
              awareness; use the published standard for the definitive
              requirements.
            </p>
          </div>
          <div className="isoClauseGrid">
            {clauses.map(([clause, title, overview]) => {
              const open = activeClause === clause;
              return (
                <article className={open ? "active" : ""} key={clause}>
                  <button
                    type="button"
                    onClick={() => setActiveClause(open ? null : clause)}
                    aria-expanded={open}
                  >
                    <span>
                      <small>CLAUSE {clause}</small>
                      <strong>{title}</strong>
                    </span>
                    <b aria-hidden="true">{open ? "↑" : "→"}</b>
                  </button>
                  {open && <p>{overview}</p>}
                </article>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
