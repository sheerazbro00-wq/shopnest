import { useId } from "react";
import "./Collapsible.css";

// Impulse-style inline collapsible: a circled chevron on the left, the panel
// slides open (CSS grid 0fr -> 1fr, so no height measuring in JS).
// variant: "inline" (default) | "bar" (solid black bar) | "box" (outlined box).
export default function Collapsible({ id, title, open, onToggle, variant = "inline", children }) {
  const autoId = useId();
  const panelId = `${id || autoId}-panel`;

  return (
    <div id={id} className={`collapsible collapsible--${variant}${open ? " is-open" : ""}`}>
      <button type="button" className="collapsible__trigger" aria-expanded={open} aria-controls={panelId} onClick={onToggle}>
        <span className="collapsible__icon" aria-hidden="true">
          <svg viewBox="0 0 28 16">
            <path d="m1.57 1.59 12.76 12.77L27.1 1.59" />
          </svg>
        </span>
        <span>{title}</span>
      </button>
      <div id={panelId} className="collapsible__panel" role="region" aria-label={typeof title === "string" ? title : undefined}>
        <div className="collapsible__clip">
          <div className="collapsible__inner">{children}</div>
        </div>
      </div>
    </div>
  );
}
