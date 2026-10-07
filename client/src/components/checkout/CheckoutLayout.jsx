import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown } from "../Icons";
import "./Checkout.css";

const POLICY_LINKS = [
  { title: "Refund policy", url: "/pages/return-exchange-policy" },
  { title: "Shipping", url: "/pages/shipping-policy" },
  { title: "Privacy policy", url: "/pages/privacy-policy" },
  { title: "Terms of service", url: "/pages/terms-of-service" },
  { title: "Contact", url: "/pages/contact" },
];

const CheckoutBag = () => (
  <svg viewBox="0 0 20 20" aria-hidden="true" className="co-header__bag-icon">
    <path d="M4.5 6.5h11l-.8 10.2a1.5 1.5 0 0 1-1.5 1.3H6.8a1.5 1.5 0 0 1-1.5-1.3z" />
    <path d="M7.5 8V5.5a2.5 2.5 0 0 1 5 0V8" />
  </svg>
);

// Standalone Shopify-style checkout shell: no store header/footer, form on the
// left, grey order summary on the right (collapsible bar on mobile).
// `total` is already formatted in the order's currency (spec 008).
export default function CheckoutLayout({ summary, total, children }) {
  const [summaryOpen, setSummaryOpen] = useState(false);

  return (
    <div className="co">
      <header className="co-header">
        <div className="co-header__inner">
          <Link to="/" className="co-logo">
            ShopNest
          </Link>
          <Link to="/cart" className="co-header__bag" aria-label="Cart">
            <CheckoutBag />
          </Link>
        </div>
      </header>

      <div className={`co-summary-toggle${summaryOpen ? " is-open" : ""}`}>
        <button type="button" className="co-summary-toggle__btn" aria-expanded={summaryOpen} onClick={() => setSummaryOpen((o) => !o)}>
          <span>
            Order summary
            <ChevronDown className="co-summary-toggle__icon" />
          </span>
          <strong>{total}</strong>
        </button>
        <div className="co-summary-toggle__panel">
          <div className="co-summary-toggle__inner">{summary}</div>
        </div>
      </div>

      <div className="co-grid">
        <main className="co-main">
          <div className="co-main__inner">
            {children}
            <nav className="co-policies" aria-label="Store policies">
              {POLICY_LINKS.map((l) => (
                <Link key={l.url} to={l.url}>
                  {l.title}
                </Link>
              ))}
            </nav>
          </div>
        </main>
        <aside className="co-aside" aria-label="Order summary">
          <div className="co-aside__inner">{summary}</div>
        </aside>
      </div>
    </div>
  );
}
