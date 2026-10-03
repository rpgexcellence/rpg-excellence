// Shared by the Module 9 editor and save action.
const list = (value) => Array.isArray(value) ? value : [];
const text = (value) => String(value ?? "").trim();
const normalise = (value) => text(value).toLowerCase().replace(/\s+/g, " ");

export function siteEmergencyContacts(profile) {
  let information = profile?.information_continuity || profile?.infosec_description;
  if (typeof information === "string") {
    try { information = JSON.parse(information); } catch { information = {}; }
  }
  const occurrences = new Map();
  return list(information?.emergencyContacts).filter((contact) => text(contact.serviceName) || text(contact.emergencyNumber) || text(contact.nonEmergencyNumber)).map((contact) => {
    // The Site Profile directory currently has no record IDs. Names, rather than
    // array positions or telephone numbers, keep links stable when reordered.
    const identity = JSON.stringify([normalise(contact.serviceType), normalise(contact.serviceName)]);
    const occurrence = (occurrences.get(identity) || 0) + 1;
    occurrences.set(identity, occurrence);
    return { ...contact, sourceKey: `${identity}:${occurrence}`, audience: [text(contact.serviceType), text(contact.serviceName)].filter(Boolean).join(" · ") };
  });
}

export function emergencyContactFor(row, profile) {
  return row.emergencySiteProfileId === profile?.id ? siteEmergencyContacts(profile).find((contact) => contact.sourceKey === row.emergencyContactKey) : null;
}

export function synchroniseEmergencyCommunications(rows, profile) {
  const contacts = siteEmergencyContacts(profile);
  const result = list(rows).map((row) => {
    const contact = emergencyContactFor(row, profile);
    return contact ? { ...row, audience: contact.audience, emergencyContactSnapshot: contact } : { ...row };
  });
  for (const contact of contacts) {
    if (result.some((row) => row.emergencySiteProfileId === profile.id && row.emergencyContactKey === contact.sourceKey)) continue;
    const candidates = result.filter((row) => !row.emergencyContactKey && !row.interestedPartyId && [contact.audience, contact.serviceName].some((value) => text(value) && normalise(row.audience) === normalise(value)));
    const sourceNames = contacts.filter((item) => normalise(item.serviceName) === normalise(contact.serviceName));
    const row = candidates.length === 1 && sourceNames.length === 1 ? candidates[0] : null;
    const link = { audience: contact.audience, emergencySiteProfileId: profile.id, emergencyContactKey: contact.sourceKey, emergencyContactSnapshot: contact };
    if (row) Object.assign(row, link);
    else result.push({ id: `emergency:${profile.id}:${contact.sourceKey}`, ...link, what: "Confirm incident type, exact site location, people affected, immediate hazards and access arrangements; provide updates requested by the responding service.", when: "When the incident requires this service, following the site's emergency arrangements; update as requested.", primaryMethod: "Telephone", primaryMethodSelections: ["Telephone"], fallbackMethod: "", ownerPersonId: "", logMethod: "Incident log: record contact time, service, information shared, instructions and reference number." });
  }
  return result;
}
