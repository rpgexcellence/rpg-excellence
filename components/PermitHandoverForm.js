"use client";

import { useState } from "react";

const personName = (person) =>
  [person.first_name, person.last_name].filter(Boolean).join(" ").trim() ||
  person.email;

export default function PermitHandoverForm({
  action,
  permitId,
  people = [],
}) {
  const [outgoingPersonId, setOutgoingPersonId] = useState("");
  const [incomingPersonId, setIncomingPersonId] = useState("");

  const outgoing = people.find((person) => person.id === outgoingPersonId);
  const incoming = people.find((person) => person.id === incomingPersonId);
  const incomingPeople = people.filter(
    (person) => person.id !== outgoingPersonId,
  );
  const ready = Boolean(outgoing && incoming && outgoing.id !== incoming.id);

  function selectOutgoing(event) {
    const nextOutgoingId = event.target.value;
    setOutgoingPersonId(nextOutgoingId);
    if (nextOutgoingId === incomingPersonId) setIncomingPersonId("");
  }

  return (
    <form action={action} className="ctForm">
      <input type="hidden" name="permit_id" value={permitId} />

      <label>
        Outgoing person in charge *
        <select
          name="outgoing_person_id"
          required
          value={outgoingPersonId}
          onChange={selectOutgoing}
        >
          <option value="">Select active company user</option>
          {people.map((person) => (
            <option key={person.id} value={person.id}>
              {personName(person)}
              {person.position ? ` — ${person.position}` : ""}
            </option>
          ))}
        </select>
      </label>

      <label>
        Incoming person in charge *
        <select
          name="incoming_person_id"
          required
          value={incomingPersonId}
          onChange={(event) => setIncomingPersonId(event.target.value)}
          disabled={!outgoingPersonId}
        >
          <option value="">
            {outgoingPersonId
              ? "Select a different company user"
              : "Select the outgoing person first"}
          </option>
          {incomingPeople.map((person) => (
            <option key={person.id} value={person.id}>
              {personName(person)}
              {person.position ? ` — ${person.position}` : ""}
            </option>
          ))}
        </select>
      </label>

      <p className="ctGuide full">
        {ready
          ? `${personName(outgoing)} will hand control of the permit to ${personName(incoming)}.`
          : "Select two different active Company Users. A person cannot hand the permit over to themselves."}
      </p>

      <label className="full">
        Current work status *
        <textarea
          name="work_status"
          required
          placeholder="Describe work completed, the present plant condition and the exact point where work will resume."
        />
      </label>
      <label>
        Outstanding hazards
        <textarea
          name="outstanding_hazards"
          placeholder="Record remaining or newly identified hazards and required controls."
        />
      </label>
      <label>
        Isolations remaining
        <textarea
          name="isolations_remaining"
          placeholder="Identify each isolation that must remain in place."
        />
      </label>
      <label>
        Revised validity end
        <input type="datetime-local" name="revised_valid_until" />
      </label>
      <button className="ctButton" disabled={!ready}>
        Record and submit handover
      </button>
    </form>
  );
}
