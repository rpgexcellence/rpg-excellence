"use client";

import {
  useState,
} from "react";

const FINDING_TYPES = [
  {
    value: "conformity",
    label: "Conformity",
  },
  {
    value: "observation",
    label: "Observation",
  },
  {
    value: "ofi",
    label:
      "Opportunity for Improvement (OFI)",
  },
  {
    value: "minor_nc",
    label:
      "Minor Nonconformity",
  },
  {
    value: "major_nc",
    label:
      "Major Nonconformity",
  },
];

const RISK_LEVELS = [
  "High",
  "Medium",
  "Low",
];

export default function FindingConclusionFields({
  fieldKey,
  savedFinding,
  savedAction,
  savedEvidence,
}) {
  const initialType =
    savedFinding
      ?.finding_type ??
    "conformity";

  const [
    findingType,
    setFindingType,
  ] = useState(
    initialType
  );

  const isFinding =
    findingType !==
    "conformity";

  const isNonconformity =
    findingType ===
      "minor_nc" ||
    findingType ===
      "major_nc";

  const inputStyle = {
    width: "100%",
    padding: "12px",
    borderRadius: "8px",
    border:
      "1px solid #d8e0ea",
    background: "#ffffff",
    boxSizing:
      "border-box",
  };

  const textareaStyle = {
    ...inputStyle,
    resize: "vertical",
  };

  return (
    <details
      open={Boolean(
        savedFinding &&
          savedFinding
            .finding_type !==
            "conformity"
      )}
      style={{
        marginTop: "20px",
        border:
          "1px solid #dfe6ee",
        borderRadius:
          "10px",
        background:
          "#fbfcfe",
        overflow:
          "hidden",
      }}
    >
      <summary
        style={{
          cursor: "pointer",
          padding:
            "14px 16px",
          color: "#071A33",
          fontWeight: 800,
          background:
            "#f5f8fc",
        }}
      >
        Assessor conclusion /
        Raise finding
      </summary>

      <div
        style={{
          padding:
            "18px 16px",
          display: "grid",
          gap: "16px",
        }}
      >
        <div>
          <label
            style={{
              display: "block",
              fontWeight: 700,
              color: "#071A33",
              marginBottom:
                "7px",
            }}
          >
            Assessor conclusion
          </label>

          <select
            name={`finding_type_${fieldKey}`}
            value={
              findingType
            }
            onChange={(
              event
            ) =>
              setFindingType(
                event.target
                  .value
              )
            }
            style={{
              ...inputStyle,
              maxWidth:
                "420px",
            }}
          >
            {FINDING_TYPES.map(
              (type) => (
                <option
                  key={
                    type.value
                  }
                  value={
                    type.value
                  }
                >
                  {
                    type.label
                  }
                </option>
              )
            )}
          </select>

          <p
            style={{
              margin:
                "7px 0 0",
              color: "#617087",
              fontSize:
                "12px",
              lineHeight:
                1.45,
            }}
          >
            Conformity records the
            assessment conclusion only.
            Observation, OFI, Minor NC
            and Major NC create a
            formal finding.
          </p>
        </div>

        {!isFinding && (
          <div
            style={{
              background:
                "#edf8f3",
              border:
                "1px solid #c8e8d8",
              color:
                "#205c43",
              borderRadius:
                "8px",
              padding:
                "13px 14px",
              lineHeight:
                1.5,
              fontSize:
                "13px",
            }}
          >
            Conformity selected. No
            finding-specific risk,
            finding statement or
            corrective-action fields are
            required. Record the
            supporting assessment
            evidence in the Objective
            evidence / assessor notes
            field above or in Evidence
            Sampling.
          </div>
        )}

        {isFinding && (
          <>
            <div>
              <label
                style={{
                  display:
                    "block",
                  fontWeight:
                    700,
                  color:
                    "#071A33",
                  marginBottom:
                    "7px",
                }}
              >
                Evidence supporting
                this finding / gap
              </label>

              <textarea
                name={`finding_evidence_${fieldKey}`}
                rows="3"
                defaultValue={
                  savedFinding
                    ?.objective_evidence ??
                  savedEvidence ??
                  ""
                }
                placeholder="Record the specific evidence that supports this finding or gap..."
                style={
                  textareaStyle
                }
              />

              <p
                style={{
                  margin:
                    "7px 0 0",
                  color:
                    "#617087",
                  fontSize:
                    "12px",
                  lineHeight:
                    1.45,
                }}
              >
                Use this for
                finding-specific
                evidence. Detailed
                sampling records belong
                in the Evidence Sampling
                workspace.
              </p>
            </div>

            <div>
              <label
                style={{
                  display:
                    "block",
                  fontWeight:
                    700,
                  color:
                    "#071A33",
                  marginBottom:
                    "7px",
                }}
              >
                Finding statement
              </label>

              <textarea
                name={`finding_statement_${fieldKey}`}
                rows="3"
                required={isNonconformity}
                defaultValue={
                  savedFinding
                    ?.finding_statement ??
                  ""
                }
                placeholder={
                  isNonconformity
                    ? "State the nonconformity clearly and factually. Required for Minor or Major NC."
                    : "State the observation or improvement opportunity clearly and factually."
                }
                style={
                  textareaStyle
                }
              />

              {isNonconformity && (
                <p
                  style={{
                    margin: "7px 0 0",
                    color: "#617087",
                    fontSize: "12px",
                    lineHeight: 1.45,
                  }}
                >
                  Required before this Minor or Major Nonconformity can be saved.
                </p>
              )}
            </div>

            <div
              style={{
                display:
                  "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(260px, 1fr))",
                gap: "12px",
              }}
            >
              <div>
                <label
                  style={{
                    display:
                      "block",
                    fontWeight:
                      700,
                    color:
                      "#071A33",
                    marginBottom:
                      "7px",
                  }}
                >
                  Risk /
                  significance
                </label>

                <select
                  name={`finding_risk_${fieldKey}`}
                  required={isFinding}
                  defaultValue={
                    savedFinding
                      ?.risk_impact ??
                    ""
                  }
                  style={
                    inputStyle
                  }
                >
                  <option
                    value=""
                  >
                    Select risk
                    level
                  </option>

                  {RISK_LEVELS.map(
                    (level) => (
                      <option
                        key={
                          level
                        }
                        value={
                          level
                        }
                      >
                        {
                          level
                        }
                      </option>
                    )
                  )}
                </select>

                <p
                  style={{
                    margin:
                      "7px 0 0",
                    color:
                      "#617087",
                    fontSize:
                      "12px",
                    lineHeight:
                      1.45,
                  }}
                >
                  Required for a
                  formal finding.
                  Select High,
                  Medium or Low
                  only.
                </p>
              </div>

              <div>
                <label
                  style={{
                    display:
                      "block",
                    fontWeight:
                      700,
                    color:
                      "#071A33",
                    marginBottom:
                      "7px",
                  }}
                >
                  Assessor rationale
                </label>

                <textarea
                  name={`finding_rationale_${fieldKey}`}
                  rows="3"
                  defaultValue={
                    savedFinding
                      ?.assessor_rationale ??
                    ""
                  }
                  placeholder="Explain the reasoning for the conclusion and classification..."
                  style={
                    textareaStyle
                  }
                />
              </div>
            </div>

            {isNonconformity && (
              <div
                style={{
                  borderTop:
                    "1px solid #e6ebf1",
                  paddingTop:
                    "16px",
                }}
              >
                <strong
                  style={{
                    color:
                      "#071A33",
                    display:
                      "block",
                    marginBottom:
                      "10px",
                  }}
                >
                  Corrective action
                  details
                </strong>

                <p
                  style={{
                    color:
                      "#617087",
                    fontSize:
                      "13px",
                    marginTop:
                      0,
                    lineHeight:
                      1.5,
                  }}
                >
                  Complete these
                  fields for Minor
                  or Major
                  Nonconformity.
                  They may also be
                  completed later
                  in the Findings
                  & Corrective
                  Actions
                  Register.
                </p>

                <div
                  style={{
                    display:
                      "grid",
                    gap: "12px",
                  }}
                >
                  <textarea
                    name={`correction_${fieldKey}`}
                    rows="2"
                    defaultValue={
                      savedAction
                        ?.correction ??
                      ""
                    }
                    placeholder="Immediate correction..."
                    style={
                      textareaStyle
                    }
                  />

                  <textarea
                    name={`containment_${fieldKey}`}
                    rows="2"
                    defaultValue={
                      savedAction
                        ?.containment_action ??
                      ""
                    }
                    placeholder="Containment action..."
                    style={
                      textareaStyle
                    }
                  />

                  <textarea
                    name={`root_cause_${fieldKey}`}
                    rows="3"
                    defaultValue={
                      savedAction
                        ?.root_cause ??
                      ""
                    }
                    placeholder="Root cause..."
                    style={
                      textareaStyle
                    }
                  />

                  <textarea
                    name={`corrective_action_${fieldKey}`}
                    rows="3"
                    defaultValue={
                      savedAction
                        ?.corrective_action ??
                      ""
                    }
                    placeholder="Corrective action..."
                    style={
                      textareaStyle
                    }
                  />

                  <div
                    style={{
                      display:
                        "grid",
                      gridTemplateColumns:
                        "repeat(auto-fit, minmax(220px, 1fr))",
                      gap: "12px",
                    }}
                  >
                    <input
                      type="text"
                      name={`action_owner_${fieldKey}`}
                      defaultValue={
                        savedAction
                          ?.action_owner ??
                        ""
                      }
                      placeholder="Action owner"
                      style={
                        inputStyle
                      }
                    />

                    <input
                      type="date"
                      name={`target_date_${fieldKey}`}
                      defaultValue={
                        savedAction
                          ?.target_date ??
                        ""
                      }
                      style={
                        inputStyle
                      }
                    />
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </details>
  );
}
