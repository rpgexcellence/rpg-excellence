import Link from "next/link";
export default function QualityPerformancePublicationCard({ locale = "en" }) {
  return <article style={{border:"1px solid #d8e2eb",borderRadius:14,overflow:"hidden",background:"#fff"}}>
    <img src="/images/publications/quality-performance.png" alt="Can you prove quality is powering performance?" style={{width:"100%",height:"auto",display:"block"}} />
    <div style={{padding:26}}><h2>Decoding Quality Performance</h2><p>A practical guide to connecting business priorities, quality decisions and verified results. Includes a worked example and four worksheets.</p><p><strong>£4.99</strong> · 20 pages · PDF</p><Link className="button" href={`/${locale}/publications/decoding-quality-performance`}>View &amp; purchase</Link></div>
  </article>;
}
