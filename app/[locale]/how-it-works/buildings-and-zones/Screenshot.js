"use client";
import {useEffect, useId, useRef, useState} from 'react';
import styles from './Screenshot.module.css';

export default function Screenshot({src, alt, width, height, loading, fetchPriority}) {
  const dialog = useRef(null);
  const titleId = useId();
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, [open]);
  function enlarge() { dialog.current.showModal(); setOpen(true); }
  function closeOutside(event) {
    if (event.target !== event.currentTarget) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.current.close();
  }
  return <>
    <button type="button" className={styles.thumbnail} aria-label={`Enlarge screenshot: ${alt}`} aria-haspopup="dialog" onClick={enlarge}>
      <img src={src} alt={alt} width={width} height={height} loading={loading} fetchPriority={fetchPriority}/>
      <span className={styles.hint}>Expand screenshot</span>
    </button>
    <dialog ref={dialog} className={styles.dialog} aria-labelledby={titleId} onClose={() => setOpen(false)} onClick={closeOutside}>
      <div className={styles.toolbar}><h2 id={titleId}>Screenshot</h2><button type="button" className={styles.close} aria-label="Close enlarged screenshot" onClick={() => dialog.current.close()}>X</button></div>
      {open && <img className={styles.enlarged} src={src} alt={alt} width={width} height={height}/>}
      <p className={styles.caption}>{alt}</p>
    </dialog>
  </>;
}
