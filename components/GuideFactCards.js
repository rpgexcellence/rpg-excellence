"use client";

import { useState } from "react";

export default function GuideFactCards({ facts }) {
  const [openCard, setOpenCard] = useState(null);

  return <div className="guideFacts guideFactCards" aria-label="Executive ISO 9001 overview">
    {facts.map((fact, index) => {
      const isOpen = openCard === index;
      return <button
        className={`guideFactCard ${isOpen ? "isOpen" : ""}`}
        type="button"
        key={fact.label}
        aria-expanded={isOpen}
        onClick={() => setOpenCard(isOpen ? null : index)}
      >
        <span className="guideFactFace guideFactFront">
          <small>{fact.label}</small>
          <strong>{fact.value}</strong>
          <em>{isOpen ? "Close" : "View executive points →"}</em>
        </span>
        <span className="guideFactFace guideFactBack" aria-hidden={!isOpen}>
          <small>{fact.label}</small>
          <strong>{fact.value}</strong>
          <ul>{fact.points.slice(0, 3).map(point => <li key={point}>{point}</li>)}</ul>
        </span>
      </button>;
    })}
  </div>;
}
