"use client";

import { useActionState, useEffect, useMemo, useState } from "react";

function initialRows(responses) {
  return responses.map((item) => ({
    id: item.id,
    response: item.response || "not_assessed",
    comments_actions: item.comments_actions || "",
    not_applicable_justification: item.not_applicable_justification || "",
    finding_required: Boolean(item.finding_required),
  }));
}

export default function WorkplaceInspectionFieldwork({
  action,
  inspection,
  responses = [],
  readOnly = false,
}) {
  const [state, formAction, pending] = useActionState(action, null);
  const [rows, setRows] = useState(() => initialRows(responses));
  const [online, setOnline] = useState(true);
  const [recovered, setRecovered] = useState(false);
  const storageKey = "rpg-wpi-draft-" + inspection.id;

  useEffect(() => {
    setOnline(navigator.onLine);
    const connected = () => setOnline(true);
    const disconnected = () => setOnline(false);
    window.addEventListener("online", connected);
    window.addEventListener("offline", disconnected);

    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || "null");
      if (saved?.rows?.length === responses.length) {
        setRows(saved.rows);
        setRecovered(true);
      }
    } catch {}

    return () => {
      window.removeEventListener("online", connected);
      window.removeEventListener("offline", disconnected);
    };
  }, [responses.length, storageKey]);

  useEffect(() => {
    if (readOnly) return;
    localStorage.setItem(storageKey, JSON.stringify({ rows, updatedAt: new Date().toISOString() }));
  }, [readOnly, rows, storageKey]);

  useEffect(() => {
    if (state?.success) localStorage.removeItem(storageKey);
  }, [state?.success, storageKey]);

  const responseMap = useMemo(() => new Map(responses.map((item) => [item.id, item])), [responses]);
  const assessed = rows.filter((item) => item.response !== "not_assessed").length;
  const failed = rows.filter((item) => item.response === "no").length;
  const progress = rows.length ? Math.round(assessed / rows.length * 100) : 0;

  function changeRow(id, patch) {
    setRows((current) => current.map((row) => row.id === id ? { ...row, ...patch } : row));
  }

  return <form action={formAction} className="wpiFieldworkForm">
    <input type="hidden" name="inspection_id" value={inspection.id} />
    <input type="hidden" name="responses_json" value={JSON.stringify(rows)} />

    <section className="wpiFieldworkBar">
      <div><span>Assessment progress</span><strong>{assessed} of {rows.length} questions</strong><div className="wpiProgress"><i style={{ width: progress + "%" }} /></div></div>
      <div><span>Connection</span><strong className={online ? "green" : "amber"}>{online ? "Online" : "Offline draft"}</strong></div>
      <div><span>Potential findings</span><strong className={failed ? "red" : "green"}>{failed}</strong></div>
      <div><span>Completion</span><strong>{progress}%</strong></div>
    </section>

    {recovered ? <div className="wpiMessage success"><strong>Local draft recovered</strong><span>Answers retained on this device have been restored. Save when connectivity is available.</span></div> : null}
    {!online ? <div className="wpiMessage error"><strong>You are working offline</strong><span>Your answers are being retained on this device. Do not clear browser data. Save after the connection returns.</span></div> : null}
    {state?.error ? <div className="wpiMessage error" role="alert"><strong>Fieldwork was not saved</strong><span>{state.error}</span></div> : null}
    {state?.success ? <div className="wpiMessage success" role="status"><strong>Fieldwork saved</strong><span>{state.success}</span></div> : null}

    <div className="wpiQuestionList">{rows.map((row, index) => {
      const question = responseMap.get(row.id);
      const failedQuestion = row.response === "no";
      const notApplicable = row.response === "not_applicable";
      return <article className={"wpiQuestion " + (failedQuestion ? "failed" : row.response === "yes" ? "passed" : "")} key={row.id}>
        <header><div><small>{question.section_code} · {question.section_title}</small><h2>{index + 1}. {question.question_text}</h2></div><span>{question.question_code}</span></header>
        <div className="wpiResponseChoices" role="radiogroup" aria-label={question.question_text}>
          <Choice label="Yes" value="yes" row={row} disabled={readOnly} changeRow={changeRow} />
          <Choice label="No" value="no" row={row} disabled={readOnly} changeRow={changeRow} />
          <Choice label="N/A" value="not_applicable" row={row} disabled={readOnly} changeRow={changeRow} />
          <Choice label="Not assessed" value="not_assessed" row={row} disabled={readOnly} changeRow={changeRow} />
        </div>
        <div className="wpiQuestionGrid">
          <label className="wpiField"><span>Observation, evidence or action{failedQuestion ? " *" : ""}</span><textarea rows="3" value={row.comments_actions} required={failedQuestion} disabled={readOnly} onChange={(event) => changeRow(row.id, { comments_actions: event.target.value })} placeholder="Record what was observed, the objective evidence checked and any immediate action." /></label>
          {notApplicable ? <label className="wpiField"><span>N/A justification *</span><textarea rows="3" value={row.not_applicable_justification} required disabled={readOnly} onChange={(event) => changeRow(row.id, { not_applicable_justification: event.target.value })} placeholder="Explain why this requirement does not apply to the inspected area." /></label> : <div className="wpiGuidance"><strong>Finding decision</strong><label className="wpiFindingToggle"><input type="checkbox" checked={row.finding_required || failedQuestion} disabled={readOnly || failedQuestion} onChange={(event) => changeRow(row.id, { finding_required: event.target.checked })} /><span>Create or review a finding for this response</span></label><p>A “No” response always requires a finding decision before completion.</p></div>}
        </div>
        <details className="wpiQuestionGuidance"><summary>Inspector guidance and legal context</summary><div><strong>Practical guidance</strong><p>{question.inspector_guidance || "Confirm the control through observation, discussion and objective evidence."}</p><strong>Legislation and reference</strong><p>{question.legislation_guidance || "Apply relevant legal requirements and controlled organisational procedures."}</p></div></details>
      </article>;
    })}</div>

    {!readOnly ? <footer className="wpiFormFooter"><p>Answers are saved to the controlled record and retained locally until the save succeeds.</p><button type="submit" disabled={pending || !online}>{pending ? "Saving…" : online ? "Save fieldwork" : "Reconnect to save"}</button></footer> : null}
  </form>;
}

function Choice({ label, value, row, disabled, changeRow }) {
  return <label className={row.response === value ? "selected" : ""}><input type="radio" name={"response-" + row.id} value={value} checked={row.response === value} disabled={disabled} onChange={() => changeRow(row.id, { response: value, finding_required: value === "no" ? true : row.finding_required })} /><span>{label}</span></label>;
}
