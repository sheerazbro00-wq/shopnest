import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { mainMenu } from "../../data/navigation";
import { useCart } from "../../context/CartContext";
import { useAuth } from "../../context/AuthContext";
import Logo from "./Logo";
import MobileNav from "./MobileNav";
import SearchOverlay from "../search/SearchOverlay";
import CurrencySwitcher from "../currency/CurrencySwitcher";
import { SearchIcon, UserIcon, BagIcon, MenuIcon } from "../Icons";
import "./Header.css";

export default function Header() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [openItem, setOpenItem] = useState(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const { itemCount, openCart } = useCart();
  const { user } = useAuth();
  const location = useLocation();
  const headerRef = useRef(null);
  const searchBtnRef = useRef(null);

  useEffect(() => {
    setDrawerOpen(false);
    setOpenItem(null);
    setSearchOpen(false);
  }, [location.pathname, location.search]);

  const closeSearch = useCallback(() => {
    setSearchOpen(false);
    searchBtnRef.current?.focus({ preventScroll: true });
  }, []);

  return (
    <>
      <header className="site-header" ref={headerRef}>
        <div className="page-width site-header__inner">
          <div className="header-item header-item--left">
            <button
              type="button"
              className="site-nav__link site-nav__link--icon mobile-only menu-toggle"
              aria-label="Open menu"
              onClick={() => setDrawerOpen(true)}
            >
              <MenuIcon />
              <span className="menu-toggle__label">Menu</span>
            </button>
            <Logo className="header-logo" />
          </div>

          <nav className="header-item header-item--navigation" aria-label="Primary">
            <ul className="site-navigation">
              {mainMenu.map((item) => (
                <li
                  key={item.title}
                  className={`site-nav__item${item.links ? " has-dropdown" : ""}${openItem === item.title ? " is-open" : ""}`}
                  onMouseEnter={() => item.links && setOpenItem(item.title)}
                  onMouseLeave={() => setOpenItem(null)}
                >
                  <Link to={item.url} className="site-nav__link site-nav__link--underline">
                    {item.title}
                  </Link>
                  {item.links && (
                    <ul className="site-nav__dropdown">
                      {item.links.map((link) => (
                        <li key={link.url + link.title}>
                          <Link to={link.url} className="site-nav__dropdown-link">
                            {link.title}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          </nav>

          <div className="header-item header-item--icons">
            <CurrencySwitcher />
            <Link
              ref={searchBtnRef}
              to="/search"
              className="site-nav__link site-nav__link--icon js-search-header"
              aria-label="Search"
              aria-haspopup="dialog"
              aria-expanded={searchOpen}
              onClick={(e) => {
                // open the overlay; /search itself stays reachable by URL
                e.preventDefault();
                setSearchOpen(true);
              }}
            >
              <SearchIcon />
            </Link>
            <Link
              to={user ? "/account" : "/account/login"}
              className="site-nav__link site-nav__link--icon"
              aria-label={user ? "Account" : "Log in"}
            >
              <UserIcon />
            </Link>
            <Link
              to="/cart"
              className="site-nav__link site-nav__link--icon cart-link"
              aria-label={`Cart, ${itemCount} items`}
              onClick={(e) => {
                // open the drawer instead; the /cart page stays reachable by URL
                e.preventDefault();
                openCart();
              }}
            >
              <BagIcon />
              {itemCount > 0 && <span className="cart-link__bubble" />}
            </Link>
          </div>
        </div>
        <SearchOverlay open={searchOpen} onClose={closeSearch} onNavigate={() => setSearchOpen(false)} headerRef={headerRef} />
      </header>

      <MobileNav open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </>
  );
}
