"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./ISO9001OverviewVideo.module.css";

export default function ISO9001OverviewVideo() {
  const [playing, setPlaying] = useState(false);
  const player = useRef(null);
  useEffect(() => { if (playing) player.current?.focus(); }, [playing]);

  return <div className={styles.panel}>
    <div className={styles.screen}>
      {playing ? <iframe ref={player} tabIndex={0}
        title="RPG Excellence — ISO 9001:2026 at a glance"
        src="https://www.youtube-nocookie.com/embed/1CSSjJ8GC1g?autoplay=1&playsinline=1&rel=0"
        allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
        referrerPolicy="strict-origin-when-cross-origin" allowFullScreen /> :
        <button type="button" className={styles.preview} onClick={() => setPlaying(true)}
          aria-label="Watch the ISO 9001:2026 at a glance video">
          <span className={styles.copy}>
            <span className={styles.label}>RPG EXCELLENCE · VIDEO OVERVIEW</span>
            <span className={styles.title}>ISO 9001:2026<br/>at a glance.</span>
            <span className={styles.action}><span className={styles.play} aria-hidden="true"><svg viewBox="0 0 24 24"><path fill="currentColor" d="M9 5v14l11-7z"/></svg></span>Watch the overview</span>
          </span>
          <span className={styles.edition} aria-hidden="true">9001<span>2026</span></span>
        </button>}
    </div>
    <a className={styles.external} href="https://www.youtube.com/watch?v=1CSSjJ8GC1g" target="_blank" rel="noopener noreferrer">Watch on YouTube <span aria-hidden="true">↗</span><span className={styles.srOnly}> (opens in a new tab)</span></a>
  </div>;
}
