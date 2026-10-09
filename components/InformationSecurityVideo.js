"use client";

import { useEffect, useRef, useState } from "react";

const videoTitle = "Information Security Risk: From Assessment to Accountable Action";

export default function InformationSecurityVideo() {
  const [playing, setPlaying] = useState(false);
  const player = useRef(null);
  useEffect(() => { if (playing) player.current?.focus(); }, [playing]);

  return <aside className="isvPanel" aria-label="Information-security video overview">
    <header className="isvHeader"><span>SEE THE RISK JOURNEY</span><b>1:09 OVERVIEW</b></header>
    <div className="isvScreen">
      {playing ? <iframe ref={player} tabIndex={0} title={videoTitle}
        src="https://www.youtube-nocookie.com/embed/QjWB-7huCrQ?autoplay=1&playsinline=1&rel=0"
        allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
        referrerPolicy="strict-origin-when-cross-origin" allowFullScreen /> :
        <button className="isvPlay" type="button" onClick={() => setPlaying(true)} aria-label={`Watch ${videoTitle}, 1 minute 9 seconds`}>
          <span className="isvPosterLabel">RPG EXCELLENCE · INFORMATION SECURITY</span>
          <span className="isvPosterTitle">From assessment<br/>to accountable action.</span>
          <span className="isvPlayIcon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M9 5v14l11-7z" fill="currentColor"/></svg></span>
          <span className="isvWatch">Watch the overview · 1:09</span>
          <span className="isvSteps" aria-hidden="true"><span>Assess risk</span><i>→</i><span>Own actions</span><i>→</i><span>Verify evidence</span></span>
        </button>}
    </div>
    <h2 className="isvTitle">{videoTitle}</h2>
    <p className="isvDescription">See how assessment connects to treatment decisions, responsible owners and evidence of effectiveness.</p>
    <a className="isvYoutube" href="https://www.youtube.com/watch?v=QjWB-7huCrQ" target="_blank" rel="noopener noreferrer">Watch on YouTube ↗<span className="isvSrOnly"> (opens in a new tab)</span></a>
    <style>{`
      .isvPanel{min-width:0;padding:25px;border:1px solid #cedce8;border-radius:21px;background:#fff;box-shadow:0 25px 65px #0828441c}
      .isvHeader{display:flex;justify-content:space-between;gap:12px;align-items:center;padding-bottom:14px;border-bottom:1px solid #e1e9ef}
      .isvHeader>span{color:#07859a;font-size:9px;font-weight:950;letter-spacing:.1em}.isvHeader>b{padding:7px 9px;border-radius:999px;background:#eaf8fa;color:#07859a;font-size:9px;white-space:nowrap}
      .isvScreen{position:relative;aspect-ratio:16/9;min-height:260px;margin-top:18px;overflow:hidden;border-radius:13px;background:#073f55}
      .isvScreen iframe{position:absolute;inset:0;display:block;width:100%;height:100%;border:0}
      .isvPlay{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;width:100%;height:100%;padding:20px;border:0;color:#fff;cursor:pointer;font:inherit;text-align:center;background:radial-gradient(ellipse at 10% 10%,#07859a88,transparent 55%),radial-gradient(ellipse at 90% 90%,#16baca44,transparent 55%),#073047}
      .isvPosterLabel{font-size:9px;font-weight:850;letter-spacing:.12em;color:#a5e3ed}.isvPosterTitle{font-size:clamp(20px,2vw,28px);font-weight:900;line-height:1.15;letter-spacing:-.03em}
      .isvPlayIcon{display:grid;place-items:center;width:52px;height:52px;flex-shrink:0;border-radius:50%;background:#fff;color:#07859a;box-shadow:0 0 0 8px #ffffff15}.isvPlayIcon svg{width:25px;height:25px}
      .isvWatch{font-size:13px;font-weight:850}.isvSteps{display:flex;align-items:center;justify-content:center;gap:8px;flex-wrap:wrap;color:#d4f0f5;font-size:10px}.isvSteps>span{padding:5px 8px;border:1px solid #ffffff30;border-radius:6px}.isvSteps i{font-style:normal}
      .isvTitle{margin:20px 0 9px;font-size:20px;line-height:1.25;color:#071d3a;letter-spacing:-.02em}.isvDescription{margin:0;color:#4f6680;font-size:15px;line-height:1.6}.isvYoutube{display:inline-flex;align-items:center;min-height:44px;margin-top:10px;color:#076d80;font-size:14px;font-weight:850;text-underline-offset:4px}
      .isvPlay:focus-visible{outline:3px solid #fff;outline-offset:-6px}.isvYoutube:focus-visible,.isvScreen iframe:focus-visible{outline:3px solid #07859a;outline-offset:3px}.isvSrOnly{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
      @media(max-width:620px){.isvScreen{min-height:230px}.isvPanel{padding:18px}.isvPlay{gap:9px;padding:14px}.isvPosterTitle{font-size:21px}.isvPosterLabel{font-size:8px}.isvSteps{gap:5px;font-size:9px}.isvSteps>span{padding:4px 5px}.isvTitle{font-size:19px}}
    `}</style>
  </aside>;
}
