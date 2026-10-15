"use client";

import BCPModuleNavigation from "./BCPModuleNavigation";
import {
  useActionState,
  useMemo,
  useRef,
  useState,
} from "react";

const blankProcess = {
  name: "",
  description: "",
  owner: "",
  products: [],
  upstream: "",
  outputs: "",
  downstream: "",
  dependencyCategories: [],
  dependencyDetails: "",
  obligation: false,
  obligationDetails: "",
  stopsCritical: false,
  breachRisk: false,
  materialHarm: false,
  workableAlternative: true,
  biaOverride: "auto",
  saved: false,
};

const blankPerson = {
  name: "",
  role: "",
  email: "",
  phase: "Foundation",
};

const blankDependency = {
  name: "",
  category: "People and competence",
  processes: [],
  owner: "",
  providerLocation: "",
  minimumRequirement: "",
  requiredAvailability: "Operating hours",
  maximumOutageValue: "",
  maximumOutageUnit: "hours",
  existingResilience: "",
  alternative: "",
  alternativeAvailable: false,
  anotherSite: false,
  alternativeTested: false,
  sufficientCapacity: false,
  formalAgreement: false,
  singlePoint: false,
  lastTested: "",
  evidence: "",
  siteWide: false,
};

const blankInfoAsset = {
  name: "",
  assetType: "Controlled record",
  owner: "",
  classification: "Internal",
  processes: [],
  systemLocation: "",
  disruptionNeed: "Read access",
  lossImpactRating: "Medium",
  lossImpactDescription: "",
  financialLossValue: "",
  financialLossCurrency: "GBP",
  authoritativeSource: "",
  backupAvailable: "Unknown",
  offlineCopy: "Unknown",
  retention: "",
  retentionValue: "",
  retentionUnit: "years",
  obligation: "",
};

const blankSystem = {
  name: "",
  businessOwner: "",
  technicalOwner: "",
  hostingModel: "Cloud",
  hostingLocation: "",
  processes: [],
  authentication: "",
  backupFrequency: "",
  backupFrequencyValue: "",
  backupFrequencyUnit: "days",
  lastRestoreTest: "",
  redundancy: "",
  emergencyAccess: "",
  emergencyAccessRoute:
    "Break-glass admin account",
  emergencyAccessTrigger: "",
  emergencyAccessPrimary: "",
  emergencyAccessDeputy: "",
  emergencyAccessApprover: "",
  emergencyProcedureLocation: "",
  emergencyAccessLastTest: "",
  emergencyAccessTestResult: "Not tested",
  emergencyPostUseAction:
    "Record the incident, review activity, rotate credentials and revoke temporary access.",
  workaround: "",
  supplierContact: "",
  supplierId: "",
  supplierContactId: "",
};

const blankRemoteSupport = {
  provider: "",
  service: "",
  countryLocation: "",
  systemsData: "",
  accessRoute: "",
  supportHours: "",
  crossBorder: false,
  slaReference: "",
  emergencyContact: "",
  alternative: "",
  lastTest: "",
};

const blankEmergencyContact = {
  serviceType: "Fire and rescue service",
  serviceName: "",
  emergencyNumber: "",
  nonEmergencyNumber: "",
  address: "",
  travelTimeMinutes: "",
  accessNotes: "",
  directionsReference: "",
  lastVerified: "",
};

const serviceOptions = [
  "Customer support",
  "Manufacturing",
  "Materials testing",
  "Technical training",
  "Personnel certification",
  "Consultancy",
  "Digital platform",
  "Customer portal",
  "Product delivery",
  "Regulatory reporting",
];

const regionCountries = {
  Europe: [
    "Austria",
    "Belgium",
    "Bulgaria",
    "Croatia",
    "Cyprus",
    "Czech Republic",
    "Denmark",
    "Estonia",
    "Finland",
    "France",
    "Germany",
    "Greece",
    "Hungary",
    "Ireland",
    "Italy",
    "Latvia",
    "Lithuania",
    "Luxembourg",
    "Netherlands",
    "Norway",
    "Poland",
    "Portugal",
    "Romania",
    "Slovakia",
    "Slovenia",
    "Spain",
    "Sweden",
    "Switzerland",
    "United Kingdom",
  ],

  Africa: [
    "Algeria",
    "Angola",
    "Botswana",
    "Egypt",
    "Ethiopia",
    "Ghana",
    "Kenya",
    "Morocco",
    "Mozambique",
    "Namibia",
    "Nigeria",
    "Rwanda",
    "Senegal",
    "South Africa",
    "Tanzania",
    "Tunisia",
    "Uganda",
    "Zambia",
    "Zimbabwe",
  ],

  "Middle East": [
    "Bahrain",
    "Israel",
    "Jordan",
    "Kuwait",
    "Lebanon",
    "Oman",
    "Qatar",
    "Saudi Arabia",
    "Turkey",
    "United Arab Emirates",
  ],

  "Asia-Pacific": [
    "Australia",
    "Bangladesh",
    "China",
    "Hong Kong",
    "India",
    "Indonesia",
    "Japan",
    "Malaysia",
    "New Zealand",
    "Pakistan",
    "Philippines",
    "Singapore",
    "South Korea",
    "Sri Lanka",
    "Taiwan",
    "Thailand",
    "Vietnam",
  ],

  "North America": [
    "Canada",
    "Mexico",
    "United States",
  ],

  "Latin America and Caribbean": [
    "Argentina",
    "Bahamas",
    "Barbados",
    "Brazil",
    "Chile",
    "Colombia",
    "Costa Rica",
    "Dominican Republic",
    "Ecuador",
    "Jamaica",
    "Panama",
    "Peru",
    "Trinidad and Tobago",
    "Uruguay",
  ],
};

const countryLocations = {
  "United Kingdom": [
    "Belfast",
    "Birmingham",
    "Bristol",
    "Cardiff",
    "Edinburgh",
    "Glasgow",
    "Leeds",
    "Liverpool",
    "London",
    "Manchester",
    "Newcastle",
    "Nottingham",
    "Sheffield",
  ],

  "United States": [
    "Atlanta",
    "Boston",
    "Chicago",
    "Dallas",
    "Denver",
    "Houston",
    "Los Angeles",
    "Miami",
    "New York",
    "Philadelphia",
    "Phoenix",
    "San Francisco",
    "Seattle",
    "Washington DC",
  ],

  Canada: [
    "Calgary",
    "Edmonton",
    "Montreal",
    "Ottawa",
    "Toronto",
    "Vancouver",
  ],

  Mexico: [
    "Guadalajara",
    "Mexico City",
    "Monterrey",
  ],

  France: [
    "Bordeaux",
    "Lille",
    "Lyon",
    "Marseille",
    "Paris",
    "Toulouse",
  ],

  Germany: [
    "Berlin",
    "Cologne",
    "Düsseldorf",
    "Frankfurt",
    "Hamburg",
    "Munich",
    "Stuttgart",
  ],

  Poland: [
    "Gdańsk",
    "Katowice",
    "Kraków",
    "Łódź",
    "Poznań",
    "Warsaw",
    "Wrocław",
  ],

  Ireland: [
    "Cork",
    "Dublin",
    "Galway",
    "Limerick",
  ],

  Spain: [
    "Barcelona",
    "Bilbao",
    "Madrid",
    "Seville",
    "Valencia",
  ],

  Italy: [
    "Bologna",
    "Milan",
    "Naples",
    "Rome",
    "Turin",
  ],

  "South Africa": [
    "Cape Town",
    "Durban",
    "Johannesburg",
    "Pretoria",
  ],

  Nigeria: [
    "Abuja",
    "Lagos",
    "Port Harcourt",
  ],

  Kenya: [
    "Mombasa",
    "Nairobi",
  ],

  "United Arab Emirates": [
    "Abu Dhabi",
    "Dubai",
    "Sharjah",
  ],

  "Saudi Arabia": [
    "Dammam",
    "Jeddah",
    "Riyadh",
  ],

  India: [
    "Ahmedabad",
    "Bengaluru",
    "Chennai",
    "Delhi",
    "Hyderabad",
    "Kolkata",
    "Mumbai",
    "Pune",
  ],

  China: [
    "Beijing",
    "Chengdu",
    "Guangzhou",
    "Shanghai",
    "Shenzhen",
  ],

  Australia: [
    "Adelaide",
    "Brisbane",
    "Melbourne",
    "Perth",
    "Sydney",
  ],

  Japan: [
    "Fukuoka",
    "Nagoya",
    "Osaka",
    "Tokyo",
  ],

  Singapore: ["Singapore"],

  Brazil: [
    "Brasília",
    "Curitiba",
    "Rio de Janeiro",
    "São Paulo",
  ],

  Argentina: [
    "Buenos Aires",
    "Córdoba",
    "Rosario",
  ],
};

const dependencyCategories = [
  "People and competence",
  "Premises and workspace",
  "Technology, systems and data",
  "Equipment and consumables",
  "Utilities",
  "Suppliers and outsourced services",
  "Transport and logistics",
  "Communications",
  "Finance and insurance",
  "Information and records",
];

const personName = (person) =>
  (
    (person?.first_name || "") +
    " " +
    (person?.last_name || "")
  ).trim();

function Guidance({ children }) {
  return (
    <div className="spxGuide">
      <b>Guidance</b>
      <span>{children}</span>
    </div>
  );
}

function PersonSelect({
  value = "",
  onChange,
  name,
  people = [],
  required = false,
  placeholder =
    "Select an approved Company User",
}) {
  const options = people
    .map((person) => ({
      name: personName(person),
      email: person.email || "",
      position: person.position || "",
    }))
    .filter((person) => person.name);

  return (
    <select
      name={name}
      value={value}
      required={required}
      onChange={(event) =>
        onChange?.(
          event.target.value,
          options.find(
            (person) =>
              person.name ===
              event.target.value,
          ),
        )
      }
    >
      <option value="">
        {options.length
          ? placeholder
          : "No approved Company Users available"}
      </option>

      {options.map((person) => (
        <option
          key={
            person.name +
            person.email
          }
          value={person.name}
        >
          {person.name}
          {person.position
            ? " — " + person.position
            : ""}
        </option>
      ))}
    </select>
  );
}

const steps = [
  [
    "identity",
    "Site identity",
    "Boundary, leaders and accountability",
  ],

  [
    "operations",
    "Operational profile",
    "Products, services and operating pattern",
  ],

  [
    "value",
    "Value-chain processes",
    "Activities that create or deliver value",
  ],

  [
    "support",
    "Support processes",
    "Enabling activities and owners",
  ],

  [
    "dependencies",
    "Dependencies",
    "People, premises, technology and supply",
  ],

  [
    "security",
    "Information and technology continuity",
    "Essential information, ICT recovery and remote support",
  ],

  [
    "learning",
    "BCP participants",
    "Awareness and role-specific learning",
  ],

  [
    "emergency",
    "Emergency services",
    "Fire, hospital, police and emergency contacts",
  ],
];

const governanceStyles =
  ".spxFormError{display:grid;gap:4px;margin-bottom:14px;padding:13px 16px;border:1px solid #f0b5ad;border-radius:10px;background:#fff1ef;color:#9c241a}" +
  ".spxFormError span{font-size:12px}" +
  ".spxGuide{display:grid;gap:4px;margin:0 0 16px;padding:13px 15px;border-left:4px solid #2863e7;border-radius:9px;background:#edf4ff;color:#234565}" +
  ".spxGuide b{color:#174fb5;font-size:12px;text-transform:uppercase;letter-spacing:.06em}" +
  ".spxGuide span{font-size:13px;line-height:1.5}" +
  ".spxUnitField{display:grid;grid-template-columns:minmax(0,1fr) 150px;gap:8px}" +
  ".spxScreenSelect{display:grid!important;grid-template-columns:minmax(0,1fr) 190px!important;align-items:center!important;padding:8px 0;border-bottom:1px solid #e1e8ef}" +
  ".spxScreenSelect select{padding:10px!important}" +
  ".spxSelectReset{justify-self:start;padding:5px 0;border:0;background:transparent;color:#1c5bd4;font-size:12px;font-weight:850;cursor:pointer;text-decoration:underline}" +
  ".spxGovernance{margin-top:18px;padding:18px;border:1px solid #c9d8ea;border-radius:13px;background:#f3f7ff}" +
  ".spxGovernance header div{display:grid;gap:4px}" +
  ".spxGovernance header small{color:#536f8e;text-transform:capitalize}" +
  ".spxGovernance p{margin:14px 0 0;color:#60778e;font-size:11px}" +
  ".spxFooter>div:first-child{display:flex;gap:7px}" +
  ".spxFooter button.danger{border-color:#efbcb5;background:#fff3f1;color:#b42318}" +
  ".spxFooter button:disabled{opacity:.45;cursor:not-allowed}" +
  "@media(max-width:600px){.spxGovernance{padding:13px}.spxFooter>div:first-child{display:grid}.spxUnitField,.spxScreenSelect{grid-template-columns:1fr!important}}";

function ProcessRepeater({
  items,
  setItems,
  support = false,
  services = [],
  relatedProcesses = [],
}) {
  const processDependencyCategories = [
    "People and competencies",
    "Technology and data",
    "Premises and utilities",
    "Equipment",
    "Suppliers",
    "Information and records",
  ];

  const ownerRoles = [
    "Commercial Manager",
    "Operations Manager",
    "Site Manager",
    "Quality Manager",
    "IT Manager",
    "HR Manager",
    "Finance Manager",
    "Supply Chain Manager",
    "Facilities Manager",
    "Process Owner",
    "Other",
  ];

  const update = (
    index,
    key,
    value,
  ) =>
    setItems(
      items.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              [key]: value,
            }
          : item,
      ),
    );

  const toggle = (
    index,
    key,
    value,
  ) =>
    update(
      index,
      key,
      (
        items[index][key] || []
      ).includes(value)
        ? (
            items[index][key] || []
          ).filter(
            (item) =>
              item !== value,
          )
        : [
            ...(
              items[index][key] ||
              []
            ),
            value,
          ],
    );

  const recommendation = (item) =>
    item.biaOverride === "yes" ||
    (item.biaOverride !== "no" &&
      (item.stopsCritical ||
        item.breachRisk ||
        item.materialHarm ||
        !item.workableAlternative));

  const processNames = [
    ...new Set(
      [
        ...relatedProcesses.map(
          (item) => item?.name,
        ),
        ...items.map(
          (item) => item?.name,
        ),
      ].filter(Boolean),
    ),
  ];

  return (
    <div className="spxRepeater">
      {!support &&
        processNames.length > 0 && (
          <div className="spxChain">
            {processNames.map(
              (name, index) => (
                <span
                  key={
                    name + index
                  }
                >
                  <b>{name}</b>

                  {index <
                    processNames.length -
                      1 && <i>→</i>}
                </span>
              ),
            )}
          </div>
        )}

      {items.map((item, index) => {
        const bia =
          recommendation(item);

        const upstreamOptions = [
          ...new Set([
            "Customer enquiry",
            ...processNames.filter(
              (name) =>
                name !== item.name,
            ),
            "External supplier or trigger",
            "Other",
          ]),
        ];

        const downstreamOptions = [
          ...new Set([
            ...processNames.filter(
              (name) =>
                name !== item.name,
            ),
            "Customer",
            "Regulator or accreditation body",
            "Operational planning",
            "Other",
          ]),
        ];

        if (item.saved) {
          return (
            <article
              className="spxProcessSummary"
              key={index}
            >
              <div>
                <b>
                  {String(
                    index + 1,
                  ).padStart(
                    2,
                    "0",
                  )}
                </b>

                <span>
                  <strong>
                    {item.name ||
                      (support
                        ? "Support"
                        : "Value-chain") +
                        " process " +
                        (index + 1)}
                  </strong>

                  <small>
                    {item.owner ||
                      "Owner not assigned"}
                    {" · "}
                    {(item.products ||
                      []).join(", ") ||
                      "No service linked"}
                  </small>
                </span>
              </div>

              <mark
                className={
                  bia
                    ? "high"
                    : ""
                }
              >
                {bia
                  ? "BIA recommended"
                  : "Initial screening complete"}
              </mark>

              <nav>
                <button
                  type="button"
                  onClick={() =>
                    update(
                      index,
                      "saved",
                      false,
                    )
                  }
                >
                  Edit
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setItems([
                      ...items,
                      {
                        ...item,
                        name:
                          (item.name ||
                            "Process") +
                          " copy",
                        saved: false,
                      },
                    ])
                  }
                >
                  Duplicate
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setItems(
                      items.filter(
                        (
                          _item,
                          itemIndex,
                        ) =>
                          itemIndex !==
                          index,
                      ),
                    )
                  }
                >
                  Delete
                </button>
              </nav>
            </article>
          );
        }

        return (
          <article key={index}>
            <header>
              <div>
                <b>
                  {String(
                    index + 1,
                  ).padStart(
                    2,
                    "0",
                  )}
                </b>

                <strong>
                  {item.name ||
                    (support
                      ? "Support"
                      : "Value-chain") +
                      " process " +
                      (index + 1)}
                </strong>
              </div>

              <button
                type="button"
                onClick={() =>
                  setItems(
                    items.filter(
                      (
                        _item,
                        itemIndex,
                      ) =>
                        itemIndex !==
                        index,
                    ),
                  )
                }
              >
                Remove
              </button>
            </header>

            <div className="spxGrid">
              <label>
                Process name

                <input
                  value={
                    item.name || ""
                  }
                  onChange={(event) =>
                    update(
                      index,
                      "name",
                      event.target
                        .value,
                    )
                  }
                  placeholder={
                    support
                      ? "e.g. IT service management"
                      : "e.g. Product delivery"
                  }
                />
              </label>

              <fieldset className="spxChoice">
                <legend>
                  Process owner *
                </legend>

                <div>
                  {ownerRoles.map(
                    (role) => (
                      <button
                        type="button"
                        key={role}
                        className={
                          item.owner ===
                          role
                            ? "selected"
                            : ""
                        }
                        onClick={() =>
                          update(
                            index,
                            "owner",
                            role,
                          )
                        }
                      >
                        {item.owner ===
                        role
                          ? "✓ "
                          : "+ "}
                        {role}
                      </button>
                    ),
                  )}
                </div>
              </fieldset>

              <label className="wide">
                Purpose and boundary

                <textarea
                  value={
                    item.description ||
                    ""
                  }
                  onChange={(event) =>
                    update(
                      index,
                      "description",
                      event.target
                        .value,
                    )
                  }
                  rows="2"
                  placeholder="Briefly describe what starts and ends this process"
                />
              </label>

              <fieldset className="wide spxChoice">
                <legend>
                  Products/services
                  supported *
                </legend>

                <p>
                  Select from the
                  services identified
                  in Step 2.
                </p>

                <div>
                  {services.length ? (
                    services.map(
                      (service) => (
                        <button
                          type="button"
                          key={service}
                          className={
                            (
                              item.products ||
                              []
                            ).includes(
                              service,
                            )
                              ? "selected"
                              : ""
                          }
                          onClick={() =>
                            toggle(
                              index,
                              "products",
                              service,
                            )
                          }
                        >
                          {(
                            item.products ||
                            []
                          ).includes(
                            service,
                          )
                            ? "✓ "
                            : "+ "}
                          {service}
                        </button>
                      ),
                    )
                  ) : (
                    <span>
                      Add products or
                      services in Step
                      2 first.
                    </span>
                  )}
                </div>
              </fieldset>
