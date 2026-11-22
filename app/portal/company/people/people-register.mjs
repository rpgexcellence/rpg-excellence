export const registerPath = "/portal/company/people";

export const statuses = [
  ["", "All people"],
  ["active", "Active"],
  ["invited", "Pending"],
  ["suspended", "Suspended"],
  ["directory", "Directory only"],
];

export const filterFields = [
  ["location", "Location", "All locations"],
  ["department", "Department", "All departments"],
  ["manager", "Manager", "All managers"],
];

export function personName(person) {
  return [person?.first_name, person?.last_name].filter(Boolean).join(" ").trim() || person?.email || "Unnamed person";
}

export function matchesStatus(person, status) {
  if (!status) return true;
  return status === "directory" ? person.account_type === "directory" : person.account_status === status;
}

function assignment(id, linkedLabel, legacyLabel, emptyLabel) {
  const previous = legacyLabel?.trim();
  if (id) return { value: id, label: linkedLabel || previous || "Unavailable assignment" };
  if (previous) return { value: "legacy:" + previous, label: previous };
  return { value: "unassigned", label: emptyLabel };
}

export function peopleRegister(people, sites, departments, params) {
  const peopleById = new Map(people.map(person => [person.id, person]));
  const choices = Object.fromEntries(filterFields.map(([key]) => [key, new Map()]));
  const rows = people.map(person => {
    const site = sites.get(person.site_id);
    const department = departments.get(person.department_id);
    const manager = peopleById.get(person.manager_person_id);
    const assignments = {
      location: assignment(person.site_id, site?.site_name, person.site, "Unassigned / across locations"),
      department: assignment(person.department_id, department?.name, person.department, "Unassigned department"),
      manager: assignment(person.manager_person_id, manager && personName(manager), null, "Unassigned manager"),
    };
    for (const [key, item] of Object.entries(assignments)) choices[key].set(item.value, item.label);
    return { person, assignments };
  });
  const status = statuses.some(([value]) => value === params?.status) ? params.status : "";
  const filters = Object.fromEntries(filterFields.map(([key]) => [key, choices[key].has(params?.[key]) ? params[key] : ""]));
  const visible = rows.filter(({ person, assignments }) => matchesStatus(person, status) &&
    filterFields.every(([key]) => !filters[key] || filters[key] === assignments[key].value));
  const options = Object.fromEntries(filterFields.map(([key]) => [key,
    [...choices[key]].sort((a, b) => a[1].localeCompare(b[1], "en-GB")),
  ]));
  return { status, filters, options, visible };
}

export function registerHref(params = {}, fragment = "") {
  const query = new URLSearchParams(Object.entries(params).filter(([, value]) => value));
  return registerPath + (query.size ? "?" + query : "") + fragment;
}
