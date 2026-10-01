import { useEffect, useState } from "react";
import PredictiveSearch from "./PredictiveSearch";

// Header search: a white bar over the header plus a grey screen over the page
// (Impulse theme). Esc, the close button or a click on the screen closes it.
export default function SearchOverlay({ open, onClose, onNavigate, headerRef }) {
  const [screenTop, setScreenTop] = useState(0);

  useEffect(() => {
    if (!open) return;
    // The screen starts at the header so the announcement bar stays visible.
    setScreenTop(Math.max(0, headerRef.current?.getBoundingClientRect().top || 0));
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose, headerRef]);

  if (!open) return null;

  return (
    <>
      <div className="search-screen" style={{ top: screenTop }} onClick={onClose} aria-hidden="true" />
      <div className="search-overlay" role="dialog" aria-modal="true" aria-label="Search">
        <div className="page-width search-overlay__inner">
          <PredictiveSearch context="header" autoFocus onClose={onClose} onNavigate={onNavigate} />
        </div>
      </div>
    </>
  );
}
