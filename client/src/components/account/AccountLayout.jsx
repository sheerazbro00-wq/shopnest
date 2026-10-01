import { useEffect, useRef, useState } from "react";
import { Link, NavLink, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import "../checkout/Checkout.css";
import "./Account.css";

const ProfileIcon = () => (
  <svg viewBox="0 0 20 20" aria-hidden="true" className="acc-menu__icon">
    <circle cx="10" cy="7" r="3.2" />
    <path d="M3.5 17c.9-3.2 3.4-4.8 6.5-4.8s5.6 1.6 6.5 4.8" />
  </svg>
);

// Log out = go to the store home with a signOut flag; <SignOutOnArrival> clears the
// session there. (Router navigations are transitions, so logging out first would
// re-render this layout signed-out and bounce to /account/login instead.)
export function SignOutOnArrival() {
  const { logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!location.state?.signOut) return;
    logout();
    navigate(location.pathname, { replace: true, state: null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);

  return null;
}

// Shopify-style customer account shell. Redirects to sign-in when logged out.
export default function AccountLayout({ title, children }) {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (title) document.title = `${title} – ShopNest`;
  }, [title]);

  useEffect(() => {
    if (!menuOpen) return;
    const close = (e) => {
      if (e.type === "keydown" ? e.key === "Escape" : !menuRef.current?.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [menuOpen]);

  if (!user) return <Navigate to="/account/login" replace state={{ from: location.pathname }} />;

  const signOut = () => navigate("/", { replace: true, state: { signOut: true } });

  return (
    <div className="co acc">
      <header className="acc-header">
        <div className="acc-header__inner">
          <Link to="/" className="co-logo">
            ShopNest
          </Link>
          <nav className="acc-nav" aria-label="Account">
            <Link to="/">Shop</Link>
            <NavLink to="/account" end className={({ isActive }) => (isActive || location.pathname.startsWith("/account/orders") ? "is-active" : "")}>
              Orders
            </NavLink>
          </nav>
          <div className="acc-menu" ref={menuRef}>
            <button
              type="button"
              className="acc-menu__btn"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              aria-label="Account menu"
              onClick={() => setMenuOpen((o) => !o)}
            >
              <ProfileIcon />
              <svg viewBox="0 0 10 10" aria-hidden="true" className="acc-menu__chevron">
                <path d="m2 3.5 3 3 3-3" />
              </svg>
            </button>
            {menuOpen && (
              <div className="acc-menu__panel" role="menu">
                <div className="acc-menu__who">
                  <strong>{user.name}</strong>
                  <span>{user.email}</span>
                </div>
                <Link to="/account/profile" role="menuitem" onClick={() => setMenuOpen(false)}>
                  Profile
                </Link>
                <Link to="/account" role="menuitem" onClick={() => setMenuOpen(false)}>
                  Orders
                </Link>
                {user.isAdmin && (
                  <Link to="/admin" role="menuitem" onClick={() => setMenuOpen(false)}>
                    Store admin
                  </Link>
                )}
                <button type="button" role="menuitem" onClick={signOut}>
                  Log out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="acc-main">{children}</main>
    </div>
  );
}
