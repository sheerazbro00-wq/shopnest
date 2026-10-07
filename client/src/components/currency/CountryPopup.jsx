import { useEffect, useRef, useState } from "react";
import { useCurrency } from "../../context/CurrencyContext";
import { CloseIcon } from "../Icons";
import CountryPicker from "./CountryPicker";
import "./Currency.css";

// First-visit "Where are you from?" (spec 007 US-1). Opens over whatever page the
// shopper landed on; any way of closing it counts as choosing Pakistan (AC-1.5).
export default function CountryPopup() {
  const { available, chosen } = useCurrency();
  const [ready, setReady] = useState(false);

  // Let the page paint first, so the popup sits over a real page (AC-1.1).
  useEffect(() => {
    const t = setTimeout(() => setReady(true), 350);
    return () => clearTimeout(t);
  }, []);

  if (!available || chosen || !ready) return null;
  return <Dialog />;
}

function Dialog() {
  const { setCountry } = useCurrency();
  const [code, setCode] = useState("PK"); // AC-1.3
  const cardRef = useRef(null);

  useEffect(() => {
    document.getElementById("cp-country")?.focus({ preventScroll: true });
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKey = (e) => {
      if (e.key === "Escape") return setCountry("PK");
      if (e.key !== "Tab") return;
      // keep focus inside the dialog
      const items = cardRef.current?.querySelectorAll("button, select");
      if (!items?.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [setCountry]);

  const submit = (e) => {
    e.preventDefault();
    setCountry(code);
  };

  return (
    <div className="cp-overlay" onClick={() => setCountry("PK")}>
      <div
        ref={cardRef}
        className="cp-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cp-title"
        aria-describedby="cp-lead"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="cp-grab" aria-hidden="true" />
        <button type="button" className="cp-close" aria-label="Close" onClick={() => setCountry("PK")}>
          <CloseIcon />
        </button>

        <p className="cp-brand" aria-hidden="true">
          ShopNest
        </p>
        <h2 id="cp-title" className="cp-title">
          Welcome to ShopNest
        </h2>
        <p id="cp-lead" className="cp-lead">
          Choose where you&apos;re shopping from to see prices in your currency.
        </p>

        <form className="cp-form" onSubmit={submit}>
          <p id="cp-label" className="cp-label">
            Where are you from?
          </p>
          <CountryPicker id="cp-country" labelledBy="cp-label" value={code} onChange={setCode} />
          <button type="submit" className="cp-continue">
            Continue shopping
          </button>
        </form>

        <p className="cp-note">You can change this anytime from the top of the page.</p>
      </div>
    </div>
  );
}
