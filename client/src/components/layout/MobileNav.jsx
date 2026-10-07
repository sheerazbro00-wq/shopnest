import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { mainMenu } from "../../data/navigation";
import { useAuth } from "../../context/AuthContext";
import { CloseIcon, InstagramIcon, FacebookIcon, YoutubeIcon, TiktokIcon } from "../Icons";
import { CurrencySelect } from "../currency/CurrencySwitcher";
import "./MobileNav.css";

const socials = [
  { label: "Instagram", Icon: InstagramIcon },
  { label: "Facebook", Icon: FacebookIcon },
  { label: "YouTube", Icon: YoutubeIcon },
  { label: "TikTok", Icon: TiktokIcon },
];

const Arrow = ({ left = false }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className={`mobile-nav__arrow${left ? " is-left" : ""}`}>
    <path d="M9 5l7 7-7 7" />
  </svg>
);

export default function MobileNav({ open, onClose }) {
  const [panel, setPanel] = useState(null);
  const { user } = useAuth();

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    if (!open) setPanel(null);
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const active = mainMenu.find((m) => m.title === panel);

  return (
    <div className={`drawer-wrap${open ? " is-open" : ""}`} aria-hidden={!open}>
      <div className="drawer-overlay" onClick={onClose} />
      <aside className="nav-drawer" role="dialog" aria-label="Menu">
        <div className="nav-drawer__top">
          <button type="button" className="drawer__close" aria-label="Close menu" onClick={onClose}>
            <CloseIcon />
          </button>
        </div>

        <div className={`nav-drawer__panels${active ? " show-sub" : ""}`}>
          <div className="nav-drawer__panel">
            <ul className="mobile-nav">
              {mainMenu.map((item) => (
                <li key={item.title} className="mobile-nav__item">
                  <Link to={item.url} className="mobile-nav__link" onClick={onClose}>
                    {item.title}
                  </Link>
                  {item.links && (
                    <button
                      type="button"
                      className="mobile-nav__toggle"
                      aria-label={`Show ${item.title} links`}
                      onClick={() => setPanel(item.title)}
                    >
                      <Arrow />
                    </button>
                  )}
                </li>
              ))}
            </ul>

            <Link to={user ? "/account" : "/account/login"} className="mobile-nav__login" onClick={onClose}>
              {user ? "My Account" : "Log in"}
            </Link>

            <CurrencySelect />

            <ul className="mobile-nav__social">
              {socials.map(({ label, Icon }) => (
                <li key={label}>
                  <a href="#" aria-label={label} onClick={(e) => e.preventDefault()}>
                    <Icon />
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div className="nav-drawer__panel">
            {active && (
              <>
                <button type="button" className="mobile-nav__back" onClick={() => setPanel(null)}>
                  <Arrow left />
                  <span>{active.title}</span>
                </button>
                <ul className="mobile-nav mobile-nav__sublist">
                  {active.links.map((link) => (
                    <li key={link.url + link.title} className="mobile-nav__item">
                      <Link to={link.url} className="mobile-nav__sublink" onClick={onClose}>
                        {link.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}
