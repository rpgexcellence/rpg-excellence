"use client";

import styles from "./nonconformity-management-board.module.css";

export const MANAGEMENT_CHARTS = [
  ["trend", "NC performance trend", "Major and minor NCs raised and verified closed by month."],
  ["sources", "Findings by source", "Major and minor NCs by reporting source."],
  ["ageing", "Open NC ageing", "Unresolved NCs by days since raised."],
  ["attention", "Management attention", "Several queues can include the same NC."],
  ["effectiveness", "Corrective action effectiveness", "Independent verification outcomes in the last six months."],
  ["recurring", "Recurring failure themes", "Validated systemic cause categories repeated in the last six months."],
  ["workflow", "Workflow position", "Each unresolved NC appears in one stage."],
  ["classification", "Finding classification", "Major and minor NCs, observations and opportunities for improvement."],
];

const number = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 1 });
const percent = (count, total) => total ? number.format(count / total * 100) + "%" : "—";

function svgTarget(item, onSelect) {
  return {
    role: "button", tabIndex: 0, "aria-label": item.label + ", " + item.count + " findings",
    onClick: event => onSelect(item, event),
    onKeyDown: event => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        onSelect(item, event);
      }
    },
  };
}

function Trend({ months, onSelect }) {
  const series = [
    ["raised", "Raised", "#2365c9"],
    ["verified", "Verified closed", "#0a7e61"],
  ];
  const max = Math.max(4, Math.ceil(Math.max(...months.flatMap(month => [month.raised.count, month.verified.count])) / 4) * 4);
  const x = index => 35 + index * 82;
  const y = count => 156 - count / max * 132;
  return <>
    <div className={styles.series}>{series.map(([key, title, color]) =>
      <span key={key}><i style={{ background: color }} aria-hidden="true"/>{title}</span>)}</div>
    <svg className={styles.trend} viewBox="0 0 470 187" role="group" aria-label="Monthly NCs raised and verified closed">
      <g aria-hidden="true">
        {[4, 3, 2, 1, 0].map(tick => <g key={tick}>
          <line x1="35" x2="445" y1={y(max * tick / 4)} y2={y(max * tick / 4)} className={styles.gridLine}/>
          <text x="24" y={y(max * tick / 4) + 4} textAnchor="end">{max * tick / 4}</text>
        </g>)}
        {months.map((month, index) => <text key={month.date} x={x(index)} y="179" textAnchor="middle">{month.label.split(" ")[0]}</text>)}
        {series.map(([key, , color]) => <polyline key={key} fill="none" stroke={color} strokeWidth="2.6"
          points={months.map((month, index) => x(index) + "," + y(month[key].count)).join(" ")}/>)}
      </g>
      {series.map(([key, , color], seriesIndex) => months.map((month, index) => {
        const point = month[key];
        const coincides = month.raised.count === month.verified.count;
        const centerX = x(index) + (coincides ? seriesIndex === 0 ? -5 : 5 : 0);
        const centerY = y(point.count);
        return <g key={point.key}>
          <circle className={styles.trendHit} cx={centerX} cy={centerY} r={coincides ? 5 : 9} {...svgTarget(point, onSelect)}>
            <title>{point.label} · {point.count}</title>
          </circle>
          <circle className={styles.trendPoint} cx={centerX} cy={centerY} r="3.4" stroke={color} aria-hidden="true"/>
        </g>;
      }))}
    </svg>
    <p className={styles.note}>{months[0].label} to {months.at(-1).label} · Current month to date</p>
  </>;
}

function Legend({ items, onSelect, share, columns = false }) {
  return <div className={columns ? styles.legendColumns : styles.legend}>{items.map(item =>
    <button key={item.key} type="button" onClick={event => onSelect(item, event)}>
      <i aria-hidden="true" style={{ background: item.color }}/><span>{item.label}</span>
      <strong>{item.count}{share ? " (" + percent(item.count, share) + ")" : ""}</strong>
    </button>)}</div>;
}

function Donut({ items, onSelect, total, noun, label, showShare }) {
  const segments = items.filter(item => item.count);
  let start = 0;
  return <div className={styles.donutLayout}>
    <svg className={styles.donut} viewBox="0 0 130 130" role="group" aria-label={label}>
      <circle cx="65" cy="65" r="47" fill="none" stroke="#e3edf4" strokeWidth="19" aria-hidden="true"/>
      {segments.map(item => {
        const length = item.count / total * 100;
        const gap = segments.length > 1 ? Math.min(0.8, length / 3) : 0;
        const dashOffset = -start;
        start += length;
        return <circle key={item.key} className={styles.slice} cx="65" cy="65" r="47" pathLength="100"
          transform="rotate(-90 65 65)" stroke={item.color} strokeDasharray={`${length - gap} ${100 - length + gap}`}
          strokeDashoffset={dashOffset} {...svgTarget(item, onSelect)}>
          <title>{item.label} · {item.count} ({percent(item.count, total)})</title>
        </circle>;
      })}
      <text x="65" y="64" className={styles.centerCount} aria-hidden="true">{total}</text>
      <text x="65" y="79" className={styles.centerLabel} aria-hidden="true">{noun}</text>
    </svg>
    {items.length ? <Legend items={items} onSelect={onSelect} share={showShare ? total : 0}/> : <p>No NCs in scope.</p>}
  </div>;
}

function Ageing({ items, onSelect, analytics }) {
  const max = Math.max(4, Math.ceil(Math.max(...items.map(item => item.count)) / 4) * 4);
  return <>
    <div className={styles.columns}>
      <div className={styles.columnGrid} aria-hidden="true">{[4, 3, 2, 1, 0].map(tick => <div key={tick}><span>{max * tick / 4}</span></div>)}</div>
      {items.map(item => <button key={item.key} type="button" className={styles.column}
        style={{ "--height": item.count / max * 100 + "%", "--series": item.color }}
        onClick={event => onSelect(item, event)}>
        <span className={styles.columnPlot}><strong>{item.count}</strong>{item.count > 0 && <i aria-hidden="true"/>}</span>
        <span>{item.label}</span>
      </button>)}
    </div>
    <p className={styles.note}>{analytics.coverage.age.recorded} of {analytics.open} unresolved NCs with a valid raised date.</p>
  </>;
}

function Bars({ items, onSelect, total }) {
  const max = total || Math.max(1, ...items.map(item => item.count));
  return <div className={styles.bars}>{items.map(item => <button type="button" key={item.key}
    className={total ? styles.percentBar : undefined} onClick={event => onSelect(item, event)}>
    <span>{item.label}</span><span className={styles.track} aria-hidden="true">
      <i style={{ background: item.color, width: item.count / max * 100 + "%" }}/>
    </span><strong>{total ? percent(item.count, total) : item.count}</strong>
  </button>)}</div>;
}

export function ManagementChart({ chart, board, analytics, onSelect }) {
  const items = board[chart];
  switch (chart) {
    case "trend":
      return <Trend months={items} onSelect={onSelect}/>;
    case "sources":
      return <Donut items={items} onSelect={onSelect} total={analytics.total} noun="NCs" label="Findings by source" showShare/>;
    case "classification":
      return <Donut items={items} onSelect={onSelect} total={analytics.findingTotal} noun="findings" label="Finding classification"/>;
    case "ageing":
      return <Ageing items={items} onSelect={onSelect} analytics={analytics}/>;
    case "workflow":
      return <>
        <div className={styles.workflow} aria-label="Workflow stage distribution">
          {items.filter(item => item.count).map(item => <button type="button" key={item.key}
            style={{ background: item.color, flex: item.count }} title={item.label + " · " + item.count}
            aria-label={item.label + ", " + item.count + " NCs"} onClick={event => onSelect(item, event)}/>)}
        </div>
        <Legend items={items} onSelect={onSelect} columns/>
        <p className={styles.note}>{analytics.open} unresolved NCs · {analytics.linkedCapaCount} NCs with linked CAPA-8D across the portfolio</p>
      </>;
    case "effectiveness":
      if (!items) return <p role="status">Effectiveness data could not be loaded. Refresh records to retry.</p>;
      return <>
        {items.total ? <Bars items={items.items} total={items.total} onSelect={onSelect}/>
          : <p>No recorded verification outcomes in this scope and period.</p>}
        <p className={styles.note}>{items.total} assessed NCs. {board.capaRestricted
          ? "Shows recorded finding outcomes. Linked corrective action outcomes require CAPA-8D access."
          : "Uses the final finding outcome where recorded, otherwise the least favourable recorded outcome on selected corrective actions."}</p>
      </>;
    case "recurring":
      if (board.capaRestricted) return <p>Validated systemic cause categories require CAPA-8D access.</p>;
      if (!items) return <p role="status">Cause data could not be loaded. Refresh records to retry.</p>;
      return <>
        {items.items.length ? <Bars items={items.items} onSelect={onSelect}/> : <p>No validated systemic cause category recurs across two or more NCs in this scope and period.</p>}
        <p className={styles.note}>{items.covered} of {items.total} NCs raised in the last six months have a validated systemic cause category. A finding can contribute to several categories.</p>
      </>;
    default:
      return <Bars items={items} onSelect={onSelect}/>;
  }
}

export function ManagementChartGrid({ board, analytics, onExpand, onSelect }) {
  return <div className={styles.grid}>
    {MANAGEMENT_CHARTS.map(([key, title, subtitle]) => <section className={styles.panel} key={key} aria-labelledby={`nc-chart-${key}`}>
      <header>
        <div><h2 id={`nc-chart-${key}`}>{title}</h2><p>{subtitle}</p></div>
        <button className="ncwButton" type="button" aria-label={`Expand ${title} chart`} onClick={event => onExpand(key, title, event)}>Expand chart</button>
      </header>
      <ManagementChart chart={key} board={board} analytics={analytics} onSelect={onSelect}/>
    </section>)}
  </div>;
}

export function ManagementFindings({ rows, query, onQuery, children }) {
  const term = query.trim().toLowerCase();
  const visible = rows.filter(row => [row.reference, row.title, row.ownerName].join(" ").toLowerCase().includes(term));
  return <>
    <div className={styles.queueTools}>
      <label>Search contributing findings<input type="search" value={query} onChange={event => onQuery(event.target.value)} placeholder="Reference, title or owner"/></label>
      <span role="status">{visible.length} of {rows.length} findings</span>
    </div>
    {children(visible)}
  </>;
}
