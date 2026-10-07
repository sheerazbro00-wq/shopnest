import { useEffect, useId, useRef, useState } from "react";
import { COUNTRIES, countryOf } from "../../utils/currency";
import { ChevronDown } from "../Icons";
import Flag from "./Flag";
import "./Currency.css";

// Store-styled country dropdown (spec 007). Replaces the native <select>, whose
// phone picker (an Android system dialog) didn't match the site. The list opens
// inline, pushing content down, so it never falls off the bottom of a phone sheet.
// Keyboard: Enter/Space/↓ opens, ↑/↓ move, Enter picks, Esc/Tab close.
// `codes` limits the choices (checkout offers only countries it can price, spec 008 R-6).
export default function CountryPicker({ id, value, onChange, labelledBy, codes }) {
  const [open, setOpen] = useState(false);
  const listId = useId();
  const buttonRef = useRef(null);
  const listRef = useRef(null);
  const wrapRef = useRef(null);
  const current = countryOf(value);
  const options = codes ? COUNTRIES.filter((c) => codes.includes(c.code)) : COUNTRIES;

  useEffect(() => {
    if (!open) return;
    listRef.current?.querySelector('[aria-selected="true"]')?.focus({ preventScroll: true });
    const onDown = (e) => !wrapRef.current?.contains(e.target) && setOpen(false);
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  const close = (refocus = true) => {
    setOpen(false);
    if (refocus) buttonRef.current?.focus();
  };

  const pick = (code) => {
    onChange(code);
    close();
  };

  const onButtonKey = (e) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      setOpen(true);
    }
  };

  const onListKey = (e) => {
    const items = [...listRef.current.querySelectorAll("[role=option]")];
    const i = items.indexOf(document.activeElement);
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      items[(i + (e.key === "ArrowDown" ? 1 : items.length - 1)) % items.length]?.focus();
    } else if (e.key === "Home" || e.key === "End") {
      e.preventDefault();
      items[e.key === "Home" ? 0 : items.length - 1]?.focus();
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (i >= 0) pick(items[i].dataset.code);
    } else if (e.key === "Escape") {
      e.stopPropagation(); // close the list, not the whole popup
      close();
    } else if (e.key === "Tab") {
      close(false);
    }
  };

  return (
    <div ref={wrapRef} className={`cpick${open ? " is-open" : ""}`}>
      <button
        ref={buttonRef}
        id={id}
        type="button"
        className="cpick__button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-labelledby={labelledBy ? `${labelledBy} ${id}` : undefined}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={onButtonKey}
      >
        <Flag code={current.code} />
        <span className="cpick__name">{current.name}</span>
        <span className="cpick__cur">
          {current.currency} {current.symbol}
        </span>
        <ChevronDown className="cpick__chevron" />
      </button>

      <div className="cpick__panel">
        <ul
          ref={listRef}
          id={listId}
          className="cpick__list"
          role="listbox"
          aria-labelledby={labelledBy}
          onKeyDown={onListKey}
        >
          {options.map((c) => (
            <li
              key={c.code}
              role="option"
              tabIndex={-1}
              data-code={c.code}
              aria-selected={c.code === current.code}
              className="cpick__option"
              onClick={() => pick(c.code)}
            >
              <Flag code={c.code} />
              <span className="cpick__name">{c.name}</span>
              <span className="cpick__cur">
                {c.currency} {c.symbol}
              </span>
              <svg className="cpick__check" viewBox="0 0 16 16" aria-hidden="true">
                <path d="M3 8.5l3.2 3L13 4.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
