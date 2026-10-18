"use client";

import { useActionState, useEffect, useMemo, useState } from "react";

export default function WorkplaceInspectionEvidenceManager({
  inspection,
  responses = [],
  findings = [],
  actions = [],
  evidence = [],
  addAction,
  downloadAction,
  readOnly = false,
}) {
  const [state, formAction, pending] = useActionState(addAction, null);
  const [downloadState, downloadFormAction, downloadPending] = useActionState(downloadAction, null);
  const [source, setSource] = useState("camera");
  const [preview, setPreview] = useState(null);
  const [online, setOnline] = useState(true);

  useEffect(() => {
    setOnline(navigator.onLine);
    const connected = () => setOnline(true);
    const disconnected = () => setOnline(false);
    window.addEventListener("online", connected);
    window.addEventListener("offline", disconnected);
    return () => {
      window.removeEventListener("online", connected);
      window.removeEventListener("offline", disconnected);
    };
  }, []);

  useEffect(() => {
    const target = downloadState?.signedUrl || downloadState?.externalUrl;
    if (target) window.location.assign(target);
  }, [downloadState]);

  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  const linkOptions = useMemo(() => [
    ...responses.map((item) => ({ value: "response:" + item.id, label: "Question · " + item.question_code + " · " + item.question_text })),
    ...findings.map((item) => ({ value: "finding:" + item.id, label: "Finding · " + item.finding_reference + " · " + item.title })),
    ...actions.map((item) => ({ value: "action:" + item.id, label: "Action · " + item.action_reference + " · " + item.action_text })),
  ], [responses, findings, actions]);

  function selectedFile(event) {
    const file = event.target.files?.[0];
    if (preview) URL.revokeObjectURL(preview);
    setPreview(file && file.type.startsWith("image/") ? URL.createObjectURL(file) : null);
  }

  function prepareSubmission(event) {
    const selection = new FormData(event.currentTarget).get("link_target");
    const [kind, id] = String(selection || "").split(":");
    const form = event.currentTarget;
    form.elements.response_id.value = kind === "response" ? id : "";
    form.elements.finding_id.value = kind === "finding" ? id : "";
    form.elements.action_id.value = kind === "action" ? id : "";
  }

  return <div className="wpiEvidenceWorkspace">
    {!readOnly ? <section className="wpiPanel"><div className="wpiSectionHead"><div><small>FIELD EVIDENCE</small><h2>Add supporting evidence</h2><p>Take a photograph, choose an existing file or record a controlled secure link.</p></div><span className={online ? "green" : "amber"}>{online ? "Online" : "Offline"}</span></div>
      {state?.error ? <Message tone="error" title="Evidence was not saved" text={state.error} /> : null}
      {state?.success ? <Message tone="success" title="Evidence saved" text={state.success} /> : null}
      {!online ? <Message tone="error" title="Upload paused" text="Keep the photograph or file on this device and upload it when connectivity returns." /> : null}

      <div className="wpiEvidenceSource"><button type="button" className={source === "camera" ? "selected" : ""} onClick={() => setSource("camera")}>Take photo</button><button type="button" className={source === "file" ? "selected" : ""} onClick={() => setSource("file")}>Choose file</button><button type="button" className={source === "link" ? "selected" : ""} onClick={() => setSource("link")}>Secure link</button></div>

      <form action={formAction} onSubmit={prepareSubmission} className="wpiProgrammeForm" encType="multipart/form-data">
        <input type="hidden" name="inspection_id" value={inspection.id} />
        <input type="hidden" name="response_id" value="" />
        <input type="hidden" name="finding_id" value="" />
        <input type="hidden" name="action_id" value="" />
        <input type="hidden" name="captured_offline" value={online ? "false" : "true"} />

        {source === "camera" ? <label className="wpiCamera"><input name="evidence_file" type="file" accept="image/*" capture="environment" required onChange={selectedFile} /><span><strong>Open camera</strong><small>Use the rear camera where supported. Check that the image does not expose unnecessary personal or confidential information.</small></span></label> : null}
        {source === "file" ? <label className="wpiCamera"><input name="evidence_file" type="file" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt" required onChange={selectedFile} /><span><strong>Choose photo or document</strong><small>Maximum file size: 10 MB.</small></span></label> : null}
        {source === "link" ? <label className="wpiField"><span>Secure external link *</span><input name="external_url" type="url" inputMode="url" required placeholder="https://" /></label> : null}
        {preview ? <div className="wpiPhotoPreview"><img src={preview} alt="Evidence preview" /><span>Preview only · the original file will be uploaded</span></div> : null}

        <div className="wpiFormGrid">
          <label className="wpiField"><span>Evidence title *</span><input name="title" required maxLength="180" placeholder="Clear description of the evidence" /></label>
          <label className="wpiField"><span>Evidence type *</span><select name="evidence_type" required defaultValue={source === "camera" ? "photograph" : "document"}><option value="photograph">Photograph</option><option value="document">Document</option><option value="record">Record</option><option value="interview">Interview</option><option value="observation">Observation</option><option value="measurement">Measurement</option><option value="test_result">Test result</option><option value="other">Other</option></select></label>
        </div>
        <label className="wpiField"><span>Link evidence to</span><select name="link_target" defaultValue=""><option value="">Overall inspection</option>{linkOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
        <label className="wpiField"><span>Description</span><textarea name="description" rows="3" maxLength="2000" placeholder="Explain what the evidence demonstrates and where it was obtained." /></label>
        <button className="wpiButton primary" type="submit" disabled={pending || !online}>{pending ? "Uploading…" : online ? "Add evidence" : "Reconnect to upload"}</button>
      </form>
    </section> : null}

    <section className="wpiPanel"><div className="wpiSectionHead"><div><small>CONTROLLED RECORDS</small><h2>Inspection evidence</h2><p>Evidence is private and accessed through short-lived secure download links.</p></div><span>{evidence.length} records</span></div>
      {downloadState?.error ? <Message tone="error" title="Evidence could not be opened" text={downloadState.error} /> : null}
      {evidence.length ? <div className="wpiEvidenceGrid">{evidence.map((item) => <article className="wpiEvidenceCard" key={item.id}><div className="wpiEvidenceIcon">{item.evidence_type === "photograph" ? "PHOTO" : item.evidence_type.replaceAll("_", " ").toUpperCase()}</div><div><strong>{item.title}</strong><small>{item.original_file_name || item.external_url || "Controlled evidence"}</small><p>{item.description || "No additional description."}</p><small>Added {formatDate(item.created_at)}</small></div><form action={downloadFormAction}><input type="hidden" name="inspection_id" value={inspection.id} /><input type="hidden" name="evidence_id" value={item.id} /><button className="wpiButton" type="submit" disabled={downloadPending}>{downloadPending ? "Opening…" : "Open"}</button></form></article>)}</div> : <div className="wpiEmpty">No evidence has yet been added to this inspection.</div>}
    </section>
  </div>;
}

function formatDate(value) {
  return value ? new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "Not recorded";
}

function Message({ tone, title, text }) {
  return <div className={"wpiMessage " + tone}><strong>{title}</strong><span>{text}</span></div>;
}
