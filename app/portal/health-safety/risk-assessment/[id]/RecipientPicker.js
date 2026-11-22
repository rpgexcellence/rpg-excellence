"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import s from "../../../documents/documents.module.css";
import styles from "./risk-record.module.css";

function SendButton({ disabled }) {
  const { pending } = useFormStatus();
  return <button type="submit" className={s.recordPrimary} disabled={disabled || pending}>
    {pending ? "Communicating…" : "Communicate & request acknowledgement"}
  </button>;
}

export default function RecipientPicker({ people, action }) {
  const [selected, setSelected] = useState([]);
  const [scope, setScope] = useState({ site: [], department: [] });
  const [search, setSearch] = useState("");
  const visible = people.filter(person =>
    (!scope.site.length || scope.site.includes(person.site)) &&
    (!scope.department.length || scope.department.includes(person.department)) &&
    [person.name, person.site, person.department].join(" ").toLowerCase().includes(search.trim().toLowerCase())
  );
  const toggle = (values, item) => values.includes(item) ? values.filter(value => value !== item) : [...values, item];
  return <form action={action} className={styles.distribution}>
    <fieldset className={s.recordPicker}>
      <legend>Choose recipients ({selected.length} selected)</legend>
      <div className={s.recipientFilters}>
        <label>Find recipients <input type="search" value={search} onChange={event => setSearch(event.target.value)}/></label>
        {[["site", "site", "sites"], ["department", "department", "departments"]].map(([key, label, plural]) =>
          <div className={styles.recipientFilter} key={key}><b>Filter by {label}</b>
            <details name="risk-distribution-filters" onKeyDown={event => {
              if (event.key === "Escape") {
                event.currentTarget.open = false;
                event.currentTarget.querySelector("summary")?.focus();
              }
            }}>
              <summary>{scope[key].length ? scope[key].length + " selected" : "All " + plural}</summary>
              <div className={styles.recipientOptions}>
                {[...new Set(people.map(person => person[key]))].sort().map(value => <label className={s.check} key={value}>
                  <input type="checkbox" checked={scope[key].includes(value)}
                    onChange={() => setScope(previous => ({ ...previous, [key]: toggle(previous[key], value) }))}/>{value}
                </label>)}
              </div>
            </details>
          </div>
        )}
      </div>
      <div className={s.links}>
        <button type="button" disabled={!visible.some(person => !selected.includes(person.id))}
          onClick={() => setSelected(previous => [...new Set([...previous, ...visible.map(person => person.id)])])}>Select all matching</button>
        <button type="button" disabled={!visible.some(person => selected.includes(person.id))}
          onClick={() => setSelected(previous => previous.filter(id => !visible.some(person => person.id === id)))}>Clear matching</button>
      </div>
      <div className={s.recordPickerList}>
        {visible.map(person => <label className={s.check} key={person.id}>
          <input type="checkbox" checked={selected.includes(person.id)} onChange={() => setSelected(previous => toggle(previous, person.id))}/>
          {person.name} · {person.department} · {person.site}
        </label>)}
        {!visible.length && <p className={s.muted}>No matching active company users.</p>}
      </div>
      {selected.map(id => <input type="hidden" key={id} name="recipient" value={id}/>)}
    </fieldset>
    <div className={styles.distributionBar}>
      <label>Acknowledgement due (optional) <input name="acknowledgement_due" type="date"/></label>
      <SendButton disabled={!selected.length}/>
    </div>
  </form>;
}
