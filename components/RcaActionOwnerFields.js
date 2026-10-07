export default function RcaActionOwnerFields({ people }) {
  const labelStyle = { display: "grid", gap: 8, minWidth: 0, fontWeight: 800, fontSize: 14 };
  const fieldStyle = { boxSizing: "border-box", width: "100%", minWidth: 0, height: 48, padding: "12px 14px", border: "1px solid #cfdae8", borderRadius: 10, background: "white", color: "#102640", fontSize: 16 };
  return <>
    <label style={labelStyle}>Action owner · company user *
      <select name="action_owner_person_id" required defaultValue="" disabled={!people.length} style={fieldStyle}>
        <option value="">Select company user</option>
        {people.map(person => <option key={person.id} value={person.id}>{person.name}{person.email ? ` · ${person.email}` : ""}</option>)}
      </select>
    </label>
    <label style={labelStyle}>Due date *<input type="date" name="due_date" required style={fieldStyle}/></label>
    {!people.length && <small style={{ gridColumn: "1 / -1", lineHeight: 1.5 }}>No active company users are available. Add or activate a user under <a href="/portal/company/people">Administration → People, Roles &amp; Access</a>, then refresh.</small>}
  </>;
}
