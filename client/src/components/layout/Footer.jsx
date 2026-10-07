import { useState } from "react";
import { Link } from "react-router-dom";
import { footerLinks } from "../../data/navigation";
import { store } from "../../data/store";
import { useCurrency } from "../../context/CurrencyContext";
import { ChevronDown, EmailIcon, InstagramIcon, FacebookIcon, YoutubeIcon, TiktokIcon } from "../Icons";
import "./Footer.css";

const stores = [
  { city: "Lahore", locations: ["Flagship Store — Gulberg-II", "Emporium Mall — Level 3", "Packages Mall — Level 1"] },
  { city: "Islamabad", locations: ["F-10 Markaz", "Mall of Islamabad — Ground Floor"] },
  { city: "Karachi", locations: ["Dolmen Mall Clifton — Ground Floor"] },
];

const socials = [
  { label: "Instagram", Icon: InstagramIcon },
  { label: "Facebook", Icon: FacebookIcon },
  { label: "YouTube", Icon: YoutubeIcon },
  { label: "TikTok", Icon: TiktokIcon },
];

function FooterBlock({ id, title, open, onToggle, children, alwaysCollapsible = false }) {
  return (
    <div className={`footer__block${alwaysCollapsible ? " footer__block--collapsible" : ""}${open ? " is-open" : ""}`}>
      <h4 className="footer__title">{title}</h4>
      <button type="button" className="footer__title footer__toggle" aria-expanded={open} aria-controls={id} onClick={onToggle}>
        {title}
        <ChevronDown className="footer__chevron" />
      </button>
      <div id={id} className="footer__content">
        {children}
      </div>
    </div>
  );
}

export default function Footer() {
  const [open, setOpen] = useState(null);
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);
  const { currency, credit } = useCurrency();
  const toggle = (key) => setOpen((o) => (o === key ? null : key));

  return (
    <footer className="site-footer">
      <div className="page-width">
        <div className="footer__grid">
          <div className="footer__item footer__item--links">
            <ul className="site-footer__linklist">
              {footerLinks.map((l) => (
                <li key={l.url}>
                  <Link to={l.url}>{l.title}</Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="footer__item">
            <FooterBlock id="footer-newsletter" title="Sign up and save" open={open === "news"} onToggle={() => toggle("news")}>
              {subscribed ? (
                <p className="footer__note">Thanks for subscribing</p>
              ) : (
                <form
                  className="footer__newsletter"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (email) setSubscribed(true);
                  }}
                >
                  <label htmlFor="footer-email" className="visually-hidden">
                    Enter your email
                  </label>
                  <input
                    id="footer-email"
                    type="email"
                    required
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  <button type="submit" aria-label="Subscribe">
                    <EmailIcon />
                  </button>
                </form>
              )}
              <ul className="footer__social">
                {socials.map(({ label, Icon }) => (
                  <li key={label}>
                    <a href="#" aria-label={label} onClick={(e) => e.preventDefault()}>
                      <Icon />
                    </a>
                  </li>
                ))}
              </ul>
            </FooterBlock>
          </div>

          <div className="footer__item">
            <FooterBlock id="footer-service" title="Customer service" open={open === "service"} onToggle={() => toggle("service")}>
              <p className="footer__note">
                <a href={`mailto:${store.email}`}>Email</a> |{" "}
                <a href={store.whatsappHref} target="_blank" rel="noreferrer">
                  Whatsapp
                </a>
              </p>
              <p className="footer__note">
                Contact us at <a href={store.phoneHref}>{store.phone}</a>
              </p>
              <p className="footer__note footer__note--tight">{store.hours}</p>
              <p className="footer__note footer__note--tight">{store.days}</p>
            </FooterBlock>
          </div>

          <div className="footer__item">
            <FooterBlock
              id="footer-stores"
              title="Store location"
              open={open === "stores"}
              onToggle={() => toggle("stores")}
              alwaysCollapsible
            >
              {stores.map((s) => (
                <div key={s.city} className="footer__store">
                  <p className="footer__store-city">{s.city}</p>
                  {s.locations.map((loc) => (
                    <p key={loc} className="footer__store-loc">
                      {loc}
                    </p>
                  ))}
                </div>
              ))}
            </FooterBlock>
          </div>
        </div>

        <p className="site-footer__copyright">© {new Date().getFullYear()} ShopNest</p>
        {/* The rate provider asks for credit (spec 007 R-4) — only shown when its rates are in use. */}
        {currency !== "PKR" && credit && (
          <p className="site-footer__credit">
            Prices converted from PKR at today&apos;s rate.{" "}
            <a href={credit.url} target="_blank" rel="noopener noreferrer">
              Rates by {credit.name}
            </a>
          </p>
        )}
      </div>
    </footer>
  );
}
