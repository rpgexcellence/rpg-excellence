// Load only the signed-in programme owner's company. Keep the directory ID
// through selection; derive the recorded name on the server when saving.
export async function loadFmeaCompanyPeople(client, userId) {
  const { data: organization, error: organizationError } = await client.from("organizations")
    .select("id").eq("owner_id", userId).order("created_at").limit(1).maybeSingle();
  if (organizationError) throw new Error(organizationError.message);
  if (!organization) return [];
  const { data, error } = await client.from("organization_people")
    .select("id,first_name,last_name,email,position")
    .eq("organization_id", organization.id).eq("account_status", "active")
    .order("last_name").order("first_name");
  if (error) throw new Error(error.message);
  return (data || []).map(person => ({
    id: person.id,
    name: [person.first_name, person.last_name].filter(Boolean).join(" ").trim(),
    email: person.email || "",
    position: person.position || "",
  }));
}

export function selectedFmeaCompanyPerson(people, personId) {
  const person = people.find(item => item.id === personId);
  if (!person || !person.name) throw new Error("Select an active lead auditor from your company user list. Refresh the page if their account has changed.");
  return person;
}
