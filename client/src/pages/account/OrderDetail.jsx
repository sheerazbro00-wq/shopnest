import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { fetchMyOrder } from "../../api/account";
import { errorMessage } from "../../api/orders";
import { fetchProducts } from "../../api/products";
import { useCart } from "../../context/CartContext";
import AccountLayout from "../../components/account/AccountLayout";
import { orderStatus, shortDate } from "../../components/account/orderStatus";
import OrderSummary from "../../components/checkout/OrderSummary";
import { money } from "../../components/checkout/money";

const STEPS = ["Confirmed", "On its way", "Delivered"];

export default function OrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addItem } = useCart();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState("");
  const [rebuying, setRebuying] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    fetchMyOrder(id)
      .then(setOrder)
      .catch((err) => setError(errorMessage(err, "Order not found")));
  }, [id]);

  // "Buy again": re-read current products so price and stock are live, not from the old order.
  const buyAgain = async () => {
    setRebuying(true);
    setNotice("");
    try {
      const handles = [...new Set(order.orderItems.map((i) => i.handle).filter(Boolean))];
      const { products } = await fetchProducts({ handles: handles.join(","), limit: 60 });
      const byHandle = Object.fromEntries(products.map((p) => [p.handle, p]));
      let added = 0;
      for (const item of order.orderItems) {
        const p = byHandle[item.handle];
        if (p?.sizes?.some((s) => s.size === item.size && s.available)) {
          addItem(p, item.size, item.qty, { openDrawer: false });
          added++;
        }
      }
      if (added) navigate("/cart");
      else setNotice("These items are no longer available.");
    } catch {
      setNotice("Couldn't add items right now. Please try again.");
    }
    setRebuying(false);
  };

  if (error) {
    return (
      <AccountLayout title="Order">
        <Link to="/account" className="acc-back">
          ← Orders
        </Link>
        <div className="acc-card acc-empty">
          <h2>{error}</h2>
        </div>
      </AccountLayout>
    );
  }

  if (!order) {
    return (
      <AccountLayout title="Order">
        <div className="acc-card acc-skeleton acc-skeleton--tall" aria-busy="true" />
      </AccountLayout>
    );
  }

  const status = orderStatus(order);
  const a = order.shippingAddress;
  const lines = order.orderItems.map((i, n) => ({
    key: `${i.product}_${i.size}_${n}`,
    image: i.image,
    name: i.name,
    variant: [i.color, i.size].filter(Boolean).join(" / "),
    qty: i.qty,
    lineTotal: i.price * i.qty,
  }));

  return (
    <AccountLayout title={`Order #${order.orderNumber}`}>
      <Link to="/account" className="acc-back">
        ← Orders
      </Link>

      <div className="acc-detail__head">
        <div>
          <h1 className="acc-title">Order #{order.orderNumber}</h1>
          <p className="co-muted">Placed on {shortDate(order.createdAt)}</p>
        </div>
        <button type="button" className="co-submit co-submit--inline" onClick={buyAgain} disabled={rebuying}>
          {rebuying ? <span className="co-spinner" aria-label="Adding" /> : "Buy again"}
        </button>
      </div>
      {notice && <div className="co-banner">{notice}</div>}

      <div className="acc-detail">
        <div className="acc-detail__main">
          <section className="acc-card">
            <span className={`acc-status acc-status--${status.tone}`}>{status.label}</span>
            {status.step >= 0 && (
              <ol className="acc-steps" aria-label="Order progress">
                {STEPS.map((label, i) => (
                  <li key={label} className={i <= status.step ? "is-done" : ""} aria-current={i === status.step ? "step" : undefined}>
                    <span className="acc-steps__dot" />
                    {label}
                  </li>
                ))}
              </ol>
            )}
            {order.status === "Cancelled" && <p className="co-muted">This order was cancelled.</p>}
          </section>

          <section className="acc-card">
            <h2 className="acc-card__title">Items</h2>
            <OrderSummary lines={lines} itemsPrice={order.itemsPrice} shippingPrice={order.shippingPrice} total={order.totalPrice} />
          </section>
        </div>

        <aside className="acc-detail__side">
          <section className="acc-card acc-info">
            <h3>Contact information</h3>
            <p>{order.email}</p>
            <p>{order.phone}</p>
          </section>
          <section className="acc-card acc-info">
            <h3>Shipping address</h3>
            <p>
              {a.firstName} {a.lastName}
              <br />
              {a.address}
              {a.apartment && (
                <>
                  <br />
                  {a.apartment}
                </>
              )}
              <br />
              {a.city} {a.postalCode}
              <br />
              {a.country}
            </p>
          </section>
          <section className="acc-card acc-info">
            <h3>Payment</h3>
            <p>
              {order.paymentMethod === "COD" ? "Cash on Delivery (COD)" : "Card"}
              {" · "}
              {order.isPaid ? "Paid" : order.paymentMethod === "COD" ? "Pay on delivery" : "Pending"}
            </p>
            <p className="co-muted">{money(order.totalPrice)}</p>
          </section>
          <section className="acc-card acc-info">
            <h3>Shipping method</h3>
            <p>{order.shippingPrice ? "Standard Shipping" : "Free Shipping"}</p>
          </section>
        </aside>
      </div>
    </AccountLayout>
  );
}
