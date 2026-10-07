import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { errorMessage, fetchOrder, simulatePayPal } from "../api/orders";
import { money } from "../components/checkout/money";
import { formatMinor } from "../utils/pricing";
import "../components/checkout/Checkout.css";

// Stand-in for PayPal's approval page in simulated mode (spec 004 §4). Plainly marked as
// a test and free of PayPal's logo, so it can't pass for PayPal itself (R-5).
export default function PayPalTest() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const token = params.get("t") || "";
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState("");
  const [paying, setPaying] = useState(false);

  const thankYou = `/checkout/thank-you/${id}?token=${token}`;

  useEffect(() => {
    document.title = "Test payment – ShopNest";
    fetchOrder(id, token)
      .then((o) => {
        if (o.paymentMethod !== "PayPal" || o.paypal?.mode !== "simulated") throw new Error();
        if (o.isPaid) return navigate(thankYou, { replace: true });
        setOrder(o);
      })
      .catch(() => setError("This test payment link isn't valid."));
  }, [id, token]);

  const pay = async () => {
    setPaying(true);
    setError("");
    try {
      await simulatePayPal(id, token);
      navigate(thankYou, { replace: true });
    } catch (err) {
      setError(errorMessage(err, "The test payment didn't go through. Please try again."));
      setPaying(false);
    }
  };

  const cancel = () => navigate("/checkout?canceled=paypal", { replace: true });

  return (
    <div className="ppt">
      <div className="ppt__bar" role="note">
        TEST MODE — no real money. This page stands in for PayPal.
      </div>
      <main className="ppt__card">
        {!order && !error && <p className="co-muted">Loading…</p>}
        {error && <p className="ppt__error" role="alert">{error}</p>}
        {order && (
          <>
            <p className="ppt__eyebrow">Test payment</p>
            <h1 className="ppt__title">Pay ShopNest</h1>
            {/* The exact amount PayPal would take: order.charge (spec 008), or spec 004's USD figure. */}
            <p className="ppt__amount">{order.charge ? formatMinor(order.charge.total, order.charge.currency) : `$${order.paypal.usd}`}</p>
            <p className="ppt__rupees">
              {money(order.totalPrice)} at Rs {order.charge?.rate ?? order.paypal.rate} per{" "}
              {{ USD: "US dollar", GBP: "British pound" }[order.charge?.currency || "USD"]}
            </p>
            <dl className="ppt__rows">
              <div>
                <dt>Order</dt>
                <dd>#{order.orderNumber}</dd>
              </div>
              <div>
                <dt>Email</dt>
                <dd>{order.email}</dd>
              </div>
            </dl>
            <button type="button" className="co-submit ppt__pay" onClick={pay} disabled={paying}>
              {paying ? <span className="co-spinner" aria-label="Processing" /> : "Pay now"}
            </button>
            <button type="button" className="ppt__cancel" onClick={cancel} disabled={paying}>
              Cancel and return to ShopNest
            </button>
            <p className="ppt__note">
              With real PayPal keys, this step happens on PayPal&apos;s own site.
            </p>
          </>
        )}
        {error && !order && (
          <button type="button" className="ppt__cancel" onClick={cancel}>
            Return to checkout
          </button>
        )}
      </main>
    </div>
  );
}
