import { useEffect } from "react";
import { Link } from "react-router-dom";
import "../checkout/Checkout.css";
import "./Auth.css";

// Standalone sign-in shell (like Shopify customer accounts): centered logo,
// a narrow card in the middle, privacy link at the bottom.
export default function AuthLayout({ title, subtitle, docTitle, children }) {
  useEffect(() => {
    document.title = `${docTitle || title} – ShopNest`;
  }, [docTitle, title]);

  return (
    <div className="co auth">
      <header className="auth__header">
        <Link to="/" className="co-logo">
          ShopNest
        </Link>
      </header>

      <main className="auth__main">
        <div className="auth__card">
          <h1 className="auth__title">{title}</h1>
          {subtitle && <p className="auth__subtitle">{subtitle}</p>}
          {children}
        </div>
      </main>

      <footer className="auth__footer">
        <Link to="/pages/privacy-policy">Privacy policy</Link>
      </footer>
    </div>
  );
}
