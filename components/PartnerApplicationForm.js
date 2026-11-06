"use client";

import { useRef, useState } from "react";
import styles from "./PartnerProgramme.module.css";

const interests = ["Referral partner", "Consultancy partner", "Training partner", "Explore the options"];
const standards = ["Other / not sure", "ISO 9001", "ISO 14001", "ISO 45001", "ISO 22301", "ISO/IEC 27001", "ISO/IEC 17025", "ISO/IEC 17024", "ISO 19011", "AS9100", "Integrated management system"];

export function buildPartnerEnquiry(form, locale) {
  return {
    fullName: form.fullName, email: form.email, organisation: form.organisation,
    jobTitle: form.jobTitle, phone: form.phone, country: form.country,
    topic: `Partner application — ${form.interest}`,
    standards: [form.standard], preferredContact: "Email", timescale: "Exploratory / no date yet",
    message: [
      `Partner route: ${form.interest}`,
      `Business website: ${form.businessWebsite || "Not provided"}`,
      `Regions served: ${form.regions}`,
      `Industry focus: ${form.industries || "Not provided"}`,
      "", "Relevant experience and current services:", form.experience,
      "", "Proposed collaboration:", form.proposal,
      "", "Applicant requests a partnership discussion. No partner appointment or commercial terms are accepted by submitting this form.",
    ].join("\n"),
    consent: form.consent, website: form.website, locale, source: "partner-application",
  };
}

export default function PartnerApplicationForm({ locale = "en", initialInterest = "" }) {
  const [form, setForm] = useState({ fullName: "", email: "", organisation: "", jobTitle: "", phone: "", country: "", businessWebsite: "", regions: "", industries: "", experience: "", proposal: "", interest: interests.includes(initialInterest) ? initialInterest : "", standard: "Other / not sure", consent: false, website: "" });
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const [reference, setReference] = useState("");
  const busy = useRef(false);
  function update(event) { const { name, value, type, checked } = event.target; setForm(current => ({ ...current, [name]: type === "checkbox" ? checked : value })); }
  async function submit(event) {
    event.preventDefault();
    if (busy.current) return;
    if (!interests.includes(form.interest) || !standards.includes(form.standard) || !form.consent || form.experience.trim().length < 20 || form.proposal.trim().length < 20) { setError("Complete the required fields and consent before sending your application."); return; }
    busy.current = true; setStatus("sending"); setError("");
    try {
      const response = await fetch("/api/contact", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(buildPartnerEnquiry(form, locale)) });
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
      <label>Main standard or management system<select name="standard" value={form.standard} onChange={update}>{standards.map(value => <option key={value}>{value}</option>)}</select></label>
      <label>Regions you serve *<input name="regions" value={form.regions} onChange={update} maxLength={300} placeholder="For example: UK and Ireland" required /></label>
      <label>Industry focus<input name="industries" value={form.industries} onChange={update} maxLength={300} placeholder="For example: manufacturing, engineering" /></label>
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
