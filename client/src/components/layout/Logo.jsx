import { Link } from "react-router-dom";
import "./Logo.css";

export default function Logo({ className = "" }) {
  return (
    <Link to="/" className={`site-logo ${className}`} aria-label="ShopNest home">
      <span className="site-logo__text">ShopNest</span>
    </Link>
  );
}
