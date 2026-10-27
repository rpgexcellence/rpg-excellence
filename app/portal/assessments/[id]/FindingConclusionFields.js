"use client";

import {
  useState,
  useRef,
} from "react";

import { useFormStatus } from "react-dom";

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

// Existing Assessment callers keep their established fields and behaviour.
// Audit callers opt in to the shared Findings handoff through mode="audit".
export default function FindingConclusionFields(props) {
  return props.mode === "audit"
    ? <AuditConclusion key={`${props.auditId}:${props.questionId}`} {...props} />
    : <AssessmentFindingConclusionFields {...props} />;
}

const AUDIT_LABELS = {not_assessed:"Not assessed",conformity:"Conformity",major_nc:"Major NC",minor_nc:"Minor NC",observation:"Observation",ofi:"Opportunity for Improvement (OFI)",unable_to_verify:"Unable to verify — follow-up required",not_applicable:"Not applicable — justify",positive_practice:"Positive practice (legacy conclusion)"};
const IS_FINDING = value => ["major_nc","minor_nc","observation","ofi"].includes(value);
const AUDIT_CSS = `
.afc{margin-top:20px;border:1px solid #dfe6ee;border-radius:10px;background:#fbfcfe;overflow:hidden;color:#071a33}.afc *{box-sizing:border-box}.afc>summary{padding:14px 16px;background:#f5f8fc;font-weight:800;cursor:pointer}.afcBody{padding:18px 16px;display:grid;gap:15px;min-width:0}.afc label{display:grid;gap:8px;font-size:13px;font-weight:700;min-width:0}.afc select,.afc textarea{width:100%;max-width:100%;padding:12px;border:1px solid #d8e0ea;border-radius:8px;background:#fff;color:#173b55;font:inherit}.afc textarea{min-height:90px;resize:vertical}.afc p{margin:0;font-size:12px;line-height:1.65;color:#617087}.afcNote{padding:12px 14px;border:1px solid #c8e8d8;border-radius:8px;background:#edf8f3;color:#205c43!important}.afcWarning{padding:12px 14px;border:1px solid #ead7a2;border-radius:8px;background:#fff9ec;color:#765a1c!important}.afcRecords{display:grid;gap:12px}.afcRecord{padding:15px;border:1px solid #d6e2ea;border-radius:10px;background:#fff;min-width:0;overflow-wrap:anywhere}.afcRecord header{display:flex;gap:10px;justify-content:space-between;flex-wrap:wrap;align-items:center}.afcTag{padding:5px 8px;border-radius:6px;background:#eaf1fa;color:#205581;font-size:11px;font-weight:700}.afcRecord h4{margin:10px 0;font-size:15px;line-height:1.5}.afcMeta{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin:12px 0}.afcMeta dt{font-size:10px;color:#617087}.afcMeta dd{font-size:12px;margin:5px 0 0;line-height:1.5}.afcActions{display:flex;gap:9px;flex-wrap:wrap}.afcButton{display:inline-flex;align-items:center;justify-content:center;padding:11px 14px;border:1px solid #c7d9e2;border-radius:8px;background:#fff;color:#126b79;font:inherit;font-size:12px;font-weight:750;text-decoration:none;cursor:pointer;min-height:42px}.afcButton.primary{background:#087f8b;border-color:#087f8b;color:#fff}.afcButton:disabled{opacity:.55;cursor:not-allowed}.afc :focus-visible{outline:3px solid #158e99;outline-offset:3px}.afcAdditional{border-top:1px solid #dce6ef;padding-top:14px}.afcAdditional>summary{cursor:pointer;font-size:13px;font-weight:700;color:#126b79}.afcAdditional>div{display:grid;gap:12px;padding-top:12px}@media(max-width:600px){.afcBody{padding:15px 12px}.afcMeta{grid-template-columns:1fr}.afc select,.afc textarea{font-size:16px}.afcActions .afcButton{flex:1}}
`;

function AuditConclusion({auditId,questionId,savedAnswer=null,linkedFindings=[],locked=false,saveAction,openFindingAction}) {
  const {pending}=useFormStatus();
  const [result,setResult]=useState(()=>Object.hasOwn(AUDIT_LABELS,savedAnswer?.result)?savedAnswer.result:"not_assessed");
  const [additionalType,setAdditionalType]=useState("minor_nc"),[handoffError,setHandoffError]=useState("");
  const raiseButton=useRef(null),disabled=locked||pending;
  const options=FINDING_TYPES.filter(type=>IS_FINDING(type.value));
  function selectConclusion(event){
    const next=event.target.value,form=event.currentTarget.form;setResult(next);setHandoffError("");
    if(!IS_FINDING(next)||disabled)return;
    requestAnimationFrame(()=>{
      const button=raiseButton.current;
      if(!form||!button||button.form!==form||typeof openFindingAction!=="function"){setHandoffError("The finding connection is unavailable. Refresh the audit after its page update is applied.");return;}
      try{form.requestSubmit(button);}catch{setHandoffError("The finding form could not be opened. Use Open Findings & Actions below.");}
    });
  }
  function dateLabel(value){if(!value)return "Not set";const date=new Date(value);return Number.isNaN(date.getTime())?"Review date":new Intl.DateTimeFormat("en-GB",{day:"2-digit",month:"short",year:"numeric",timeZone:"UTC"}).format(date);}
  return <details className="afc" open><style>{AUDIT_CSS}</style><summary>Auditor conclusion / Raise finding</summary><div className="afcBody">
    <input type="hidden" name="audit_id" value={auditId}/><input type="hidden" name="question_id" value={questionId}/>
    {linkedFindings.length?<>
      <p>Classification, ownership, response and verification are managed in Findings &amp; Actions. Current progress is shown here.</p>
      <div className="afcRecords">{linkedFindings.map(finding=><article className="afcRecord" key={finding.id}>
        <header><strong>{finding.finding_reference||"Controlled finding"}</strong><span className="afcTag">{AUDIT_LABELS[finding.finding_type]||finding.finding_type}</span></header>
        <h4>{finding.title||finding.failure_statement||"Linked audit finding"}</h4>
        <dl className="afcMeta"><div><dt>Status</dt><dd>{String(finding.status||"Status unavailable").replaceAll("_"," ")}</dd></div><div><dt>Responsible owner</dt><dd>{finding.responsible_owner_name||"Awaiting assignment"}</dd></div><div><dt>Target response</dt><dd>{dateLabel(finding.agreed_date)}</dd></div></dl>
        <p>{finding.closure_verified===true?"Effectiveness verification recorded.":["major_nc","minor_nc"].includes(finding.finding_type)?"Effectiveness verification outstanding.":"Follow-up is managed in Findings & Actions."}</p>
        <div className="afcActions" style={{marginTop:12}}><a className="afcButton primary" href={`/portal/internal-audit-actions?record=${encodeURIComponent(finding.id)}`}>Open finding &amp; progress →</a>{finding.linked_rca_case_id&&<a className="afcButton" href={`/portal/rca/${encodeURIComponent(finding.linked_rca_case_id)}`}>Linked CAPA–8D →</a>}</div>
      </article>)}</div>
      {!locked&&<details className="afcAdditional"><summary>Raise a separate finding against this question</summary><div><p>Use this for a distinct issue. Follow up an existing finding through its controlled record above.</p><input type="hidden" name="create_additional_finding" value="on"/><label>New finding classification<select aria-label="New finding classification" name="finding_type" value={additionalType} onChange={event=>setAdditionalType(event.target.value)} disabled={pending}>{options.map(type=><option key={type.value} value={type.value}>{type.label}</option>)}</select></label><div><button type="submit" formAction={openFindingAction} formNoValidate className="afcButton primary" disabled={pending||typeof openFindingAction!=="function"}>{pending?"Opening…":"Open shared finding form →"}</button></div></div></details>}
    </>:<>
      <label>Auditor conclusion<select aria-label="Auditor conclusion" name="result" value={result} onChange={selectConclusion} disabled={disabled} style={{maxWidth:480}}><option value="not_assessed">Not assessed</option><option value="conformity">Conformity</option>{options.map(type=><option key={type.value} value={type.value}>{type.label}</option>)}<option value="unable_to_verify">Unable to verify — follow-up required</option><option value="not_applicable">Not applicable — justify</option>{savedAnswer?.result==="positive_practice"&&<option value="positive_practice">Positive practice (legacy conclusion)</option>}</select></label>
      <p>Selecting Major NC, Minor NC, Observation or OFI opens the existing Findings form with this audit, criterion and evidence note. The finding is created when that form is submitted.</p>
      {IS_FINDING(result)?<div className="afcActions"><button ref={raiseButton} type="submit" formAction={openFindingAction} formNoValidate className="afcButton primary" disabled={disabled||typeof openFindingAction!=="function"}>{pending?"Opening…":"Open Findings & Actions →"}</button></div>:<>
        {result==="conformity"&&<p className="afcNote">Record the objective evidence supporting conformity in the evidence / auditor notes field above.</p>}
        {result==="unable_to_verify"&&<p className="afcWarning">Record what could not be verified and the follow-up required. This question remains outstanding for fieldwork completion.</p>}
        {result==="not_applicable"&&<label>Not-applicable justification *<textarea aria-label="Not-applicable justification *" name="not_applicable_justification" rows={3} defaultValue={savedAnswer?.not_applicable_justification||""} required disabled={disabled} maxLength={12000} placeholder="Explain why this requirement does not apply within the approved audit scope."/></label>}
        <div><button type="submit" formAction={saveAction} className="afcButton primary" disabled={disabled||typeof saveAction!=="function"}>{pending?"Saving…":"Save this question"}</button></div>
      </>}
      {locked&&<p className="afcWarning">Fieldwork is locked at the current audit stage. Saved conclusions and linked findings remain available for review.</p>}
      {handoffError&&<p className="afcWarning" role="alert">{handoffError}</p>}
    </>}
  </div></details>;
}

function AssessmentFindingConclusionFields({
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
              <div style={{borderTop:"1px solid #e6ebf1",paddingTop:"14px",color:"#40566f",fontSize:"13px",lineHeight:1.55}}>
                Saving this nonconformity creates a formal finding. Confirm the treatment route in Findings &amp; Actions: CAPA for proportionate correction and corrective action, or 8D for major, recurring, systemic or high-risk problems.
              </div>
            )}
          </>
        )}
      </div>
    </details>
  );
}
