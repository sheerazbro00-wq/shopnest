import { useEffect, useRef, useState } from "react";
import { Link, NavLink, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { fetchAdminCounts } from "../../api/admin";
import "./Admin.css";

const Icon = ({ d }) => (
  <svg viewBox="0 0 20 20" aria-hidden="true" className="adm-icon">
    <path d={d} />
  </svg>
);

const ICONS = {
  home: "M3 9.5 10 4l7 5.5V16a1 1 0 0 1-1 1h-3.5v-4.5h-5V17H4a1 1 0 0 1-1-1z",
  orders: "M4 3.5h12v13H4zM7 7h6M7 10h6M7 13h3.5",
  products: "M3.5 6.5 10 3l6.5 3.5v7L10 17l-6.5-3.5zM3.5 6.5 10 10l6.5-3.5M10 10v7",
  customers: "M10 9.5a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM4 17c.6-3.2 3-5 6-5s5.4 1.8 6 5",
  messages: "M3.5 4.5h13v9h-8l-3.5 3v-3H3.5z",
  store: "M11 3.5h5.5V9M16.5 3.5 9 11M14 12v4.5H3.5V6H8",
  menu: "M3 5.5h14M3 10h14M3 14.5h14",
  close: "M5 5l10 10M15 5 5 15",
};

const NAV = [
  { to: "/admin", label: "Home", icon: "home", end: true },
  { to: "/admin/orders", label: "Orders", icon: "orders", badge: "toFulfill" },
  { to: "/admin/products", label: "Products", icon: "products" },
  { to: "/admin/customers", label: "Customers", icon: "customers" },
  { to: "/admin/messages", label: "Messages", icon: "messages", badge: "newMessages" },
];

// Page frame: optional back link, the h1 (plain `title` or a richer `heading`
// such as a number with badges), an optional subtitle, and right-side actions.
export function AdminPage({ title, heading, subtitle, back, actions, children }) {
  useEffect(() => {
    document.title = `${title} · ShopNest Admin`;
  }, [title]);
  return (
    <>
      <div className={`adm-page-head${back ? " adm-page-head--back" : ""}`}>
        {back}
        <div className="adm-page-head__main">
          <h1>{heading || title}</h1>
          {subtitle && <p className="adm-page-head__sub">{subtitle}</p>}
        </div>
        {actions && <div className="adm-page-head__actions">{actions}</div>}
      </div>
      {children}
    </>
  );
}

// Admin shell. The client-side isAdmin check only decides what to render —
// every /api/admin route re-checks the token and role on the server.
export default function AdminLayout({ children }) {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [counts, setCounts] = useState({});
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    setDrawerOpen(false);
    setMenuOpen(false);
    if (user?.isAdmin) fetchAdminCounts().then(setCounts).catch(() => {});
  }, [location.pathname, user?.isAdmin]);

  // Screens fire this after changing an order/message so the badges refresh.
  useEffect(() => {
    if (!user?.isAdmin) return;
    const refresh = () => fetchAdminCounts().then(setCounts).catch(() => {});
    window.addEventListener("admin:counts-changed", refresh);
    return () => window.removeEventListener("admin:counts-changed", refresh);
  }, [user?.isAdmin]);

  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e) => e.key === "Escape" && setDrawerOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [drawerOpen]);

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

  if (!user) return <Navigate to="/account/login" replace state={{ from: location.pathname + location.search }} />;

  if (!user.isAdmin) {
    return (
      <div className="adm adm-denied">
        <div className="adm-card adm-denied__card">
          <h1>You don&rsquo;t have access to this page</h1>
          <p>The admin area is only available to store staff. You&rsquo;re signed in as {user.email}.</p>
          <Link to="/" className="adm-btn adm-btn--primary">
            Back to the store
          </Link>
        </div>
      </div>
    );
  }

  const initial = (user.firstName || user.name || user.email || "?").charAt(0).toUpperCase();

  return (
    <div className="adm">
      <header className="adm-topbar">
        <button type="button" className="adm-topbar__menu" aria-label="Open navigation" aria-expanded={drawerOpen} onClick={() => setDrawerOpen(true)}>
          <Icon d={ICONS.menu} />
        </button>
        <Link to="/admin" className="adm-topbar__brand">
          SHOPNEST <span>Admin</span>
        </Link>
        <div className="adm-topbar__right">
          <a href="/" target="_blank" rel="noreferrer" className="adm-topbar__store">
            <Icon d={ICONS.store} />
            <span>View store</span>
          </a>
          <div className="adm-user" ref={menuRef}>
            <button type="button" className="adm-user__btn" aria-haspopup="menu" aria-expanded={menuOpen} onClick={() => setMenuOpen((o) => !o)}>
              <span className="adm-user__avatar" aria-hidden="true">
                {initial}
              </span>
              <span className="adm-user__name">{user.name}</span>
            </button>
            {menuOpen && (
              <div className="adm-user__menu" role="menu">
                <p className="adm-user__email">{user.email}</p>
                <Link to="/account" role="menuitem">
                  My account
                </Link>
                <button type="button" role="menuitem" onClick={() => navigate("/", { replace: true, state: { signOut: true } })}>
                  Log out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className={`adm-scrim${drawerOpen ? " is-open" : ""}`} onClick={() => setDrawerOpen(false)} aria-hidden="true" />
      <nav className={`adm-sidebar${drawerOpen ? " is-open" : ""}`} aria-label="Admin">
        <button type="button" className="adm-sidebar__close" aria-label="Close navigation" onClick={() => setDrawerOpen(false)}>
          <Icon d={ICONS.close} />
        </button>
        <ul>
          {NAV.map((item) => (
            <li key={item.to}>
              <NavLink to={item.to} end={item.end} className={({ isActive }) => `adm-nav${isActive ? " is-active" : ""}`}>
                <Icon d={ICONS[item.icon]} />
                <span>{item.label}</span>
                {item.badge && counts[item.badge] > 0 && (
                  <span className="adm-nav__badge" aria-label={`${counts[item.badge]} need attention`}>
                    {counts[item.badge]}
                  </span>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <main className="adm-main">{children}</main>
    </div>
  );
}
