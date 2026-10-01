import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { fetchAdminCustomer } from "../../api/admin";
import { errorMessage } from "../../api/orders";
import { AdminPage } from "../../components/admin/AdminLayout";
import { Badge, StatusBadge } from "../../components/admin/OrdersTable";
import Toast, { useToast } from "../../components/admin/Toast";
import { fullDate, mailto, paymentBadge, rupees, shortDate, waLink } from "../../components/admin/format";
import { sized } from "../../utils/format";
import "./OrderDetail.css";
import "./Customers.css";

const MSG_TONE = { New: "info", Read: "neutral", Replied: "success" };

// "5 days", "3 weeks", "4 months", "2 years"
function duration(since) {
  const days = Math.max(0, Math.floor((Date.now() - new Date(since)) / 86400000));
  const [n, unit] = days < 14 ? [days, "day"] : days < 60 ? [Math.floor(days / 7), "week"] : days < 730 ? [Math.floor(days / 30), "month"] : [Math.floor(days / 365), "year"];
  if (unit === "day" && n === 0) return "today";
  return `${n} ${unit}${n === 1 ? "" : "s"}`;
}

function Row({ children, action }) {
  return (
    <div className="cd-contact__row">
      {children}
      {action}
    </div>
  );
}

export default function CustomerDetail() {
  const { key } = useParams();
  const location = useLocation();
  const backSearch = location.state?.back || "";
  const [c, setC] = useState(null);
  const [error, setError] = useState("");
  const [toast, showToast] = useToast();

  useEffect(() => {
    setC(null);
    setError("");
    fetchAdminCustomer(key)
      .then(setC)
      .catch((err) => setError(errorMessage(err, "Couldn't load this customer.")));
  }, [key]);

  const back = (
    <Link to={`/admin/customers${backSearch}`} className="adm-btn od-icon-btn" aria-label="Back to customers">
      <svg viewBox="0 0 20 20" aria-hidden="true" className="adm-icon">
        <path d="M12 5 7 10l5 5" />
      </svg>
    </Link>
  );

  if (error || !c) {
    return (
      <AdminPage title="Customer" back={back}>
        {error ? (
          <p className="adm-error">{error}</p>
        ) : (
          <div aria-busy="true">
            <div className="adm-card cd-stats">
              <div className="adm-skeleton" style={{ height: 44, margin: 14 }} />
            </div>
            <div className="od-grid">
              <div className="adm-card od-card">
                <div className="adm-skeleton" style={{ height: 180 }} />
              </div>
              <div className="adm-card od-card">
                <div className="adm-skeleton" style={{ height: 120 }} />
              </div>
            </div>
          </div>
        )}
      </AdminPage>
    );
  }

  const copy = async (text, label) => {
    try {
      await navigator.clipboard.writeText(text);
      showToast(`${label} copied`);
    } catch {
      showToast("Couldn't copy — select the text instead", { error: true });
    }
  };

  const since = c.joinedAt || c.stats.firstOrderAt;
  const allOrdersLink = `/admin/orders?q=${encodeURIComponent(c.email)}`;
  const last = c.lastOrder;
  const a = c.address;
  const addressText = a ? [`${a.firstName} ${a.lastName}`, a.address, a.apartment, [a.city, a.postalCode].filter(Boolean).join(" "), a.country].filter(Boolean).join("\n") : "";

  return (
    <AdminPage
      title={c.name}
      back={back}
      heading={
        <>
          {c.name}
          {!c.hasAccount && <Badge label="Guest" tone="neutral" />}
        </>
      }
      subtitle={[c.address?.city, since && (duration(since) === "today" ? "New customer today" : `Customer for ${duration(since)}`)].filter(Boolean).join(" · ")}
      actions={
        <a href={mailto(c.email)} className="adm-btn">
          Email customer
        </a>
      }
    >
      <dl className="adm-card cd-stats">
        <div>
          <dt>Amount spent</dt>
          <dd>{rupees(c.stats.spent)}</dd>
        </div>
        <div>
          <dt>Orders</dt>
          <dd>
            {c.stats.orders}
            {c.stats.items > 0 && <small>{c.stats.items} items bought</small>}
          </dd>
        </div>
        <div>
          <dt>Average order</dt>
          <dd>{c.stats.aov ? rupees(c.stats.aov) : "—"}</dd>
        </div>
        <div>
          <dt>{c.hasAccount ? "Signed up" : "First order"}</dt>
          <dd>
            {since ? new Date(since).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}
            {since && <small>{duration(since) === "today" ? "Today" : `${duration(since)} ago`}</small>}
          </dd>
        </div>
      </dl>

      <div className="od-grid">
        <div className="od-main">
          <section className="adm-card od-card" aria-labelledby="LastTitle">
            <h2 id="LastTitle" className="adm-card__title">
              Last order placed
            </h2>
            {last ? (
              <>
                <div className="cd-last__meta">
                  <Link to={`/admin/orders/${last._id}`}>#{last.orderNumber}</Link>
                  <time className="adm-muted" dateTime={last.createdAt}>
                    {fullDate(last.createdAt)}
                  </time>
                  <Badge {...paymentBadge(last)} />
                  <StatusBadge status={last.status} />
                </div>
                <ul className="od-items">
                  {last.orderItems.map((it, i) => (
                    <li key={i}>
                      <span className="od-items__thumb">{it.image && <img src={sized(it.image, 120)} alt="" loading="lazy" />}</span>
                      <span className="od-items__info">
                        <a href={`/products/${it.handle}`} target="_blank" rel="noreferrer">
                          {it.name}
                        </a>
                        <span className="adm-muted">{[it.color, it.size].filter(Boolean).join(" / ")}</span>
                      </span>
                      <span className="od-items__qty">
                        {rupees(it.price)} × {it.qty}
                      </span>
                      <span className="od-items__total">{rupees(it.price * it.qty)}</span>
                    </li>
                  ))}
                </ul>
                <div className="cd-last__foot">
                  <span className="adm-muted">
                    Total <strong className="od-strong">{rupees(last.totalPrice)}</strong>
                  </span>
                  <Link to={`/admin/orders/${last._id}`} className="adm-btn">
                    View order
                  </Link>
                </div>
              </>
            ) : (
              <p className="cd-empty">This customer hasn&rsquo;t placed an order yet.</p>
            )}
          </section>

          {c.orders.length > 1 && (
            <section className="adm-card od-card" aria-labelledby="OrdersTitle">
              <div className="od-card__head od-card__head--split">
                <h2 id="OrdersTitle" className="adm-card__title">
                  Orders
                </h2>
                {c.stats.orders > c.orders.length && (
                  <Link to={allOrdersLink} className="adm-card__link">
                    View all {c.stats.orders}
                  </Link>
                )}
              </div>
              <ul className="cd-orders">
                {c.orders.map((o) => (
                  <li key={o._id}>
                    <Link to={`/admin/orders/${o._id}`}>
                      <span className="cd-orders__num">#{o.orderNumber}</span>
                      <span className="cd-orders__date adm-muted">
                        {shortDate(o.createdAt)} · {o.items} {o.items === 1 ? "item" : "items"}
                      </span>
                      <span className="cd-orders__badges">
                        <Badge {...paymentBadge(o)} />
                        <StatusBadge status={o.status} />
                      </span>
                      <span className="cd-orders__total">{rupees(o.totalPrice)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {c.messages.length > 0 && (
            <section className="adm-card od-card" aria-labelledby="MsgsTitle">
              <h2 id="MsgsTitle" className="adm-card__title">
                Messages from this customer
              </h2>
              <ul className="cd-msgs">
                {c.messages.map((m) => (
                  <li key={m._id}>
                    <Link to={`/admin/messages/${m._id}`}>
                      <span className="cd-msgs__top">
                        <span className="adm-muted">{shortDate(m.createdAt)}</span>
                        <Badge label={m.status} tone={MSG_TONE[m.status]} />
                      </span>
                      <p>{m.message}</p>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <aside className="od-side">
          <section className="adm-card od-card" aria-labelledby="ContactTitle">
            <h2 id="ContactTitle" className="adm-card__title">
              Contact information
            </h2>
            <div className="cd-contact">
              <Row
                action={
                  <button type="button" className="adm-btn adm-btn--plain od-copy" onClick={() => copy(c.email, "Email")}>
                    Copy
                  </button>
                }
              >
                <a href={mailto(c.email)} className="adm-card__link">
                  {c.email}
                </a>
              </Row>
              {c.phone ? (
                <p className="od-contact">
                  <a href={`tel:${c.phone}`}>{c.phone}</a>
                  <a href={waLink(c.phone)} target="_blank" rel="noreferrer" className="od-wa">
                    WhatsApp
                  </a>
                </p>
              ) : (
                <p className="adm-muted od-small">No phone number</p>
              )}
            </div>
            <h3 className="od-sub">Account</h3>
            <p className="od-small">{c.hasAccount ? `Signed up ${new Date(c.joinedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}` : "Checked out as a guest — no account"}</p>
            <h3 className="od-sub">Email marketing</h3>
            <p>{c.marketing ? <Badge label="Subscribed" tone="success" /> : <span className="adm-muted od-small">Not subscribed</span>}</p>
          </section>

          <section className="adm-card od-card" aria-labelledby="AddrTitle">
            <div className="od-card__head od-card__head--split">
              <h2 id="AddrTitle" className="adm-card__title">
                {c.hasAccount && c.addressCount ? "Default address" : "Last shipping address"}
              </h2>
              {a && (
                <button type="button" className="adm-btn adm-btn--plain od-copy" onClick={() => copy(addressText, "Address")}>
                  Copy
                </button>
              )}
            </div>
            {a ? (
              <>
                <address className="od-address">{addressText}</address>
                {c.addressCount > 1 && <p className="adm-muted od-small">+ {c.addressCount - 1} more saved</p>}
                <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${a.address}, ${a.city}, Pakistan`)}`} target="_blank" rel="noreferrer" className="adm-card__link">
                  View map
                </a>
              </>
            ) : (
              <p className="adm-muted od-small">No address yet</p>
            )}
          </section>
        </aside>
      </div>
      <Toast {...toast} />
    </AdminPage>
  );
}
