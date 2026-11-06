"use client";

import { useId, useRef, useState } from "react";
import styles from "./PartnerProgramme.module.css";

const interests = ["Referral partner", "Consultancy partner", "Training partner", "Explore the options"];
const standards = ["Other / not sure", "ISO 9001", "ISO 14001", "ISO 45001", "ISO 22301", "ISO/IEC 27001", "ISO/IEC 17025", "ISO/IEC 17024", "ISO 19011", "AS9100", "Integrated management system"];


export const countryOptions = [
  {
    "value": "WORLDWIDE",
    "label": "Worldwide"
  },
  {
    "value": "AF",
    "label": "Afghanistan"
  },
  {
    "value": "AX",
    "label": "Åland Islands"
  },
  {
    "value": "AL",
    "label": "Albania"
  },
  {
    "value": "DZ",
    "label": "Algeria"
  },
  {
    "value": "AS",
    "label": "American Samoa"
  },
  {
    "value": "AD",
    "label": "Andorra"
  },
  {
    "value": "AO",
    "label": "Angola"
  },
  {
    "value": "AI",
    "label": "Anguilla"
  },
  {
    "value": "AQ",
    "label": "Antarctica"
  },
  {
    "value": "AG",
    "label": "Antigua & Barbuda"
  },
  {
    "value": "AR",
    "label": "Argentina"
  },
  {
    "value": "AM",
    "label": "Armenia"
  },
  {
    "value": "AW",
    "label": "Aruba"
  },
  {
    "value": "AU",
    "label": "Australia"
  },
  {
    "value": "AT",
    "label": "Austria"
  },
  {
    "value": "AZ",
    "label": "Azerbaijan"
  },
  {
    "value": "BS",
    "label": "Bahamas"
  },
  {
    "value": "BH",
    "label": "Bahrain"
  },
  {
    "value": "BD",
    "label": "Bangladesh"
  },
  {
    "value": "BB",
    "label": "Barbados"
  },
  {
    "value": "BY",
    "label": "Belarus"
  },
  {
    "value": "BE",
    "label": "Belgium"
  },
  {
    "value": "BZ",
    "label": "Belize"
  },
  {
    "value": "BJ",
    "label": "Benin"
  },
  {
    "value": "BM",
    "label": "Bermuda"
  },
  {
    "value": "BT",
    "label": "Bhutan"
  },
  {
    "value": "BO",
    "label": "Bolivia"
  },
  {
    "value": "BA",
    "label": "Bosnia & Herzegovina"
  },
  {
    "value": "BW",
    "label": "Botswana"
  },
  {
    "value": "BV",
    "label": "Bouvet Island"
  },
  {
    "value": "BR",
    "label": "Brazil"
  },
  {
    "value": "IO",
    "label": "British Indian Ocean Territory"
  },
  {
    "value": "VG",
    "label": "British Virgin Islands"
  },
  {
    "value": "BN",
    "label": "Brunei"
  },
  {
    "value": "BG",
    "label": "Bulgaria"
  },
  {
    "value": "BF",
    "label": "Burkina Faso"
  },
  {
    "value": "BI",
    "label": "Burundi"
  },
  {
    "value": "KH",
    "label": "Cambodia"
  },
  {
    "value": "CM",
    "label": "Cameroon"
  },
  {
    "value": "CA",
    "label": "Canada"
  },
  {
    "value": "CV",
    "label": "Cape Verde"
  },
  {
    "value": "BQ",
    "label": "Caribbean Netherlands"
  },
  {
    "value": "KY",
    "label": "Cayman Islands"
  },
  {
    "value": "CF",
    "label": "Central African Republic"
  },
  {
    "value": "TD",
    "label": "Chad"
  },
  {
    "value": "CL",
    "label": "Chile"
  },
  {
    "value": "CN",
    "label": "China"
  },
  {
    "value": "CX",
    "label": "Christmas Island"
  },
  {
    "value": "CC",
    "label": "Cocos (Keeling) Islands"
  },
  {
    "value": "CO",
    "label": "Colombia"
  },
  {
    "value": "KM",
    "label": "Comoros"
  },
  {
    "value": "CG",
    "label": "Congo - Brazzaville"
  },
  {
    "value": "CD",
    "label": "Congo - Kinshasa"
  },
  {
    "value": "CK",
    "label": "Cook Islands"
  },
  {
    "value": "CR",
    "label": "Costa Rica"
  },
  {
    "value": "CI",
    "label": "Côte d’Ivoire"
  },
  {
    "value": "HR",
    "label": "Croatia"
  },
  {
    "value": "CU",
    "label": "Cuba"
  },
  {
    "value": "CW",
    "label": "Curaçao"
  },
  {
    "value": "CY",
    "label": "Cyprus"
  },
  {
    "value": "CZ",
    "label": "Czechia"
  },
  {
    "value": "DK",
    "label": "Denmark"
  },
  {
    "value": "DJ",
    "label": "Djibouti"
  },
  {
    "value": "DM",
    "label": "Dominica"
  },
  {
    "value": "DO",
    "label": "Dominican Republic"
  },
  {
    "value": "EC",
    "label": "Ecuador"
  },
  {
    "value": "EG",
    "label": "Egypt"
  },
  {
    "value": "SV",
    "label": "El Salvador"
  },
  {
    "value": "GQ",
    "label": "Equatorial Guinea"
  },
  {
    "value": "ER",
    "label": "Eritrea"
  },
  {
    "value": "EE",
    "label": "Estonia"
  },
  {
    "value": "SZ",
    "label": "Eswatini"
  },
  {
    "value": "ET",
    "label": "Ethiopia"
  },
  {
    "value": "FK",
    "label": "Falkland Islands"
  },
  {
    "value": "FO",
    "label": "Faroe Islands"
  },
  {
    "value": "FJ",
    "label": "Fiji"
  },
  {
    "value": "FI",
    "label": "Finland"
  },
  {
    "value": "FR",
    "label": "France"
  },
  {
    "value": "GF",
    "label": "French Guiana"
  },
  {
    "value": "PF",
    "label": "French Polynesia"
  },
  {
    "value": "TF",
    "label": "French Southern Territories"
  },
  {
    "value": "GA",
    "label": "Gabon"
  },
  {
    "value": "GM",
    "label": "Gambia"
  },
  {
    "value": "GE",
    "label": "Georgia"
  },
  {
    "value": "DE",
    "label": "Germany"
  },
  {
    "value": "GH",
    "label": "Ghana"
  },
  {
    "value": "GI",
    "label": "Gibraltar"
  },
  {
    "value": "GR",
    "label": "Greece"
  },
  {
    "value": "GL",
    "label": "Greenland"
  },
  {
    "value": "GD",
    "label": "Grenada"
  },
  {
    "value": "GP",
    "label": "Guadeloupe"
  },
  {
    "value": "GU",
    "label": "Guam"
  },
  {
    "value": "GT",
    "label": "Guatemala"
  },
  {
    "value": "GG",
    "label": "Guernsey"
  },
  {
    "value": "GN",
    "label": "Guinea"
  },
  {
    "value": "GW",
    "label": "Guinea-Bissau"
  },
  {
    "value": "GY",
    "label": "Guyana"
  },
  {
    "value": "HT",
    "label": "Haiti"
  },
  {
    "value": "HM",
    "label": "Heard & McDonald Islands"
  },
  {
    "value": "HN",
    "label": "Honduras"
  },
  {
    "value": "HK",
    "label": "Hong Kong SAR China"
  },
  {
    "value": "HU",
    "label": "Hungary"
  },
  {
    "value": "IS",
    "label": "Iceland"
  },
  {
    "value": "IN",
    "label": "India"
  },
  {
    "value": "ID",
    "label": "Indonesia"
  },
  {
    "value": "IR",
    "label": "Iran"
  },
  {
    "value": "IQ",
    "label": "Iraq"
  },
  {
    "value": "IE",
    "label": "Ireland"
  },
  {
    "value": "IM",
    "label": "Isle of Man"
  },
  {
    "value": "IL",
    "label": "Israel"
  },
  {
    "value": "IT",
    "label": "Italy"
  },
  {
    "value": "JM",
    "label": "Jamaica"
  },
  {
    "value": "JP",
    "label": "Japan"
  },
  {
    "value": "JE",
    "label": "Jersey"
  },
  {
    "value": "JO",
    "label": "Jordan"
  },
  {
    "value": "KZ",
    "label": "Kazakhstan"
  },
  {
    "value": "KE",
    "label": "Kenya"
  },
  {
    "value": "KI",
    "label": "Kiribati"
  },
  {
    "value": "KW",
    "label": "Kuwait"
  },
  {
    "value": "KG",
    "label": "Kyrgyzstan"
  },
  {
    "value": "LA",
    "label": "Laos"
  },
  {
    "value": "LV",
    "label": "Latvia"
  },
  {
    "value": "LB",
    "label": "Lebanon"
  },
  {
    "value": "LS",
    "label": "Lesotho"
  },
  {
    "value": "LR",
    "label": "Liberia"
  },
  {
    "value": "LY",
    "label": "Libya"
  },
  {
    "value": "LI",
    "label": "Liechtenstein"
  },
  {
    "value": "LT",
    "label": "Lithuania"
  },
  {
    "value": "LU",
    "label": "Luxembourg"
  },
  {
    "value": "MO",
    "label": "Macao SAR China"
  },
  {
    "value": "MG",
    "label": "Madagascar"
  },
  {
    "value": "MW",
    "label": "Malawi"
  },
  {
    "value": "MY",
    "label": "Malaysia"
  },
  {
    "value": "MV",
    "label": "Maldives"
  },
  {
    "value": "ML",
    "label": "Mali"
  },
  {
    "value": "MT",
    "label": "Malta"
  },
  {
    "value": "MH",
    "label": "Marshall Islands"
  },
  {
    "value": "MQ",
    "label": "Martinique"
  },
  {
    "value": "MR",
    "label": "Mauritania"
  },
  {
    "value": "MU",
    "label": "Mauritius"
  },
  {
    "value": "YT",
    "label": "Mayotte"
  },
  {
    "value": "MX",
    "label": "Mexico"
  },
  {
    "value": "FM",
    "label": "Micronesia"
  },
  {
    "value": "MD",
    "label": "Moldova"
  },
  {
    "value": "MC",
    "label": "Monaco"
  },
  {
    "value": "MN",
    "label": "Mongolia"
  },
  {
    "value": "ME",
    "label": "Montenegro"
  },
  {
    "value": "MS",
    "label": "Montserrat"
  },
  {
    "value": "MA",
    "label": "Morocco"
  },
  {
    "value": "MZ",
    "label": "Mozambique"
  },
  {
    "value": "MM",
    "label": "Myanmar (Burma)"
  },
  {
    "value": "NA",
    "label": "Namibia"
  },
  {
    "value": "NR",
    "label": "Nauru"
  },
  {
    "value": "NP",
    "label": "Nepal"
  },
  {
    "value": "NL",
    "label": "Netherlands"
  },
  {
    "value": "NC",
    "label": "New Caledonia"
  },
  {
    "value": "NZ",
    "label": "New Zealand"
  },
  {
    "value": "NI",
    "label": "Nicaragua"
  },
  {
    "value": "NE",
    "label": "Niger"
  },
  {
    "value": "NG",
    "label": "Nigeria"
  },
  {
    "value": "NU",
    "label": "Niue"
  },
  {
    "value": "NF",
    "label": "Norfolk Island"
  },
  {
    "value": "KP",
    "label": "North Korea"
  },
  {
    "value": "MK",
    "label": "North Macedonia"
  },
  {
    "value": "MP",
    "label": "Northern Mariana Islands"
  },
  {
    "value": "NO",
    "label": "Norway"
  },
  {
    "value": "OM",
    "label": "Oman"
  },
  {
    "value": "PK",
    "label": "Pakistan"
  },
  {
    "value": "PW",
    "label": "Palau"
  },
  {
    "value": "PS",
    "label": "Palestinian Territories"
  },
  {
    "value": "PA",
    "label": "Panama"
  },
  {
    "value": "PG",
    "label": "Papua New Guinea"
  },
  {
    "value": "PY",
    "label": "Paraguay"
  },
  {
    "value": "PE",
    "label": "Peru"
  },
  {
    "value": "PH",
    "label": "Philippines"
  },
  {
    "value": "PN",
    "label": "Pitcairn Islands"
  },
  {
    "value": "PL",
    "label": "Poland"
  },
  {
    "value": "PT",
    "label": "Portugal"
  },
  {
    "value": "PR",
    "label": "Puerto Rico"
  },
  {
    "value": "QA",
    "label": "Qatar"
  },
  {
    "value": "RE",
    "label": "Réunion"
  },
  {
    "value": "RO",
    "label": "Romania"
  },
  {
    "value": "RU",
    "label": "Russia"
  },
  {
    "value": "RW",
    "label": "Rwanda"
  },
  {
    "value": "WS",
    "label": "Samoa"
  },
  {
    "value": "SM",
    "label": "San Marino"
  },
  {
    "value": "ST",
    "label": "São Tomé & Príncipe"
  },
  {
    "value": "SA",
    "label": "Saudi Arabia"
  },
  {
    "value": "SN",
    "label": "Senegal"
  },
  {
    "value": "RS",
    "label": "Serbia"
  },
  {
    "value": "SC",
    "label": "Seychelles"
  },
  {
    "value": "SL",
    "label": "Sierra Leone"
  },
  {
    "value": "SG",
    "label": "Singapore"
  },
  {
    "value": "SX",
    "label": "Sint Maarten"
  },
  {
    "value": "SK",
    "label": "Slovakia"
  },
  {
    "value": "SI",
    "label": "Slovenia"
  },
  {
    "value": "SB",
    "label": "Solomon Islands"
  },
  {
    "value": "SO",
    "label": "Somalia"
  },
  {
    "value": "ZA",
    "label": "South Africa"
  },
  {
    "value": "GS",
    "label": "South Georgia & South Sandwich Islands"
  },
  {
    "value": "KR",
    "label": "South Korea"
  },
  {
    "value": "SS",
    "label": "South Sudan"
  },
  {
    "value": "ES",
    "label": "Spain"
  },
  {
    "value": "LK",
    "label": "Sri Lanka"
  },
  {
    "value": "BL",
    "label": "St. Barthélemy"
  },
  {
    "value": "SH",
    "label": "St. Helena"
  },
  {
    "value": "KN",
    "label": "St. Kitts & Nevis"
  },
  {
    "value": "LC",
    "label": "St. Lucia"
  },
  {
    "value": "MF",
    "label": "St. Martin"
  },
  {
    "value": "PM",
    "label": "St. Pierre & Miquelon"
  },
  {
    "value": "VC",
    "label": "St. Vincent & Grenadines"
  },
  {
    "value": "SD",
    "label": "Sudan"
  },
  {
    "value": "SR",
    "label": "Suriname"
  },
  {
    "value": "SJ",
    "label": "Svalbard & Jan Mayen"
  },
  {
    "value": "SE",
    "label": "Sweden"
  },
  {
    "value": "CH",
    "label": "Switzerland"
  },
  {
    "value": "SY",
    "label": "Syria"
  },
  {
    "value": "TW",
    "label": "Taiwan"
  },
  {
    "value": "TJ",
    "label": "Tajikistan"
  },
  {
    "value": "TZ",
    "label": "Tanzania"
  },
  {
    "value": "TH",
    "label": "Thailand"
  },
  {
    "value": "TL",
    "label": "Timor-Leste"
  },
  {
    "value": "TG",
    "label": "Togo"
  },
  {
    "value": "TK",
    "label": "Tokelau"
  },
  {
    "value": "TO",
    "label": "Tonga"
  },
  {
    "value": "TT",
    "label": "Trinidad & Tobago"
  },
  {
    "value": "TN",
    "label": "Tunisia"
  },
  {
    "value": "TR",
    "label": "Türkiye"
  },
  {
    "value": "TM",
    "label": "Turkmenistan"
  },
  {
    "value": "TC",
    "label": "Turks & Caicos Islands"
  },
  {
    "value": "TV",
    "label": "Tuvalu"
  },
  {
    "value": "UM",
    "label": "U.S. Outlying Islands"
  },
  {
    "value": "VI",
    "label": "U.S. Virgin Islands"
  },
  {
    "value": "UG",
    "label": "Uganda"
  },
  {
    "value": "UA",
    "label": "Ukraine"
  },
  {
    "value": "AE",
    "label": "United Arab Emirates"
  },
  {
    "value": "GB",
    "label": "United Kingdom"
  },
  {
    "value": "US",
    "label": "United States"
  },
  {
    "value": "UY",
    "label": "Uruguay"
  },
  {
    "value": "UZ",
    "label": "Uzbekistan"
  },
  {
    "value": "VU",
    "label": "Vanuatu"
  },
  {
    "value": "VA",
    "label": "Vatican City"
  },
  {
    "value": "VE",
    "label": "Venezuela"
  },
  {
    "value": "VN",
    "label": "Vietnam"
  },
  {
    "value": "WF",
    "label": "Wallis & Futuna"
  },
  {
    "value": "EH",
    "label": "Western Sahara"
  },
  {
    "value": "YE",
    "label": "Yemen"
  },
  {
    "value": "ZM",
    "label": "Zambia"
  },
  {
    "value": "ZW",
    "label": "Zimbabwe"
  }
];
export const industryOptions = [
  {
    "value": "Aerospace and defence",
    "label": "Aerospace and defence"
  },
  {
    "value": "Agriculture and forestry",
    "label": "Agriculture and forestry"
  },
  {
    "value": "Automotive",
    "label": "Automotive"
  },
  {
    "value": "Chemicals",
    "label": "Chemicals"
  },
  {
    "value": "Construction and infrastructure",
    "label": "Construction and infrastructure"
  },
  {
    "value": "Education and training",
    "label": "Education and training"
  },
  {
    "value": "Energy and utilities",
    "label": "Energy and utilities"
  },
  {
    "value": "Engineering and technical services",
    "label": "Engineering and technical services"
  },
  {
    "value": "Financial services",
    "label": "Financial services"
  },
  {
    "value": "Food and beverage",
    "label": "Food and beverage"
  },
  {
    "value": "Government and public services",
    "label": "Government and public services"
  },
  {
    "value": "Healthcare and medical devices",
    "label": "Healthcare and medical devices"
  },
  {
    "value": "Hospitality and tourism",
    "label": "Hospitality and tourism"
  },
  {
    "value": "Information technology and software",
    "label": "Information technology and software"
  },
  {
    "value": "Manufacturing",
    "label": "Manufacturing"
  },
  {
    "value": "Marine and maritime",
    "label": "Marine and maritime"
  },
  {
    "value": "Mining and minerals",
    "label": "Mining and minerals"
  },
  {
    "value": "Oil and gas",
    "label": "Oil and gas"
  },
  {
    "value": "Pharmaceuticals and biotechnology",
    "label": "Pharmaceuticals and biotechnology"
  },
  {
    "value": "Professional services and consultancy",
    "label": "Professional services and consultancy"
  },
  {
    "value": "Retail and wholesale",
    "label": "Retail and wholesale"
  },
  {
    "value": "Telecommunications",
    "label": "Telecommunications"
  },
  {
    "value": "Testing, inspection and certification",
    "label": "Testing, inspection and certification"
  },
  {
    "value": "Transport and logistics",
    "label": "Transport and logistics"
  },
  {
    "value": "Waste management and recycling",
    "label": "Waste management and recycling"
  },
  {
    "value": "Other",
    "label": "Other"
  }
];

export function togglePartnerSelection(selected, value) {
  if (selected.includes(value)) return selected.filter(item => item !== value);
  if (value === "WORLDWIDE") return ["WORLDWIDE"];
  return [...selected.filter(item => item !== "WORLDWIDE"), value];
}

function MultiSelect({ label, placeholder, options, selected, onChange, required = false }) {
  const [search, setSearch] = useState("");
  const id = useId();
  const chosen = options.filter(option => selected.includes(option.value));
  const visible = options.filter(option => (option.label + " " + option.value).toLowerCase().includes(search.trim().toLowerCase()));
  const summary = chosen.length === 0 ? placeholder : chosen.length === 1 ? chosen[0].label : chosen.length + " selected";
  return <div className={styles.multiField}>
    <span id={id} className={styles.multiLabel}>{label}{required ? " *" : ""}</span>
    <details className={styles.multiSelect} onKeyDown={event => { if (event.key === "Escape") { event.currentTarget.open = false; event.currentTarget.querySelector("summary")?.focus(); } }}>
      <summary aria-labelledby={id + " " + id + "-selection"}><span id={id + "-selection"}>{summary}</span></summary>
      <div className={styles.multiPanel}>
        <label className={styles.multiSearch}>Search {label.toLowerCase()}<input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Type to filter…" autoComplete="off" /></label>
        <div className={styles.multiTools}><span aria-live="polite">{selected.length} selected</span><button type="button" onClick={() => onChange([])} disabled={selected.length === 0}>Clear selection</button></div>
        <div className={styles.multiOptions} role="group" aria-labelledby={id}>
          {visible.map(option => <label key={option.value} className={styles.multiOption}><input type="checkbox" checked={selected.includes(option.value)} onChange={() => onChange(togglePartnerSelection(selected, option.value))} /><span>{option.label}</span></label>)}
          {visible.length === 0 && <p className={styles.note}>No matches. Try another search.</p>}
        </div>
      </div>
    </details>
    <small className={styles.multiHint}>Select one or more. {label === "Countries you serve" ? "Choose Worldwide if you serve all countries." : "Choose Other to add your industry."}</small>
    {chosen.length > 0 && <small className={styles.multiChosen} aria-live="polite">{chosen.slice(0,3).map(option => option.label).join(", ")}{chosen.length > 3 ? " and " + (chosen.length - 3) + " more" : ""}</small>}
  </div>;
}

export function buildPartnerEnquiry(form, locale) {
  return {
    fullName: form.fullName, email: form.email, organisation: form.organisation,
    jobTitle: form.jobTitle, phone: form.phone, country: form.country,
    topic: `Partner application — ${form.interest}`,
    standards: form.standards, preferredContact: "Email", timescale: "Exploratory / no date yet",
    message: [
      `Partner route: ${form.interest}`,
      `Business website: ${form.businessWebsite || "Not provided"}`,
      `Countries served: ${countryOptions.filter(option => form.countries.includes(option.value)).map(option => option.label).join(", ")}`,
      `Industry focus: ${form.industries.map(value => value === "Other" ? "Other: " + form.otherIndustry.trim() : value).join(", ") || "Not provided"}`,
      "", "Relevant experience and current services:", form.experience,
      "", "Proposed collaboration:", form.proposal,
      "", "Applicant requests a partnership discussion. No partner appointment or commercial terms are accepted by submitting this form.",
    ].join("\n"),
    consent: form.consent, website: form.website, locale, source: "partner-application",
  };
}

export default function PartnerApplicationForm({ locale = "en", initialInterest = "" }) {
  const [form, setForm] = useState({ fullName: "", email: "", organisation: "", jobTitle: "", phone: "", country: "", businessWebsite: "", countries: [], industries: [], otherIndustry: "", experience: "", proposal: "", interest: interests.includes(initialInterest) ? initialInterest : "", standards: [], consent: false, website: "" });
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const [reference, setReference] = useState("");
  const busy = useRef(false);
  function update(event) { const { name, value, type, checked } = event.target; setForm(current => ({ ...current, [name]: type === "checkbox" ? checked : value })); }
  async function submit(event) {
    event.preventDefault();
    if (busy.current) return;
    if (!interests.includes(form.interest) || (form.standards.length === 0 || !form.standards.every(value => standards.includes(value))) || !form.consent || form.experience.trim().length < 20 || form.proposal.trim().length < 20) { setError("Complete the required fields and consent before sending your application."); return; }
    if (form.countries.length === 0) { setError("Select at least one country you serve, or choose Worldwide."); return; }
    if (form.industries.includes("Other") && !form.otherIndustry.trim()) { setError("Enter your industry when selecting Other."); return; }
    const payload = buildPartnerEnquiry(form, locale);
    if (payload.message.length > 5000) { setError("Please shorten your experience or collaboration description so all selected countries and industries can be included."); return; }
    busy.current = true; setStatus("sending"); setError("");
    try {
      const response = await fetch("/api/contact", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const result = await response.json();
      if (!response.ok || result.success !== true || !result.reference) throw new Error(result.error || "Your application could not be saved. Please try again.");
      setReference(result.reference); setStatus("success");
    } catch (failure) { setError(failure.message || "Unable to send your application. Please email info@rpgexcellence.com."); setStatus("error"); }
    finally { busy.current = false; }
  }
  if (status === "success") return <section className={styles.form} aria-live="polite"><h2>Thank you for your interest.</h2><div className={styles.notice} role="status">Your application has been saved. Reference: <strong>{reference}</strong>.</div><p>We will review the information and contact you using the email address provided. Submitting an application does not appoint you as a partner.</p><a href={`/${locale}/partners`}>Return to the Partner Programme</a></section>;
  return <form className={styles.form} onSubmit={submit} aria-label="RPG Excellence partner application" aria-busy={status === "sending"}>
    <h2>Tell us about your business.</h2><p>All fields marked * are required. Independent practitioners can enter their trading name under organisation.</p>
    <div className={styles.fields}>
      <label>Full name *<input name="fullName" value={form.fullName} onChange={update} maxLength={160} autoComplete="name" required /></label>
      <label>Work email *<input name="email" type="email" value={form.email} onChange={update} maxLength={254} autoComplete="email" required /></label>
      <label>Organisation / trading name *<input name="organisation" value={form.organisation} onChange={update} maxLength={200} autoComplete="organization" required /></label>
      <label>Job title<input name="jobTitle" value={form.jobTitle} onChange={update} maxLength={160} autoComplete="organization-title" /></label>
      <label>Country *<input name="country" value={form.country} onChange={update} maxLength={120} autoComplete="country-name" required /></label>
      <label>Telephone<input name="phone" type="tel" value={form.phone} onChange={update} maxLength={80} autoComplete="tel" /></label>
      <label className={styles.wide}>Business website<input name="businessWebsite" type="url" placeholder="https://" value={form.businessWebsite} onChange={update} maxLength={300} /></label>
      <label>Partnership interest *<select name="interest" value={form.interest} onChange={update} required><option value="">Select a route</option>{interests.map(value => <option key={value}>{value}</option>)}</select></label>
      <fieldset className={styles.wide} style={{ margin: 0, padding: "16px", border: "1px solid #b9cde0", borderRadius: 8 }}>
        <legend style={{ padding: "0 6px", color: "#123451", fontSize: 13, fontWeight: 800 }}>Main standards or management systems *</legend>
        <p className={styles.note} style={{ margin: "0 0 10px" }}>Select all that apply. Choose Other / not sure if you would like help defining the scope.</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 210px), 1fr))", gap: "4px 16px" }}>
          {standards.map(value => <label key={value} className={styles.multiOption}><input type="checkbox" name="standards" value={value} checked={form.standards.includes(value)} onChange={() => setForm(current => ({ ...current, standards: current.standards.includes(value) ? current.standards.filter(item => item !== value) : [...current.standards, value] }))} /><span>{value}</span></label>)}
        </div>
      </fieldset>
      <MultiSelect label="Countries you serve" placeholder="Select countries" options={countryOptions} selected={form.countries} onChange={countries => setForm(current => ({ ...current, countries }))} required />
      <MultiSelect label="Industry focus" placeholder="Select industries" options={industryOptions} selected={form.industries} onChange={industries => setForm(current => ({ ...current, industries }))} />
      {form.industries.includes("Other") && <label className={styles.wide}>Other industry *<input name="otherIndustry" value={form.otherIndustry} onChange={update} maxLength={200} required /></label>}
      <label className={styles.wide}>Relevant experience and current services *<textarea name="experience" value={form.experience} onChange={update} minLength={20} maxLength={1200} rows={5} placeholder="Tell us about your expertise, services and experience supporting clients." required /></label>
      <label className={styles.wide}>How would you like to work together? *<textarea name="proposal" value={form.proposal} onChange={update} minLength={20} maxLength={1200} rows={5} placeholder="Describe the support your clients need and how you would use or introduce RPG Excellence." required /></label>
    </div>
    <p className={styles.note}>Please describe your experience without sharing client names, confidential records or sensitive personal information.</p>
    <label className={styles.consent}><input name="consent" type="checkbox" checked={form.consent} onChange={update} required /><span>I agree that RPG EXCELLENCE LTD may use these details to assess and respond to my partnership enquiry, as explained in the <a href={`/${locale}/privacy`}>Privacy Notice</a>. *</span></label>
    <label className={styles.trap} aria-hidden="true">Leave this field empty<input name="website" value={form.website} onChange={update} tabIndex={-1} autoComplete="off" /></label>
    {error && <div className={styles.error} role="alert">{error}</div>}
    <div className={styles.formFooter}><button className={styles.primary} type="submit" disabled={status === "sending"}>{status === "sending" ? "Sending application…" : "Send partner application →"}</button><span>Or email <a href="mailto:info@rpgexcellence.com?subject=Partner%20application">info@rpgexcellence.com</a></span></div>
    <p className={styles.note}>Applications are reviewed individually. Scope, responsibilities, referral arrangements and any fees will be agreed in writing before a partnership starts.</p>
  </form>;
}
