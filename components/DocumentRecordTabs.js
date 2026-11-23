'use client';

import { createContext, useContext, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import s from '../app/portal/documents/documents.module.css';

const documentTabs = [
  ['overview', 'Overview'], ['details', 'Document Details'], ['scope', 'Classification & Applicability'],
  ['approval', 'Review & Approval'], ['distribution', 'Distribution'], ['history', 'Revision History'],
];

const paths = {
  overview: 'M6 3h8l4 4v14H6z M14 3v5h4 M9 12h6 M9 16h6',
  details: 'M12 3 21 8l-9 5-9-5z M3 12l9 5 9-5 M3 16l9 5 9-5',
  scope: 'M12 3l7 3v6c0 4-4 7-7 9-3-2-7-5-7-9V6z M9 12l2 2 4-4',
  approval: 'M10 3h4v4h-4z M12 7v5 M5 16v-4h14v4 M3 16h4v4H3z M17 16h4v4h-4z',
  documents: 'M12 7v10m-5-5h10M4 4h16v16H4z',
  distribution: 'M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2 M9.5 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8z M21 21v-2a4 4 0 0 0-2.5-3.7 M16.5 3.5a4 4 0 0 1 0 7',
  history: 'M4 11a8 8 0 1 1 1.8 6 M4 5v6h6 M12 8v5l3 2',
  download: 'M12 3v11 M8 10l4 4 4-4 M5 15v5h14v-5',
  open: 'M14 4h6v6 M20 4l-9 9 M11 6H5v13h13v-6',
  check: 'M5 12l4 4 10-10',
  more: 'M5 12h.01 M12 12h.01 M19 12h.01',
  alert: 'M12 3 2 20h20z M12 9v4 M12 16h.01',
  electrical: 'M13 2 4 14h7l-1 8 10-12h-7z',
  chemical: 'M9 3h6 M10 3v7L4 18a2 2 0 0 0 2 3h12a2 2 0 0 0 2-3l-6-8V3 M7 15h10',
  fire: 'M12 2c2 5 7 8 7 13a7 7 0 0 1-14 0c0-3 2-5 3-6 0 3 2 4 2 4 2-3 3-7 2-11z M12 14c-2 2-3 4-2 6',
  mechanical: 'M4 4l4 1 2 3-2 2-3-2z M9 9l11 11 M15 10l5-5 M16 4l4 4 M9 15l-5 5',
  height: 'M8 3v18 M16 3v18 M8 6h8 M8 10h8 M8 14h8 M8 18h8',
  pin: 'M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0z M14 10a2 2 0 1 1-4 0 2 2 0 0 1 4 0z',
  qr: 'M3 3h6v6H3z M15 3h6v6h-6z M3 15h6v6H3z M13 13h4v4h-4z M21 13v4 M13 21h8v-3',
  permit: 'M7 4h10v17H7z M10 4V2h4v2 M9 12l2 2 4-4',
  noise: 'M3 10v4h4l5 4V6l-5 4z M16 9c2 2 2 4 0 6 M19 6c4 4 4 8 0 12',
  calendar: 'M4 6h16v14H4z M8 3v6 M16 3v6 M4 10h16 M8 14h2 M14 14h2 M8 17h2',
  person: 'M4 21v-2a5 5 0 0 1 5-5h6a5 5 0 0 1 5 5v2 M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8z',
  conversation: 'M20 4H4v12h4l4 4v-4h8z M8 8h8 M8 12h5',
  book: 'M12 6c-2-2-5-2-9-2v14c4 0 7 0 9 2 2-2 5-2 9-2V4c-4 0-7 0-9 2v14',
  matrix: 'M4 4h16v16H4z M4 9h16 M4 15h16 M9 4v16 M15 4v16',
};

export function RecordIcon({ name }) {
  return <svg className={s.recordIcon} viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={paths[name]}/></svg>;
}

const TabContext = createContext(null);

export function DocumentRecordTabs({ children, initial = 'overview', tabs = documentTabs, sectionLabel = 'Document sections' }) {
  const [active, setActive] = useState(initial);
  const buttons = useRef([]);
  return <TabContext.Provider value={{ active, setActive }}>
    <div className={s.recordTabs} role="tablist" aria-label={sectionLabel}>
      {tabs.map(([key, label], index) => <button type="button" key={key} id={'record-tab-' + key} role="tab" aria-selected={active === key}
        aria-controls={'record-panel-' + key} tabIndex={active === key ? 0 : -1}
        ref={node => { buttons.current[index] = node; }}
        onClick={() => setActive(key)}
        onKeyDown={event => {
          const next = {ArrowLeft: (index + tabs.length - 1) % tabs.length, ArrowRight: (index + 1) % tabs.length, Home: 0, End: tabs.length - 1}[event.key];
          if (next === undefined) return;
          event.preventDefault();
          setActive(tabs[next][0]);
          buttons.current[next]?.focus();
        }}><RecordIcon name={key}/>{label}</button>)}
    </div>
    {children}
  </TabContext.Provider>;
}

export function DocumentRecordPanel({ name, children }) {
  const context = useContext(TabContext);
  if (!context) return children;
  return <section id={'record-panel-' + name} role="tabpanel" aria-labelledby={'record-tab-' + name}
    data-record-panel={name} hidden={context.active !== name}>{children}</section>;
}

export function DocumentRecordTabButton({ name, children }) {
  const { setActive } = useContext(TabContext);
  return <button type="button" className={s.recordTextButton} onClick={() => {
    setActive(name);
    document.getElementById('record-tab-' + name)?.focus();
  }}>{children}</button>;
}

export function useDocumentRecordValidation() {
  const context = useContext(TabContext);
  const first = useRef(null);
  return event => {
    if (!context || first.current) return;
    const target = event.target;
    const panel = target.closest('[data-record-panel]');
    if (!panel || panel.dataset.recordPanel === context.active) return;
    first.current = target;
    flushSync(() => context.setActive(panel.dataset.recordPanel));
    requestAnimationFrame(() => {
      first.current = null;
      target.focus();
      target.reportValidity();
    });
  };
}

export function DocumentPreview({ url, filename }) {
  const [open, setOpen] = useState(false);
  return <>
    <button type="button" className={s.recordButton} aria-expanded={open} onClick={() => setOpen(!open)}><RecordIcon name="open"/>{open ? 'Close preview' : 'Open preview'}</button>
    {open && <iframe className={s.recordPreviewFrame} src={url} title={'Preview of ' + filename}/>}
  </>;
}
