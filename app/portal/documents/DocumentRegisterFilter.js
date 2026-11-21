'use client';

import { useState } from 'react';
import s from './documents.module.css';

export default function DocumentRegisterFilter({ label, name, choices, selected, emptyLabel, search }) {
  const [checked, setChecked] = useState(() => new Set(selected));
  const [query, setQuery] = useState(search?.value ?? '');
  const searchText = query.trim().replace(/\s+/g, ' ').toLocaleLowerCase('en-GB');
  const shown = choices.filter(choice => checked.has(choice.value) || choice.label.toLocaleLowerCase('en-GB').includes(searchText));

  function toggle(value, isChecked) {
    setChecked(previous => {
      const next = new Set(previous);
      if (isChecked) next.add(value);
      else next.delete(value);
      return next;
    });
  }

  return <div className={s.filter}>
    <span className={s.filterLabel}>{label}</span>
    <details name="document-register-filters" onKeyDown={event => {
      if (event.key === 'Escape' && event.currentTarget.open) {
        event.currentTarget.open = false;
        event.currentTarget.querySelector('summary').focus();
      }
    }}>
      <summary aria-label={label + (checked.size ? ', ' + checked.size + ' selected' : '')}>
        {checked.size ? checked.size + ' selected' : query.trim() || emptyLabel}
      </summary>
      <div className={s.filterMenu}>
        {search && <input type="search" aria-label={search.placeholder} placeholder={search.placeholder}
          name={checked.size ? undefined : search.name} maxLength={150} value={query} onChange={event => setQuery(event.target.value)}/>}
        <div className={s.filterChoices} role="group" aria-label={label + ' choices'}>
          {shown.map(({ value, label }) => <label key={value}>
            <input type="checkbox" checked={checked.has(value)} onChange={event => toggle(value, event.target.checked)}/>
            <span>{label}</span>
          </label>)}
          {!shown.length && <p className={s.muted}>No matching choices.</p>}
        </div>
        {(checked.size > 0 || query) && <button type="button" className={s.clearFilter} onClick={() => { setChecked(new Set()); setQuery(''); }}>Clear {label.toLowerCase()}</button>}
      </div>
    </details>
    {[...checked].map(value => <input type="hidden" key={value} name={name} value={value}/>)}
  </div>;
}
