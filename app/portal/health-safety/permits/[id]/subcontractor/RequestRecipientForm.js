"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import styles from "./requests.module.css";

function SendButton({ ready }) {
  const { pending } = useFormStatus();
  return <button type="submit" className="pcButton" disabled={pending || !ready}>
    {pending ? "Sending request…" : "Send subcontractor request"}
  </button>;
}

export default function RequestRecipientForm({ action, suppliers, lookupFailed, savedContactId, reference, task, scope }) {
  const savedSupplier = suppliers.find(supplier => supplier.contacts.some(contact => contact.id === savedContactId));
  const [source, setSource] = useState(suppliers.length ? "supplier" : "manual");
  const [supplierId, setSupplierId] = useState(savedSupplier?.id ?? "");
  const [contactId, setContactId] = useState(savedSupplier ? savedContactId : "");
  const supplier = suppliers.find(item => item.id === supplierId);
  const contact = supplier?.contacts.find(item => item.id === contactId);
  const directoryMessage = lookupFailed
    ? "The supplier directory could not be loaded. Enter the recipient manually or reload and try again."
    : "There are no supplier contacts with a business email. Enter the recipient manually or update the supplier directory.";

  return <form action={action} className={styles.form}>
    <fieldset className={styles.source}>
      <legend>Recipient source</legend>
      <label>
        <input type="radio" name="source" value="supplier" checked={source === "supplier"} disabled={!suppliers.length}
          onChange={() => setSource("supplier")} />
        Existing supplier contact
      </label>
      <label>
        <input type="radio" name="source" value="manual" checked={source === "manual"} onChange={() => setSource("manual")} />
        Enter email manually
      </label>
    </fieldset>

    {source === "supplier" ? <>
      <div className={styles.fields}>
        <label>Supplier
          <select name="supplierId" value={supplierId} required onChange={event => {
            setSupplierId(event.target.value);
            setContactId("");
          }}>
            <option value="">Select a supplier</option>
            {suppliers.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </label>
        <label>Supplier contact
          <select name="contactId" value={contactId} required disabled={!supplier} onChange={event => setContactId(event.target.value)}>
            <option value="">Select a contact</option>
            {supplier?.contacts.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </label>
      </div>
      {contact && <>
        <input type="hidden" name="reviewedEmail" value={contact.email} />
        <p className={styles.recipient}><strong>Invitation email</strong> {contact.email}</p>
      </>}
    </> : <>
      <label className={styles.email}>Subcontractor business email
        <input name="email" type="email" maxLength={254} required autoComplete="off" />
      </label>
      {!suppliers.length && <p className={styles.hint}>{directoryMessage}</p>}
    </>}

    <div className={styles.scope}>
      <strong>Job details shared with the recipient</strong>
      <dl className={styles.details}>
        <dt>Permit reference</dt><dd>{reference}</dd>
        <dt>Task description</dt><dd>{task}</dd>
        <dt>Scope limits</dt><dd>{scope}</dd>
      </dl>
    </div>
    <div className={styles.footer}>
      <p className={styles.hint}>Check the address and job details before sending. The link expires after three days or when the draft changes.</p>
      <SendButton ready={source === "manual" || Boolean(contact)} />
    </div>
  </form>;
}
