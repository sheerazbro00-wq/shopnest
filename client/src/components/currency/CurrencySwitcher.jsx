import { useEffect, useId, useRef, useState } from "react";
import { useCurrency } from "../../context/CurrencyContext";
import { COUNTRIES } from "../../utils/currency";
import { ChevronDown } from "../Icons";
import Flag from "./Flag";
import "./Currency.css";

// Header "🇺🇸 USD ▾" menu (spec 007 US-3). Hidden when there are no rates (AC-5.3).
export default function CurrencySwitcher() {
  const { available, country, setCountry } = useCurrency();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const buttonRef = useRef(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    wrapRef.current?.querySelector('[aria-checked="true"]')?.focus();
    const onDown = (e) => !wrapRef.current?.contains(e.target) && setOpen(false);
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      buttonRef.current?.focus();
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!available) return null;

  const choose = (code) => {
    setCountry(code);
    setOpen(false);
    buttonRef.current?.focus();
  };

  // Up/Down move between the three choices.
  const onMenuKey = (e) => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    const items = [...e.currentTarget.querySelectorAll("[role=menuitemradio]")];
    const i = items.indexOf(document.activeElement);
    items[(i + (e.key === "ArrowDown" ? 1 : items.length - 1)) % items.length]?.focus();
  };

  return (
    <div className="cur-switch" ref={wrapRef}>
      <button
        ref={buttonRef}
        type="button"
        className="cur-switch__btn"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={`Country and currency: ${country.name}, ${country.currency}`}
        onClick={() => setOpen((o) => !o)}
      >
        <Flag code={country.code} />
        <span className="cur-switch__code">{country.currency}</span>
        <ChevronDown className="cur-switch__chevron" />
      </button>
      {open && (
        <ul id={menuId} className="cur-switch__menu" role="menu" aria-label="Country and currency" onKeyDown={onMenuKey}>
          {COUNTRIES.map((c) => (
            <li key={c.code} role="none">
              <button
                type="button"
                role="menuitemradio"
                aria-checked={c.code === country.code}
                className="cur-switch__item"
                onClick={() => choose(c.code)}
              >
                <Flag code={c.code} />
                <span className="cur-switch__name">{c.name}</span>
                <span className="cur-switch__cur">
                  {c.currency} {c.symbol}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// Native select for the phone menu drawer (AC-3.1).
export function CurrencySelect({ className = "" }) {
  const { available, country, setCountry } = useCurrency();
  if (!available) return null;
  return (
    <div className={`cur-select ${className}`}>
      <label htmlFor="cur-select" className="cur-select__label">
        Country / currency
      </label>
      <div className="cp-select">
        <Flag code={country.code} className="cp-select__flag" />
        <select id="cur-select" value={country.code} onChange={(e) => setCountry(e.target.value)}>
          {COUNTRIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.name} — {c.currency} ({c.symbol})
            </option>
          ))}
        </select>
        <ChevronDown className="cp-select__chevron" />
      </div>
    </div>
  );
}
