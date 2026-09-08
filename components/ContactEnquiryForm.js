"use client";

import { useState } from "react";

const standards = [
  "ISO 9001",
  "ISO 14001",
  "ISO 45001",
  "ISO 22301",
  "ISO/IEC 27001",
  "ISO/IEC 17025",
  "ISO/IEC 17024",
  "ISO 19011",
  "AS9100",
  "Integrated management system",
  "Other / not sure",
];

const topics = [
  "RPG Intelligence demonstration",
  "Internal audit",
  "3-year audit programme",
  "Gap analysis and certification readiness",
  "Management system implementation",
  "FMEA risk planning",
  "CAPA-8D and root-cause analysis",
  "Auditor competence and verification",
  "Accreditation support",
  "Pricing and subscription",
  "Other enquiry",
];

const initialForm = {
  fullName: "",
  email: "",
  phone: "",
  organisation: "",
  jobTitle: "",
  country: "",
  topic: "",
  standards: [],
  otherStandard: "",
  preferredContact: "Email",
  timescale: "",
  message: "",
  consent: false,
  website: "",
};

export default function ContactEnquiryForm({ locale = "en", source = "contact-page" }) {
  const [form, setForm] = useState(initialForm);
  const [status, setStatus] = useState("idle");
  const [notice, setNotice] = useState("");

  function update(event) {
    const { name, value, checked, type } = event.target;
    setForm((current) => ({ ...current, [name]: type === "checkbox" ? checked : value }));
  }

  function toggleStandard(value) {
    setForm((current) => ({
      ...current,
      standards: current.standards.includes(value)
        ? current.standards.filter((item) => item !== value)
        : [...current.standards, value],
    }));
  }

  async function submit(event) {
    event.preventDefault();
    setStatus("loading");
    setNotice("");

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, locale, source }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result?.error || "Unable to send your enquiry.");
      setStatus("success");
      setNotice(`Thank you. Your enquiry reference is ${result.reference}. We will respond using your preferred contact method.`);
      setForm(initialForm);
    } catch (error) {
      setStatus("error");
      setNotice(error?.message || "Unable to send your enquiry. Please email info@rpgexcellence.com.");
    }
  }

  return (
    <form className="contactForm" onSubmit={submit} aria-label="RPG Excellence enquiry form">
      <div className="contactFormIntro">
        <div><span className="kicker">Structured enquiry</span><h2>Tell us what assurance you need.</h2></div>
        <p>Select the relevant standards and topic so your enquiry reaches the right support context from the start.</p>
      </div>

      <div className="contactFormGrid">
        <label>Full name *<input name="fullName" value={form.fullName} onChange={update} autoComplete="name" required /></label>
        <label>Work email *<input type="email" name="email" value={form.email} onChange={update} autoComplete="email" required /></label>
        <label>Organisation *<input name="organisation" value={form.organisation} onChange={update} autoComplete="organization" required /></label>
        <label>Job title<input name="jobTitle" value={form.jobTitle} onChange={update} autoComplete="organization-title" /></label>
        <label>Telephone<input type="tel" name="phone" value={form.phone} onChange={update} autoComplete="tel" /></label>
        <label>Country<input name="country" value={form.country} onChange={update} autoComplete="country-name" /></label>
        <label className="contactWide">Enquiry topic *
          <select name="topic" value={form.topic} onChange={update} required><option value="">Select a topic</option>{topics.map((topic) => <option key={topic}>{topic}</option>)}</select>
        </label>
      </div>

      <fieldset className="standardSelector">
        <legend>Standards applicable to your enquiry *</legend>
        <p>Select all that apply. Choose “Other / not sure” if you would like us to help define the scope.</p>
        <div>{standards.map((standard) => <label key={standard}><input type="checkbox" checked={form.standards.includes(standard)} onChange={() => toggleStandard(standard)} />{standard}</label>)}</div>
        {form.standards.includes("Other / not sure") && <label className="otherStandard">Other standard or requirement<input name="otherStandard" value={form.otherStandard} onChange={update} /></label>}
      </fieldset>

      <div className="contactFormGrid">
        <label>Preferred contact method *<select name="preferredContact" value={form.preferredContact} onChange={update} required><option>Email</option><option>Telephone</option><option>Microsoft Teams</option></select></label>
        <label>Required timescale<select name="timescale" value={form.timescale} onChange={update}><option value="">Select if known</option><option>Urgent — within 5 working days</option><option>Within 2–4 weeks</option><option>Within 1–3 months</option><option>More than 3 months</option><option>Exploratory / no date yet</option></select></label>
        <label className="contactWide">How can we help? *<textarea name="message" value={form.message} onChange={update} rows="6" minLength="20" placeholder="Describe your sites, management system, current certification position and the outcome you need." required /></label>
      </div>

      <label className="contactConsent"><input type="checkbox" name="consent" checked={form.consent} onChange={update} required /><span>I agree that RPG Excellence may use these details to respond to this enquiry. See the <a href={`/${locale}/privacy`}>privacy notice</a>. *</span></label>
      <label className="contactHoneypot" aria-hidden="true">Website<input name="website" value={form.website} onChange={update} tabIndex="-1" autoComplete="off" /></label>

      <div className="contactSubmitRow">
        <button className="button" type="submit" disabled={status === "loading"}>{status === "loading" ? "Sending…" : "Send structured enquiry →"}</button>
        <span>Or email <a href="mailto:info@rpgexcellence.com">info@rpgexcellence.com</a></span>
      </div>
      {notice && <div className={`contactNotice ${status}`} role="status">{notice}</div>}
    </form>
  );
}
