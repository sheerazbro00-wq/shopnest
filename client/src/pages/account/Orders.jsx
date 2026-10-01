import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchMyOrders } from "../../api/account";
import { errorMessage } from "../../api/orders";
import AccountLayout from "../../components/account/AccountLayout";
import { orderStatus, shortDate } from "../../components/account/orderStatus";
import { money } from "../../components/checkout/money";
import { sized } from "../../utils/format";

const MAX_THUMBS = 4;

function OrderCard({ order }) {
  const status = orderStatus(order);
  const count = order.orderItems.reduce((sum, i) => sum + i.qty, 0);
  const thumbs = order.orderItems.slice(0, MAX_THUMBS);
  const extra = order.orderItems.length - MAX_THUMBS;

  return (
    <Link to={`/account/orders/${order._id}`} className="acc-card acc-order">
      <div className="acc-order__top">
        <span className={`acc-status acc-status--${status.tone}`}>{status.label}</span>
        <span className="co-muted">{shortDate(order.createdAt)}</span>
      </div>
      <div className={`acc-order__thumbs acc-order__thumbs--${Math.min(thumbs.length, 4)}`}>
        {thumbs.map((item, i) => (
          <div key={`${item.product}_${item.size}_${i}`} className="acc-order__thumb">
            {item.image && <img src={sized(item.image, 240)} alt="" loading="lazy" />}
            {i === MAX_THUMBS - 1 && extra > 0 && <span className="acc-order__more">+{extra + 1}</span>}
          </div>
        ))}
      </div>
      <div className="acc-order__meta">
        <p className="co-muted">
          {count} {count === 1 ? "item" : "items"}
        </p>
        <p className="acc-order__number">Order #{order.orderNumber}</p>
        <p className="acc-order__total">{money(order.totalPrice)}</p>
      </div>
    </Link>
  );
}

export default function Orders() {
  const [orders, setOrders] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchMyOrders()
      .then(setOrders)
      .catch((err) => setError(errorMessage(err, "Couldn't load your orders.")));
  }, []);

  return (
    <AccountLayout title="Orders">
      <h1 className="acc-title">Orders</h1>

      {error && <div className="co-banner">{error}</div>}

      {!orders && !error && (
        <div className="acc-grid" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <div key={i} className="acc-card acc-skeleton" />
          ))}
        </div>
      )}

      {orders?.length === 0 && (
        <div className="acc-card acc-empty">
          <h2>No orders yet</h2>
          <p className="co-muted">Go to the store to place an order.</p>
          <Link to="/collections/man" className="co-submit co-submit--inline">
            Continue shopping
          </Link>
        </div>
      )}

      {orders?.length > 0 && (
        <div className="acc-grid">
          {orders.map((o) => (
            <OrderCard key={o._id} order={o} />
          ))}
        </div>
      )}
    </AccountLayout>
  );
}
