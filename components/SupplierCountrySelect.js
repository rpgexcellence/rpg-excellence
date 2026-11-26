"use client";

import { useState } from "react";

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
"North America": ["Canada", "Mexico", "United States"],
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

export default function SupplierCountrySelect({ country, onChange }) {
  const matchingRegion = Object.keys(regionCountries).find(region => regionCountries[region].includes(country));
  const [region,setRegion] = useState(matchingRegion || (country ? "Other" : ""));
  const [other,setOther] = useState(Boolean(country && !matchingRegion));
  return <div className="saGrid wide">
    <label><span>Country region</span><select value={region} onChange={event=>{
      const next=event.target.value;
      setRegion(next);setOther(next==="Other");onChange("");
    }}>
      <option value="">Select region</option>
      {Object.keys(regionCountries).filter(key=>key!=="Other").map(key=><option key={key}>{key}</option>)}<option value="Other">Other</option>
    </select></label>
    {region!=="Other" && <label><span>Country</span>
      <select name={other ? undefined : "country"} disabled={!region} value={other ? "Other" : country} onChange={event=>{
        setOther(event.target.value==="Other");onChange(event.target.value==="Other" ? "" : event.target.value);
      }}>
        <option value="">Select country</option>
        {(regionCountries[region] || []).filter(value=>value!=="Other").map(value=><option key={value}>{value}</option>)}
        <option value="Other">Other</option>
      </select>
    </label>}
    {other && <label><span>Country name</span><input name="country" value={country} onChange={event=>onChange(event.target.value)} required /></label>}
  </div>;
}
