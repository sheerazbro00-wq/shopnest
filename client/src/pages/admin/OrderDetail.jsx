import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { fetchAdminOrder, updateAdminOrder } from "../../api/admin";
import { errorMessage } from "../../api/orders";
import { AdminPage } from "../../components/admin/AdminLayout";
import ConfirmDialog from "../../components/admin/ConfirmDialog";
import Toast, { useToast } from "../../components/admin/Toast";
import { Badge, StatusBadge } from "../../components/admin/OrdersTable";
import { paymentBadge, paymentLabel, rupees } from "../../components/admin/format";
import { sized } from "../../utils/format";
import "./OrderDetail.css";

const fullDate = (d) =>
  new Date(d).toLocaleString("en-US", { month: "long", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }).replace(" PM", " pm").replace(" AM", " am");

const EVENT = {
  placed: "Order placed",
  paid: "Payment received",
  shipped: "Marked as shipped",
  delivered: "Marked as delivered",
  cancelled: "Order cancelled",
};

const ACTION_DONE = { ship: "Order marked as shipped", deliver: "Order marked as delivered", cancel: "Order cancelled" };

// Older orders may predate the history field: rebuild a basic timeline.
function timelineOf(o) {
  if (o.history?.length) return [...o.history].reverse();
  const items = [{ event: "placed", at: o.createdAt }];
  if (o.paidAt) items.push({ event: "paid", at: o.paidAt });
  if (o.shippedAt) items.push({ event: "shipped", at: o.shippedAt });
  if (o.deliveredAt) items.push({ event: "delivered", at: o.deliveredAt });
  if (o.cancelledAt) items.push({ event: "cancelled", at: o.cancelledAt });
  return items.reverse();
}

const waLink = (phone) => `https://wa.me/${String(phone).replace(/^0/, "92").replace(/^\+/, "")}`;

function NoteCard({ order, onSaved }) {
  const [note, setNote] = useState(order.adminNote || "");
  const [saving, setSaving] = useState(false);
  const dirty = note.trim() !== (order.adminNote || "");

  useEffect(() => setNote(order.adminNote || ""), [order._id, order.adminNote]);

  const save = async () => {
    setSaving(true);
    try {
      await onSaved({ note });
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="adm-card od-card" aria-labelledby="NoteTitle">
      <h2 id="NoteTitle" className="adm-card__title">
        Notes
      </h2>
      <label htmlFor="OrderNote" className="visually-hidden">
        Private note
      </label>
      <textarea
        id="OrderNote"
        className="od-note"
        rows={3}
        maxLength={1000}
        placeholder="Add a note for your team — customers never see it"
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />
      {dirty && (
        <div className="od-note__actions">
          <button type="button" className="adm-btn" onClick={() => setNote(order.adminNote || "")} disabled={saving}>
            Discard
          </button>
          <button type="button" className="adm-btn adm-btn--primary" onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      )}
    </section>
  );
}

export default function OrderDetail() {
  const { id } = useParams();
  const location = useLocation();
  const backSearch = location.state?.back || "";
  const [order, setOrder] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(null); // the action in flight
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [copied, setCopied] = useState(false);
  const [toast, showToast] = useToast();

  useEffect(() => {
    setOrder(null);
    setError("");
    fetchAdminOrder(id)
      .then(setOrder)
      .catch((err) => setError(errorMessage(err, "Couldn't load this order.")));
  }, [id]);

  const apply = async (body) => {
    setBusy(body.action || "note");
    try {
      const updated = await updateAdminOrder(id, body);
      setOrder(updated);
      showToast(body.action ? ACTION_DONE[body.action] : "Note saved");
      if (body.action) window.dispatchEvent(new Event("admin:counts-changed"));
    } catch (err) {
      showToast(errorMessage(err, "Something went wrong."), { error: true });
    } finally {
      setBusy(null);
      setConfirmCancel(false);
    }
  };

  const back = (
    <Link to={`/admin/orders${backSearch}`} className="adm-btn od-icon-btn" aria-label="Back to orders">
      <svg viewBox="0 0 20 20" aria-hidden="true" className="adm-icon">
        <path d="M12 5 7 10l5 5" />
      </svg>
    </Link>
  );

  if (error) {
    return (
      <AdminPage title="Order" back={back}>
        <p className="adm-error">{error}</p>
      </AdminPage>
    );
  }

  if (!order) {
    return (
      <AdminPage title="Order" back={back}>
        <div className="od-grid" aria-busy="true">
          <div className="adm-card od-card">
            <div className="adm-skeleton" style={{ height: 180 }} />
          </div>
          <div className="adm-card od-card">
            <div className="adm-skeleton" style={{ height: 120 }} />
          </div>
        </div>
      </AdminPage>
    );
  }

  const a = order.shippingAddress;
  const itemCount = order.orderItems.reduce((n, i) => n + i.qty, 0);
  const canShip = order.status === "Pending";
  const canDeliver = ["Pending", "Shipped"].includes(order.status);
  const canCancel = ["Awaiting payment", "Pending", "Shipped"].includes(order.status);
  const addressText = [`${a.firstName} ${a.lastName}`, a.address, a.apartment, [a.city, a.postalCode].filter(Boolean).join(" "), a.country, order.phone]
    .filter(Boolean)
    .join("\n");

  const copyAddress = async () => {
    try {
      await navigator.clipboard.writeText(addressText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      showToast("Couldn't copy — select the text instead", { error: true });
    }
  };

  const pager = (
    <>
      {[
        { id: order.nextId, label: "Newer order", d: "M12 5 7 10l5 5" },
        { id: order.prevId, label: "Older order", d: "m8 5 5 5-5 5" },
      ].map((n) =>
        n.id ? (
          <Link key={n.label} to={`/admin/orders/${n.id}`} state={{ back: backSearch }} className="adm-btn od-icon-btn" aria-label={n.label}>
            <svg viewBox="0 0 20 20" aria-hidden="true" className="adm-icon">
              <path d={n.d} />
            </svg>
          </Link>
        ) : (
          <button key={n.label} type="button" className="adm-btn od-icon-btn" aria-label={n.label} disabled>
            <svg viewBox="0 0 20 20" aria-hidden="true" className="adm-icon">
              <path d={n.d} />
            </svg>
          </button>
        )
      )}
    </>
  );

  return (
    <AdminPage
      title={`Order #${order.orderNumber}`}
      back={back}
      heading={
        <>
          #{order.orderNumber}
          <Badge {...paymentBadge(order)} />
          <StatusBadge status={order.status} />
        </>
      }
      subtitle={`${fullDate(order.createdAt)} · ${paymentLabel(order, { admin: true })}`}
      actions={pager}
    >

      {(canShip || canDeliver || canCancel) && (
        <div className="od-actions">
          {canShip && (
            <button type="button" className="adm-btn adm-btn--primary" disabled={Boolean(busy)} onClick={() => apply({ action: "ship" })}>
              {busy === "ship" ? "Saving…" : "Mark as shipped"}
            </button>
          )}
          {canDeliver && (
            <button type="button" className={`adm-btn${canShip ? "" : " adm-btn--primary"}`} disabled={Boolean(busy)} onClick={() => apply({ action: "deliver" })}>
              {busy === "deliver" ? "Saving…" : "Mark as delivered"}
            </button>
          )}
          {canCancel && (
            <button type="button" className="adm-btn adm-btn--plain od-cancel" disabled={Boolean(busy)} onClick={() => setConfirmCancel(true)}>
              Cancel order
            </button>
          )}
        </div>
      )}

      <div className="od-grid">
        <div className="od-main">
          <section className="adm-card od-card" aria-labelledby="ItemsTitle">
            <div className="od-card__head">
              <StatusBadge status={order.status} />
              <h2 id="ItemsTitle" className="adm-card__title">
                {itemCount} {itemCount === 1 ? "item" : "items"}
              </h2>
            </div>
            <ul className="od-items">
              {order.orderItems.map((it, i) => (
                <li key={i}>
                  <span className="od-items__thumb">{it.image && <img src={sized(it.image, 120)} alt="" loading="lazy" />}</span>
                  <span className="od-items__info">
                    <a href={`/products/${it.handle}`} target="_blank" rel="noreferrer">
                      {it.name}
                    </a>
                    <span className="adm-muted">{[it.color, it.size].filter(Boolean).join(" / ")}</span>
                    {it.sku && <span className="od-items__sku">SKU: {it.sku}</span>}
                  </span>
                  <span className="od-items__qty">
                    {rupees(it.price)} × {it.qty}
                  </span>
                  <span className="od-items__total">{rupees(it.price * it.qty)}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="adm-card od-card" aria-labelledby="PayTitle">
            <div className="od-card__head">
              <Badge {...paymentBadge(order)} />
              <h2 id="PayTitle" className="adm-card__title">
                Payment
              </h2>
            </div>
            <dl className="od-sums">
              <div>
                <dt>Subtotal</dt>
                <dd>
                  <span className="adm-muted">
                    {itemCount} {itemCount === 1 ? "item" : "items"}
                  </span>
                  {rupees(order.itemsPrice)}
                </dd>
              </div>
              <div>
                <dt>Shipping</dt>
                <dd>{order.shippingPrice ? rupees(order.shippingPrice) : "Free"}</dd>
              </div>
              <div className="od-sums__total">
                <dt>Total</dt>
                <dd>{rupees(order.totalPrice)}</dd>
              </div>
              <div className="od-sums__paid">
                <dt>{order.isPaid ? "Paid by customer" : order.status === "Cancelled" ? "Not collected" : order.paymentMethod === "COD" ? "To collect on delivery" : order.paymentMethod === "PayPal" ? "Awaiting PayPal payment" : "Awaiting card payment"}</dt>
                <dd>{rupees(order.isPaid ? order.totalPrice : order.status === "Cancelled" ? 0 : order.totalPrice)}</dd>
              </div>
            </dl>
            {order.paymentMethod === "PayPal" ? (
              <p className="od-small adm-muted">
                {paymentLabel(order, { admin: true })} · ${order.paypal?.usd} at Rs {order.paypal?.rate}/USD
                {order.paypal?.captureId && <> · transaction {order.paypal.captureId}</>}
              </p>
            ) : (
              order.paymentResult?.id && <p className="od-small adm-muted">Stripe payment: {order.paymentResult.id}</p>
            )}
          </section>

          <section className="adm-card od-card" aria-labelledby="TimelineTitle">
            <h2 id="TimelineTitle" className="adm-card__title">
              Timeline
            </h2>
            <ol className="od-timeline">
              {timelineOf(order).map((h, i) => (
                <li key={i} className={`od-timeline__item od-timeline__item--${h.event}`}>
                  <span className="od-timeline__dot" aria-hidden="true" />
                  <span className="od-timeline__text">
                    <strong>{EVENT[h.event] || h.event}</strong>
                    {h.by && <span className="adm-muted"> · by {h.by}</span>}
                  </span>
                  <time className="adm-muted" dateTime={h.at}>
                    {fullDate(h.at)}
                  </time>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <aside className="od-side">
          <NoteCard order={order} onSaved={apply} />

          <section className="adm-card od-card" aria-labelledby="CustomerTitle">
            <h2 id="CustomerTitle" className="adm-card__title">
              Customer
            </h2>
            <p className="od-strong">
              {a.firstName} {a.lastName}
            </p>
            <p className="adm-muted od-small">{order.user ? "Has an account" : "Guest checkout"}</p>
            <Link to={`/admin/orders?q=${encodeURIComponent(order.email)}`} className="adm-card__link">
              {order.customerOrders} {order.customerOrders === 1 ? "order" : "orders"}
            </Link>
            <h3 className="od-sub">Contact information</h3>
            <p>
              <a href={`mailto:${order.email}`} className="adm-card__link">
                {order.email}
              </a>
            </p>
            <p className="od-contact">
              <a href={`tel:${order.phone}`}>{order.phone}</a>
              <a href={waLink(order.phone)} target="_blank" rel="noreferrer" className="od-wa">
                WhatsApp
              </a>
            </p>
          </section>

          <section className="adm-card od-card" aria-labelledby="ShipTitle">
            <div className="od-card__head od-card__head--split">
              <h2 id="ShipTitle" className="adm-card__title">
                Shipping address
              </h2>
              <button type="button" className="adm-btn adm-btn--plain od-copy" onClick={copyAddress}>
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <address className="od-address">{addressText}</address>
            <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${a.address}, ${a.city}, Pakistan`)}`} target="_blank" rel="noreferrer" className="adm-card__link">
              View map
            </a>
          </section>
        </aside>
      </div>

      <ConfirmDialog
        open={confirmCancel}
        title={`Cancel order #${order.orderNumber}?`}
        confirmLabel="Cancel order"
        cancelLabel="Keep order"
        busy={busy === "cancel"}
        onConfirm={() => apply({ action: "cancel" })}
        onClose={() => setConfirmCancel(false)}
      >
        <p>The order will be marked as cancelled and can&rsquo;t be reopened.</p>
        {order.paymentMethod === "PayPal" && order.isPaid && order.paypal?.mode !== "simulated" && (
          <p>
            <strong>This order was paid with PayPal.</strong> Cancelling here doesn&rsquo;t move money — refund ${order.paypal?.usd} from your PayPal account.
          </p>
        )}
        {order.paymentMethod === "Card" && order.isPaid && (
          <p>
            <strong>This order was paid by card.</strong> Cancelling here doesn&rsquo;t move money — refund {rupees(order.totalPrice)} from your Stripe dashboard.
          </p>
        )}
      </ConfirmDialog>
      <Toast {...toast} />
    </AdminPage>
  );
}
