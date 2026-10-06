import { useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { errorMessage, fetchCheckoutConfig, placeOrder } from "../api/orders";
import { fetchAccount } from "../api/account";
import { CITIES } from "../data/cities";
import CheckoutLayout from "../components/checkout/CheckoutLayout";
import OrderSummary from "../components/checkout/OrderSummary";
import Field from "../components/checkout/Field";
import { MastercardIcon, VisaIcon } from "../components/checkout/PaymentIcons";
import { money } from "../components/checkout/money";
import PayPalButton from "../components/checkout/PayPalButton";
import { toUsd } from "../utils/payment";

const SAVED_KEY = "shopnest_checkout_info";
// The form as it was when the shopper left for Stripe/PayPal; restored if they cancel
// there (spec 004 AC-3.1). Session-only, so it never outlives the tab.
const DRAFT_KEY = "shopnest_checkout_draft";

const CANCEL_MESSAGES = {
  paypal: "PayPal payment was cancelled. Your cart is still here — try again or choose another payment method.",
  card: "Card payment was cancelled. Your cart is still here — try again or choose Cash on Delivery.",
};

function takeDraft() {
  try {
    const draft = JSON.parse(sessionStorage.getItem(DRAFT_KEY));
    sessionStorage.removeItem(DRAFT_KEY);
    return draft || null;
  } catch {
    return null;
  }
}
const ADDRESS_FIELDS = ["firstName", "lastName", "address", "apartment", "city", "postalCode", "phone"];

function loadSaved() {
  try {
    return JSON.parse(localStorage.getItem(SAVED_KEY)) || {};
  } catch {
    return {};
  }
}

// Same rules as the server (which re-validates everything).
function validate(f) {
  const errors = {};
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) errors.email = f.email ? "Enter a valid email" : "Enter an email";
  if (!f.firstName.trim()) errors.firstName = "Enter a first name";
  if (!f.lastName.trim()) errors.lastName = "Enter a last name";
  if (!f.address.trim()) errors.address = "Enter an address";
  if (!f.city.trim()) errors.city = "Enter a city";
  if (!/^(\+92|0)?3\d{9}$/.test(f.phone.replace(/[\s-]/g, "")))
    errors.phone = f.phone ? "Enter a valid mobile number, e.g. 03001234567" : "Enter a phone number";
  return errors;
}

export default function Checkout() {
  const { items, subtotal, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const canceled = params.get("canceled");
  const [config, setConfig] = useState(null);
  const restored = useRef(canceled ? takeDraft() : null);
  const [form, setForm] = useState(() => {
    if (restored.current) return restored.current;
    const saved = loadSaved();
    return {
      email: user?.email || saved.email || "",
      emailOptIn: true,
      firstName: "",
      lastName: "",
      address: "",
      apartment: "",
      city: "",
      postalCode: "",
      phone: "",
      ...Object.fromEntries(ADDRESS_FIELDS.filter((k) => saved[k]).map((k) => [k, saved[k]])),
      saveInfo: Boolean(saved.firstName),
      paymentMethod: "COD",
    };
  });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(canceled ? CANCEL_MESSAGES[canceled] || CANCEL_MESSAGES.card : "");
  const [submitting, setSubmitting] = useState(false);
  const placed = useRef(false);
  const fieldRefs = useRef({});

  useEffect(() => {
    document.title = "Checkout – ShopNest";
    fetchCheckoutConfig()
      .then((c) => {
        setConfig(c);
        // Card is the default — unless the shopper is back from a cancelled payment
        // and already chose a method.
        if (c.cardEnabled && !restored.current) setForm((f) => ({ ...f, paymentMethod: "Card" }));
        if (!c.paypal?.enabled) setForm((f) => (f.paymentMethod === "PayPal" ? { ...f, paymentMethod: c.cardEnabled ? "Card" : "COD" } : f));
      })
      .catch(() => setConfig({ cardEnabled: false, paypal: { enabled: false }, freeShippingMin: 2500, shippingFee: 250 }));
  }, []);

  // Signed-in customers: fill the delivery form from their default saved address
  // (only fields the customer hasn't typed or restored yet).
  useEffect(() => {
    if (!user) return;
    fetchAccount()
      .then(({ email, addresses }) => {
        const def = addresses?.find((a) => a.isDefault);
        setForm((f) => {
          const next = { ...f, email: f.email || email };
          if (def) for (const k of ADDRESS_FIELDS) if (!f[k] && def[k]) next[k] = def[k];
          return next;
        });
      })
      .catch(() => {});
  }, [user]);

  // Display-only totals; the server recomputes the real amount from the database.
  const shippingPrice = config && subtotal < config.freeShippingMin ? config.shippingFee : 0;
  const total = subtotal + shippingPrice;
  const lines = useMemo(
    () =>
      items.map((i) => ({
        key: `${i.productId}_${i.size}`,
        image: i.image,
        name: i.title,
        variant: [i.color, i.size].filter(Boolean).join(" / "),
        qty: i.qty,
        lineTotal: i.price * i.qty,
      })),
    [items]
  );

  if (!items.length && !placed.current) return <Navigate to="/cart" replace />;

  const set = (name, value) => {
    setForm((f) => ({ ...f, [name]: value }));
    if (errors[name]) setErrors((e) => ({ ...e, [name]: undefined }));
  };

  const submit = async (e) => {
    e.preventDefault();
    const found = validate(form);
    setErrors(found);
    const first = Object.keys(found)[0];
    if (first) {
      fieldRefs.current[first]?.focus();
      return;
    }

    setSubmitting(true);
    setFormError("");
    try {
      if (form.saveInfo) {
        localStorage.setItem(
          SAVED_KEY,
          JSON.stringify(Object.fromEntries(["email", ...ADDRESS_FIELDS].map((k) => [k, form[k]])))
        );
      } else {
        localStorage.removeItem(SAVED_KEY);
      }

      const result = await placeOrder({
        email: form.email,
        phone: form.phone,
        emailOptIn: form.emailOptIn,
        paymentMethod: form.paymentMethod,
        shippingAddress: Object.fromEntries(ADDRESS_FIELDS.filter((k) => k !== "phone").map((k) => [k, form[k]])),
        items: items.map(({ productId, size, qty }) => ({ productId, size, qty })),
      });

      if (result.url) {
        // Card / PayPal: the cart is cleared on the thank-you page once payment is confirmed.
        try {
          sessionStorage.setItem(DRAFT_KEY, JSON.stringify(form));
        } catch {
          /* private mode: a cancel just shows an empty form */
        }
        window.location.assign(result.url);
        return;
      }
      placed.current = true;
      clearCart();
      navigate(`/checkout/thank-you/${result.orderId}?token=${result.token}`, { replace: true });
    } catch (err) {
      setFormError(errorMessage(err));
      window.scrollTo({ top: 0, behavior: "smooth" });
      setSubmitting(false);
    }
  };

  const fieldProps = (name) => ({
    name,
    value: form[name],
    onChange: set,
    error: errors[name],
    ref: (el) => (fieldRefs.current[name] = el),
  });

  const summary = <OrderSummary lines={lines} itemsPrice={subtotal} shippingPrice={shippingPrice} total={total} />;
  const cardEnabled = Boolean(config?.cardEnabled);
  const paypalEnabled = Boolean(config?.paypal?.enabled);

  return (
    <CheckoutLayout summary={summary} total={total}>
      <form className="co-form" onSubmit={submit} noValidate>
        {formError && (
          <div className="co-banner" role="alert">
            {formError}
          </div>
        )}

        <section className="co-section">
          <div className="co-section__head">
            <h2>Contact</h2>
            {!user && (
              <Link to="/account/login" state={{ from: "/checkout" }} className="co-link">
                Sign in
              </Link>
            )}
          </div>
          <Field label="Email" type="email" autoComplete="email" inputMode="email" {...fieldProps("email")} />
          <label className="co-check">
            <input type="checkbox" checked={form.emailOptIn} onChange={(e) => set("emailOptIn", e.target.checked)} />
            <span className="co-check__box" />
            Email me with news and offers
          </label>
        </section>

        <section className="co-section">
          <h2>Delivery</h2>
          <Field label="Country/Region" name="country" value="Pakistan" onChange={() => {}} autoComplete="country-name">
            <option value="Pakistan">Pakistan</option>
          </Field>
          <div className="co-row">
            <Field label="First name" autoComplete="given-name" {...fieldProps("firstName")} />
            <Field label="Last name" autoComplete="family-name" {...fieldProps("lastName")} />
          </div>
          <Field label="Address" autoComplete="address-line1" {...fieldProps("address")} />
          <Field label="Apartment, suite, etc. (optional)" autoComplete="address-line2" {...fieldProps("apartment")} />
          <div className="co-row">
            <Field label="City" autoComplete="address-level2" list="co-cities" {...fieldProps("city")} />
            <Field label="Postal code (optional)" autoComplete="postal-code" inputMode="numeric" {...fieldProps("postalCode")} />
          </div>
          <datalist id="co-cities">
            {CITIES.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
          <Field label="Phone" type="tel" autoComplete="tel" inputMode="tel" {...fieldProps("phone")} />
          <label className="co-check">
            <input type="checkbox" checked={form.saveInfo} onChange={(e) => set("saveInfo", e.target.checked)} />
            <span className="co-check__box" />
            Save this information for next time
          </label>
        </section>

        <section className="co-section">
          <h3>Shipping method</h3>
          <div className="co-option co-option--static">
            <span>{shippingPrice ? "Standard Shipping" : "Free Shipping"}</span>
            <strong>{shippingPrice ? money(shippingPrice) : "FREE"}</strong>
          </div>
        </section>

        <section className="co-section">
          <h2>Payment</h2>
          <p className="co-muted">All transactions are secure and encrypted.</p>
          <div className="co-options" role="radiogroup" aria-label="Payment method">
            <label className={`co-option${form.paymentMethod === "Card" ? " is-selected" : ""}${cardEnabled ? "" : " is-disabled"}`}>
              <input
                type="radio"
                name="paymentMethod"
                value="Card"
                checked={form.paymentMethod === "Card"}
                disabled={!cardEnabled}
                onChange={() => set("paymentMethod", "Card")}
              />
              <span className="co-radio" />
              <span className="co-option__label">Debit - Credit Card</span>
              <span className="co-option__icons">
                <VisaIcon />
                <MastercardIcon />
              </span>
            </label>
            {form.paymentMethod === "Card" && (
              <div className="co-option__panel">
                You&apos;ll be redirected to our secure payment partner (Stripe) to complete your purchase.
              </div>
            )}
            {!cardEnabled && config && (
              <div className="co-option__panel co-option__panel--muted">Card payments are currently unavailable.</div>
            )}

            {paypalEnabled && (
              <label className={`co-option${form.paymentMethod === "PayPal" ? " is-selected" : ""}`}>
                <input
                  type="radio"
                  name="paymentMethod"
                  value="PayPal"
                  checked={form.paymentMethod === "PayPal"}
                  onChange={() => set("paymentMethod", "PayPal")}
                />
                <span className="co-radio" />
                <span className="co-option__label">PayPal</span>
                <span className="co-option__icons">
                  <span className="co-paypal-mark" aria-hidden="true">
                    <span className="co-paypal-btn__pay">Pay</span>
                    <span className="co-paypal-btn__pal">Pal</span>
                  </span>
                </span>
              </label>
            )}
            {paypalEnabled && form.paymentMethod === "PayPal" && (
              <div className="co-option__panel">
                You&apos;ll pay <strong>${toUsd(total, config.paypal.rate)}</strong> ({money(total)}) with PayPal. After clicking
                the PayPal button, you&apos;ll be taken to PayPal to complete your purchase.
              </div>
            )}

            <label className={`co-option${form.paymentMethod === "COD" ? " is-selected" : ""}`}>
              <input
                type="radio"
                name="paymentMethod"
                value="COD"
                checked={form.paymentMethod === "COD"}
                onChange={() => set("paymentMethod", "COD")}
              />
              <span className="co-radio" />
              <span className="co-option__label">Cash on Delivery (COD)</span>
            </label>
            {form.paymentMethod === "COD" && (
              <div className="co-option__panel">Pay with cash when your order is delivered.</div>
            )}
          </div>
        </section>

        <section className="co-section co-mobile-summary">
          <h2>Order summary</h2>
          {summary}
        </section>

        {form.paymentMethod === "PayPal" && paypalEnabled ? (
          <PayPalButton submitting={submitting} disabled={submitting || !config} />
        ) : (
          <button type="submit" className="co-submit" disabled={submitting || !config}>
            {submitting ? <span className="co-spinner" aria-label="Processing" /> : form.paymentMethod === "Card" ? "Pay now" : "Complete order"}
          </button>
        )}
      </form>
    </CheckoutLayout>
  );
}
