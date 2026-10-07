import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { errorMessage, fetchOrder } from "../api/orders";
import { useCart } from "../context/CartContext";
import CheckoutLayout from "../components/checkout/CheckoutLayout";
import OrderSummary from "../components/checkout/OrderSummary";
import { isOnline } from "../utils/payment";
import { orderAmounts, paidAmount, summaryOf } from "../utils/orderMoney";

export default function ThankYou() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const token = params.get("token");
  const { clearCart } = useCart();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    document.title = "Thank you – ShopNest";
    fetchOrder(id, token)
      .then(setOrder)
      .catch((err) => setError(errorMessage(err, "Order not found")));
  }, [id, token]);

  // Card and PayPal orders keep the cart until the payment is confirmed.
  useEffect(() => {
    if (order && (order.isPaid || order.paymentMethod === "COD")) clearCart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order]);

  if (error) {
    return (
      <CheckoutLayout summary={null} total="">
        <div className="co-thanks__missing">
          <h2>{error}</h2>
          <Link to="/" className="co-submit co-submit--inline">
            Continue shopping
          </Link>
        </div>
      </CheckoutLayout>
    );
  }

  if (!order) {
    return (
      <CheckoutLayout summary={null} total="">
        <p className="co-muted co-thanks__loading">Loading your order…</p>
      </CheckoutLayout>
    );
  }

  const a = order.shippingAddress;
  const unpaidOnline = isOnline(order) && !order.isPaid;
  const viaPayPal = order.paymentMethod === "PayPal";
  // Amounts in the order's own currency: $/£ for US/UK orders (spec 008 AC-3.2).
  const view = summaryOf(order);
  const summary = <OrderSummary {...view} />;

  return (
    <CheckoutLayout summary={summary} total={view.total}>
      <div className="co-thanks">
        <div className="co-thanks__head">
          <svg className="co-thanks__check" viewBox="0 0 50 50" aria-hidden="true">
            <circle cx="25" cy="25" r="23" />
            <path d="m15 25.5 7 7 13-14" />
          </svg>
          <div>
            <p className="co-muted">Confirmation #{order.orderNumber}</p>
            <h2>Thank you, {a.firstName}!</h2>
          </div>
        </div>

        <div className="co-box">
          {unpaidOnline ? (
            <>
              <h3>Payment not completed</h3>
              <p>
                We haven&apos;t received your {viaPayPal ? "PayPal" : "card"} payment yet. Your cart is still saved —{" "}
                <Link to="/checkout" className="co-link">
                  return to checkout
                </Link>{" "}
                to try again.
              </p>
            </>
          ) : (
            <>
              <h3>Your order is confirmed</h3>
              <p>
                {order.paymentMethod === "COD"
                  ? `We've received your order. Please keep ${orderAmounts(order).total} ready in cash for the rider.`
                  : "We've received your payment and your order is being prepared."}
              </p>
            </>
          )}
        </div>

        <div className="co-box">
          <h3>Order details</h3>
          <div className="co-details">
            <div>
              <h4>Contact information</h4>
              <p>{order.email}</p>
            </div>
            <div>
              <h4>Payment method</h4>
              <p>
                {order.paymentMethod === "COD"
                  ? "Cash on Delivery (COD)"
                  : viaPayPal
                    ? order.isPaid
                      ? "Paid with PayPal"
                      : "PayPal (unpaid)"
                    : order.isPaid
                      ? "Paid by card"
                      : "Card (unpaid)"}
                {" · "}
                {paidAmount(order)}
              </p>
            </div>
            <div>
              <h4>Shipping address</h4>
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
                {[a.city, a.state, a.postalCode].filter(Boolean).join(" ")}
                <br />
                {a.country}
                <br />
                {order.phone}
              </p>
            </div>
            <div>
              <h4>Shipping method</h4>
              <p>{!order.shippingPrice ? "Free Shipping" : view.currency === "PKR" ? "Standard Shipping" : "International Shipping"}</p>
            </div>
          </div>
        </div>

        <div className="co-thanks__foot">
          <p>
            Need help?{" "}
            <Link to="/pages/contact" className="co-link">
              Contact us
            </Link>
          </p>
          <Link to="/" className="co-submit co-submit--inline">
            Continue shopping
          </Link>
        </div>
      </div>
    </CheckoutLayout>
  );
}
