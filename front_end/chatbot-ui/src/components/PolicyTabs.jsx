
import React from "react";
import "../styles/chatbot.css";

/**
 * PolicyTabs renders 8 tabs across two rows (4 per row).
 * Props:
 *  - policies: string[] (expected length: 8)
 *  - activeIndex: number
 *  - onChange: (index: number) => void
 */
export default function PolicyTabs({ policies = [], activeIndex = 0, onChange = () => {} }) {
  return (
    <div className="policy-tabs" role="tablist" aria-label="Policies">
      {policies.map((label, i) => (
        <button
          key={label + i}
          role="tab"
          aria-selected={activeIndex === i}
          className={"policy-tab" + (activeIndex === i ? " active" : "")}
          onClick={() => onChange(i)}
          title={label}
        >
          <span className="policy-label">{label}</span>
        </button>
      ))}
    </div>
  );
}
