// VERIFIED_WPI_FIELDWORK_DRAFT_20261021: explicit conditions and unique draft keys.
"use client";

import { useDeviceDraftState } from "./DeviceDraftWorkspace";
import { useActionState, useEffect, useMemo, useState } from "react";
function initialRows(responses) {
  return responses.map(item => ({
    "id": item.id,
    "response": item.response || "not_assessed",
    "comments_actions": item.comments_actions || "",
    "not_applicable_justification": item.not_applicable_justification || "",
    "finding_required": Boolean(item.finding_required)
  }));
}
function rowNeedsDetail(row) {
  return row.response === "no" && !row.comments_actions.trim() || row.response === "not_applicable" && !row.not_applicable_justification.trim();
}
function groupSections(rows, responseMap) {
  const grouped = new Map();
  rows.forEach((row, index) => {
    const question = responseMap.get(row.id);
    if (!question) return;
    const code = question.section_code || "GENERAL";
    const title = question.section_title || "General inspection";
    const key = JSON.stringify([code, title]);
    if (!grouped.has(key)) grouped.set(key, {
      "key": key,
      "code": code,
      "title": title,
      "items": []
    });
    grouped.get(key).items.push({
      "row": row,
      "question": question,
      "index": index
    });
  });
  return [...grouped.values()].map(section => {
    const assessed = section.items.filter(({
      row
    }) => row.response !== "not_assessed").length;
    const incomplete = section.items.filter(({
      row
    }) => rowNeedsDetail(row)).length;
    const failed = section.items.filter(({
      row
    }) => row.response === "no").length;
    return {
      ...section,
      "assessed": assessed,
      "incomplete": incomplete,
      "failed": failed,
      "progress": Math.round(assessed / section.items.length * 100),
      "status": (() => {
        if (assessed === 0) {
          return "Not started";
        }
        return (() => {
          if (incomplete) {
            return "Details required";
          }
          return (() => {
            if (assessed === section.items.length) {
              return "Assessed";
            }
            return "In progress";
          })();
        })();
      })()
    };
  });
}
export default function WorkplaceInspectionFieldwork({
  action,
  inspection,
  responses = [],
  readOnly = false
}) {
  const [state, formAction, pending] = useActionState(action, null);
  const [rows, setRows] = useDeviceDraftState("WorkplaceInspectionFieldwork_rows", () => initialRows(responses), !readOnly);
  const [online, setOnline] = useState(true);
  const [recovered, setRecovered] = useState(false);
  const [activeSectionKey, setActiveSectionKey] = useDeviceDraftState("WorkplaceInspectionFieldwork_activeSectionKey", null);
  const [validationError, setValidationError] = useState("");
  const [draftReady, setDraftReady] = useState(false);
  const storageKey = "rpg-wpi-draft-" + inspection.id;
  useEffect(() => {
    setOnline(navigator.onLine);
    const connected = () => setOnline(true);
    const disconnected = () => setOnline(false);
    window.addEventListener("online", connected);
    window.addEventListener("offline", disconnected);
    setDraftReady(true);
    return () => {
      window.removeEventListener("online", connected);
      window.removeEventListener("offline", disconnected);
    };
  }, [responses.length, storageKey]);
  useEffect(() => {
    if (state?.success) {
      try {
        localStorage.removeItem(storageKey);
      } catch {}
    }
  }, [state?.success, storageKey]);
  useEffect(() => {
    const restore = event => {
      if (readOnly || event.detail?.inspectionId !== inspection.id || !Array.isArray(event.detail.rows)) return;
      const savedById = new Map(event.detail.rows.map(row => [row.id, row]));
      if (savedById.size !== responses.length || !responses.every(response => savedById.has(response.id))) {
        setValidationError("The draft question set no longer matches this inspection. It was not restored.");
        return;
      }
      setRows(initialRows(responses).map(row => {
        const saved = savedById.get(row.id);
        const response = (() => {
          if (["yes", "no", "not_applicable", "not_assessed"].includes(saved.response)) {
            return saved.response;
          }
          return "not_assessed";
        })();
        return {
          ...row,
          "response": response,
          "comments_actions": String(saved.comments_actions || ""),
          "not_applicable_justification": String(saved.not_applicable_justification || ""),
          "finding_required": response === "no" || Boolean(saved.finding_required)
        };
      }));
      setRecovered(true);
      setValidationError("");
    };
    const clear = event => {
      if (event.detail?.inspectionId !== inspection.id) return;
      try {
        localStorage.removeItem(storageKey);
      } catch {}
      setRecovered(false);
    };
    window.addEventListener("wpi-restore-device-checklist", restore);
    window.addEventListener("wpi-clear-device-checklist", clear);
    return () => {
      window.removeEventListener("wpi-restore-device-checklist", restore);
      window.removeEventListener("wpi-clear-device-checklist", clear);
    };
  }, [inspection.id, responses, readOnly, storageKey]);
  const responseMap = useMemo(() => new Map(responses.map(item => [item.id, item])), [responses]);
  const assessed = rows.filter(item => item.response !== "not_assessed").length;
  const failed = rows.filter(item => item.response === "no").length;
  const progress = (() => {
    if (rows.length) {
      return Math.round(assessed / rows.length * 100);
    }
    return 0;
  })();
  const sections = useMemo(() => groupSections(rows, responseMap), [rows, responseMap]);
  const currentSection = sections.find(section => section.key === activeSectionKey) || sections[0];
  const sectionIndex = sections.findIndex(section => section.key === currentSection?.key);
  const completedSections = sections.filter(section => section.status === "Assessed").length;
  function selectSection(section) {
    setActiveSectionKey(section.key);
    setValidationError("");
  }
  function validateSave(event) {
    setValidationError("");
    const invalidSection = sections.find(section => section.items.some(({
      row
    }) => rowNeedsDetail(row) || row.comments_actions.length > 4000 || row.not_applicable_justification.length > 2000));
    if (invalidSection) {
      event.preventDefault();
      setActiveSectionKey(invalidSection.key);
      setValidationError("Check section " + invalidSection.code + ": add an observation for every No response and a justification for every N/A response. Observations allow 4,000 characters; justifications allow 2,000.");
    }
  }
  function changeRow(id, patch) {
    setRows(current => current.map(row => (() => {
      if (row.id === id) {
        return {
          ...row,
          ...patch
        };
      }
      return row;
    })()));
  }
  return <form action={formAction} onSubmit={validateSave} noValidate className="wpiFieldworkForm">
    <input type="hidden" name="inspection_id" value={inspection.id} />
    <input type="hidden" name="responses_json" value={JSON.stringify(rows)} />

    <section className="wpiFieldworkBar">
      <div><span>Assessment progress</span><strong>{assessed} of {rows.length} questions</strong><div className="wpiProgress"><i style={{
            "width": progress + "%"
          }} /></div></div>
      <div><span>Connection</span><strong className={(() => {
          if (online) {
            return "green";
          }
          return "amber";
        })()}>{(() => {
            if (online) {
              return "Online";
            }
            return "Offline draft";
          })()}</strong></div>
      <div><span>Potential findings</span><strong className={(() => {
          if (failed) {
            return "red";
          }
          return "green";
        })()}>{failed}</strong></div>
      <div><span>Completion</span><strong>{progress}%</strong></div>
    </section>

    {(() => {
      if (recovered) {
        return <div className="wpiMessage success"><strong>Local draft recovered</strong><span>Answers retained on this device have been restored. Save when connectivity is available.</span></div>;
      }
      return null;
    })()}
    {(() => {
      if (!online) {
        return <div className="wpiMessage error"><strong>You are working offline</strong><span>Your answers are being retained on this device. Do not clear browser data. Save after the connection returns.</span></div>;
      }
      return null;
    })()}
    {(() => {
      if (state?.error) {
        return <div className="wpiMessage error" role="alert"><strong>Fieldwork was not saved</strong><span>{state.error}</span></div>;
      }
      return null;
    })()}
    {(() => {
      if (state?.success) {
        return <div className="wpiMessage success" role="status"><strong>Fieldwork saved</strong><span>{state.success}</span></div>;
      }
      return null;
    })()}

    {(() => {
      if (validationError) {
        return <div className="wpiMessage error" role="alert">{validationError}</div>;
      }
      return null;
    })()}

    <section className="wpiPanel" aria-label="Checklist sections">
      <div className="wpiSectionHead"><div><small>CHECKLIST SECTIONS</small><h2>Inspection blocks</h2><p>Select a block to view its questions. Progress updates as you answer; use Save fieldwork to save all blocks.</p></div><span>{completedSections} of {sections.length} blocks assessed</span></div>
      <div style={{
        "display": "grid",
        "gridTemplateColumns": "repeat(auto-fit, minmax(min(100%, 210px), 1fr))",
        "gap": 12
      }}>
        {sections.map(section => {
          const selected = section.key === currentSection?.key;
          const tone = (() => {
            if (section.status === "Assessed") {
              return "#087958";
            }
            return (() => {
              if (section.incomplete) {
                return "#a32929";
              }
              return "#526b84";
            })();
          })();
          return <button key={section.key} type="button" aria-pressed={selected} aria-controls="wpi-active-section" onClick={() => selectSection(section)} style={{
            "display": "flex",
            "flexDirection": "column",
            "gap": 10,
            "minWidth": 0,
            "padding": 18,
            "border": (() => {
              if (selected) {
                return "2px solid #4254e8";
              }
              return "2px solid #d8e3ee";
            })(),
            "borderRadius": 12,
            "background": (() => {
              if (selected) {
                return "#f0f3ff";
              }
              return "#fff";
            })(),
            "color": "#163351",
            "textAlign": "left",
            "font": "inherit",
            "cursor": "pointer"
          }}>
            <span style={{
              "display": "flex",
              "justifyContent": "space-between",
              "gap": 10,
              "alignItems": "center"
            }}><strong style={{
                "fontSize": 21
              }}>{section.code}</strong><span style={{
                "color": tone,
                "fontSize": 12,
                "fontWeight": 700
              }}>{section.status}</span></span>
            <strong style={{
              "fontSize": 14,
              "lineHeight": 1.5,
              "overflowWrap": "anywhere"
            }}>{section.title}</strong>
            <span style={{
              "fontSize": 13
            }}>{section.assessed}/{section.items.length} questions · {section.progress}%</span>
            <span role="progressbar" aria-label={section.title + " assessment progress"} aria-valuenow={section.progress} aria-valuemin={0} aria-valuemax={100} style={{
              "display": "block",
              "height": 6,
              "background": "#dfe7f0",
              "borderRadius": 8,
              "width": "100%",
              "overflow": "hidden"
            }}><span style={{
                "display": "block",
                "height": "100%",
                "width": section.progress + "%",
                "background": "#087f6c"
              }} /></span>
            <span style={{
              "fontSize": 12,
              "color": (() => {
                if (section.failed) {
                  return "#a32929";
                }
                return "#526b84";
              })()
            }}>{section.failed} No responses{(() => {
                if (section.incomplete) {
                  return " · " + section.incomplete + " missing details";
                }
                return "";
              })()}</span>
          </button>;
        })}
      </div>
      <p style={{
        "margin": "16px 0 0",
        "color": "#61768d",
        "fontSize": 13,
        "lineHeight": 1.6
      }}>Assessed means each question has an answer and the required details. Findings, review and action verification are managed separately.</p>
    </section>

    {(() => {
      if (currentSection) {
        return <section id="wpi-active-section" aria-label={currentSection.title} style={{
          "display": "grid",
          "gap": 18,
          "minWidth": 0
        }}>
      <div className="wpiSectionHead" style={{
            "marginBottom": 0
          }}><div><small>BLOCK {currentSection.code} · {sectionIndex + 1} OF {sections.length}</small><h2 style={{
                "margin": 0
              }}>{currentSection.title}</h2></div><span>{currentSection.assessed}/{currentSection.items.length} assessed</span></div>
      <div className="wpiQuestionList">{currentSection.items.map(({
              row,
              question,
              index
            }) => {
              const failedQuestion = row.response === "no";
              const notApplicable = row.response === "not_applicable";
              return <article className={"wpiQuestion " + (() => {
                if (failedQuestion) {
                  return "failed";
                }
                return (() => {
                  if (row.response === "yes") {
                    return "passed";
                  }
                  return "";
                })();
              })()} key={row.id}>
        <header><div><small>{question.section_code} · {question.section_title}</small><h2>{question.question_code} · {question.question_text}</h2></div><span>{question.question_code}</span></header>
        <div className="wpiResponseChoices" role="radiogroup" aria-label={question.question_text}>
          <Choice label="Yes" value="yes" row={row} disabled={readOnly} changeRow={changeRow} />
          <Choice label="No" value="no" row={row} disabled={readOnly} changeRow={changeRow} />
          <Choice label="N/A" value="not_applicable" row={row} disabled={readOnly} changeRow={changeRow} />
          <Choice label="Not assessed" value="not_assessed" row={row} disabled={readOnly} changeRow={changeRow} />
        </div>
        <div className="wpiQuestionGrid">
          <label className="wpiField"><span>Observation, evidence or action{(() => {
                        if (failedQuestion) {
                          return " *";
                        }
                        return "";
                      })()}</span><textarea rows="3" maxLength={4000} value={row.comments_actions} required={failedQuestion} disabled={readOnly} onChange={event => changeRow(row.id, {
                      "comments_actions": event.target.value
                    })} placeholder="Record what was observed, the objective evidence checked and any immediate action." /></label>
          {(() => {
                    if (notApplicable) {
                      return <label className="wpiField"><span>N/A justification *</span><textarea rows="3" maxLength={2000} value={row.not_applicable_justification} required disabled={readOnly} onChange={event => changeRow(row.id, {
                          "not_applicable_justification": event.target.value
                        })} placeholder="Explain why this requirement does not apply to the inspected area." /></label>;
                    }
                    return <div className="wpiGuidance"><strong>Finding decision</strong><label className="wpiFindingToggle"><input type="checkbox" checked={row.finding_required || failedQuestion} disabled={readOnly || failedQuestion} onChange={event => changeRow(row.id, {
                          "finding_required": event.target.checked
                        })} /><span>Create or review a finding for this response</span></label><p>A “No” response always requires a finding decision before completion.</p></div>;
                  })()}
        </div>
        <details className="wpiQuestionGuidance"><summary>Inspector guidance and legal context</summary><div><strong>Practical guidance</strong><p>{question.inspector_guidance || "Confirm the control through observation, discussion and objective evidence."}</p><strong>Legislation and reference</strong><p>{question.legislation_guidance || "Apply relevant legal requirements and controlled organisational procedures."}</p></div></details>
      </article>;
            })}</div>
      <nav aria-label="Move between checklist blocks" style={{
            "display": "flex",
            "justifyContent": "space-between",
            "gap": 12,
            "flexWrap": "wrap"
          }}>
        <button type="button" className="wpiButton" disabled={sectionIndex <= 0} onClick={() => selectSection(sections[sectionIndex - 1])}>Previous block</button>
        <button type="button" className="wpiButton" disabled={sectionIndex >= sections.length - 1} onClick={() => selectSection(sections[sectionIndex + 1])}>Next block</button>
      </nav>
    </section>;
      }
      return <div className="wpiEmpty">No checklist questions are available.</div>;
    })()}

    {(() => {
      if (!readOnly) {
        return <footer className="wpiFormFooter"><p>Save answers from every block together. Switching blocks keeps your current answers.</p><button type="submit" disabled={pending || !online}>{(() => {
              if (pending) {
                return "Saving…";
              }
              return (() => {
                if (online) {
                  return "Save fieldwork";
                }
                return "Reconnect to save";
              })();
            })()}</button></footer>;
      }
      return null;
    })()}
  </form>;
}
function Choice({
  label,
  value,
  row,
  disabled,
  changeRow
}) {
  return <label className={(() => {
    if (row.response === value) {
      return "selected";
    }
    return "";
  })()}><input type="radio" name={"response-" + row.id} value={value} checked={row.response === value} disabled={disabled} onChange={() => changeRow(row.id, {
      "response": value,
      "finding_required": (() => {
        if (value === "no") {
          return true;
        }
        return row.finding_required;
      })()
    })} /><span>{label}</span></label>;
}
