import { useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { useCurrency } from "../context/CurrencyContext";
import { errorMessage, fetchCheckoutConfig, placeOrder } from "../api/orders";
import { fetchAccount } from "../api/account";
import { CITIES } from "../data/cities";
import { US_STATES } from "../data/regions";
import CheckoutLayout from "../components/checkout/CheckoutLayout";
import OrderSummary from "../components/checkout/OrderSummary";
import Field from "../components/checkout/Field";
import { MastercardIcon, VisaIcon } from "../components/checkout/PaymentIcons";
import { money } from "../components/checkout/money";
import PayPalButton from "../components/checkout/PayPalButton";
import CountryPicker from "../components/currency/CountryPicker";
import { formatMinor, quote } from "../utils/pricing";
import { ADDRESS_LABELS, validateCheckout } from "../utils/address";

const SAVED_KEY = "shopnest_checkout_info";
// The form as it was when the shopper left for Stripe/PayPal; restored if they cancel
// there (spec 004 AC-3.1). Session-only, so it never outlives the tab.
const DRAFT_KEY = "shopnest_checkout_draft";

const CANCEL_MESSAGES = {
  paypal: "PayPal payment was cancelled. Your cart is still here — try again or choose another payment method.",
  card: "Card payment was cancelled. Your cart is still here — try again or choose another payment method.",
};

// Until /orders/config answers (or if it fails): Pakistan only, today's rupee rules.
const OFFLINE_CONFIG = {
  cardEnabled: false,
  paypal: { enabled: false },
  rates: null,
  countries: [{ code: "PK", name: "Pakistan", currency: "PKR", cod: true }],
  shipping: { PK: { fee: 250, freeMin: 2500 }, INTL: { fee: 4500, freeMin: 30000 } },
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
const ADDRESS_FIELDS = ["firstName", "lastName", "address", "apartment", "city", "state", "postalCode", "phone"];

function loadSaved() {
  try {
    return JSON.parse(localStorage.getItem(SAVED_KEY)) || {};
  } catch {
    return {};
  }
}

export default function Checkout() {
  const { items, clearCart } = useCart();
  const { user } = useAuth();
  const { country: siteCountry, setCountry: setSiteCountry } = useCurrency();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const canceled = params.get("canceled");
  const [config, setConfig] = useState(null);
  const restored = useRef(canceled ? takeDraft() : null);
  const [form, setForm] = useState(() => {
    if (restored.current) return { country: "PK", state: "", ...restored.current };
    const saved = loadSaved();
    // Start on the shopper's Spec 007 country (AC-1.1). Details saved on this device fill in
    // only if they're for that country (older saved details were always Pakistani).
    const country = siteCountry.code;
    const savedFits = (saved.country || "PK") === country;
    return {
      email: user?.email || saved.email || "",
      emailOptIn: true,
      country,
      firstName: "",
      lastName: "",
      address: "",
      apartment: "",
      city: "",
      state: "",
      postalCode: "",
      phone: "",
      ...(savedFits ? Object.fromEntries(ADDRESS_FIELDS.filter((k) => saved[k]).map((k) => [k, saved[k]])) : {}),
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
        setForm((f) => {
          let next = f;
          // A country we can't price right now (no rate) falls back to Pakistan (R-6).
          if (!c.countries.some((x) => x.code === f.country)) next = { ...next, country: "PK", state: "", postalCode: "" };
          // Card is the default — unless the shopper is back from a cancelled payment and already chose.
          if (c.cardEnabled && !restored.current) next = { ...next, paymentMethod: "Card" };
          if (!c.paypal?.enabled && next.paymentMethod === "PayPal") next = { ...next, paymentMethod: c.cardEnabled ? "Card" : "COD" };
          return next;
        });
      })
      .catch(() => setConfig(OFFLINE_CONFIG));
  }, []);

  // Signed-in customers: fill the delivery form from their default saved address — Pakistan
  // only, as the address book is (spec 008 plan §6) — without overwriting typed fields.
  useEffect(() => {
    if (!user) return;
    fetchAccount()
      .then(({ email, addresses }) => {
        const def = addresses?.find((a) => a.isDefault);
        setForm((f) => {
          const next = { ...f, email: f.email || email };
          if (def && f.country === "PK") for (const k of ADDRESS_FIELDS) if (!f[k] && def[k]) next[k] = def[k];
          return next;
        });
      })
      .catch(() => {});
  }, [user]);

  const cfg = config || OFFLINE_CONFIG;
  const countryInfo = cfg.countries.find((c) => c.code === form.country) || cfg.countries[0];

  // What the server will charge, with the server's own rates (spec 008 R-2).
  const q = useMemo(() => {
    const priced = items.map((i) => ({ price: i.price, qty: i.qty }));
    return (
      quote({ items: priced, countryCode: countryInfo.code, method: form.paymentMethod, config: cfg }) ||
      quote({ items: priced, countryCode: "PK", method: "COD", config: OFFLINE_CONFIG })
    );
  }, [items, countryInfo.code, form.paymentMethod, cfg]);

  // Shown in the order's currency: $/£ abroad, rupees in Pakistan (PayPal included — its $ is noted below).
  const foreign = q.currency !== "PKR";
  const show = (minor, rupees) => (foreign ? formatMinor(minor, q.charge.currency) : money(rupees));
  const totalText = show(q.charge.total, q.totalPrice);
  const shippingText = q.shippingPrice ? show(q.charge.shipping, q.shippingPrice) : "";
  const lines = useMemo(
    () =>
      items.map((i, k) => ({
        key: `${i.productId}_${i.size}`,
        image: i.image,
        name: i.title,
        variant: [i.color, i.size].filter(Boolean).join(" / "),
        qty: i.qty,
        price: foreign ? formatMinor(q.unitCharges[k] * i.qty, q.charge.currency) : money(i.price * i.qty),
      })),
    [items, foreign, q]
  );

  if (!items.length && !placed.current) return <Navigate to="/cart" replace />;

  const set = (name, value) => {
    setForm((f) => ({ ...f, [name]: value }));
    if (errors[name]) setErrors((e) => ({ ...e, [name]: undefined }));
  };

  const cardEnabled = Boolean(config?.cardEnabled);
  const paypalEnabled = Boolean(config?.paypal?.enabled);

  // The shipping country sets the currency, here and across the store (AC-1.2).
  // COD is Pakistan only (AC-5.1).
  const changeCountry = (code) => {
    if (code === form.country) return;
    setForm((f) => ({
      ...f,
      country: code,
      state: "",
      postalCode: "",
      paymentMethod: f.paymentMethod === "COD" && code !== "PK" ? (cardEnabled ? "Card" : paypalEnabled ? "PayPal" : "COD") : f.paymentMethod,
    }));
    setErrors((e) => ({ ...e, state: undefined, postalCode: undefined, phone: undefined, city: undefined }));
    setSiteCountry(code);
  };

  const submit = async (e) => {
    e.preventDefault();
    const found = validateCheckout(form);
    setErrors(found);
    const first = Object.keys(found)[0];
    if (first) {
      fieldRefs.current[first]?.focus();
      return;
    }

    setSubmitting(true);
    setFormError("");
    try {
      try {
        if (form.saveInfo) {
          localStorage.setItem(SAVED_KEY, JSON.stringify(Object.fromEntries(["email", "country", ...ADDRESS_FIELDS].map((k) => [k, form[k]]))));
        } else {
          localStorage.removeItem(SAVED_KEY);
        }
      } catch {
        /* storage blocked: the order still goes through, the details just aren't saved */
      }

      const result = await placeOrder({
        email: form.email,
        phone: form.phone,
        emailOptIn: form.emailOptIn,
        paymentMethod: form.paymentMethod,
        country: form.country,
        shippingAddress: Object.fromEntries(ADDRESS_FIELDS.filter((k) => k !== "phone").map((k) => [k, form[k]])),
        items: items.map(({ productId, size, qty }) => ({ productId, size, qty })),
        // What this page showed; the server refuses to charge anything else (R-2).
        expected: { currency: q.charge.currency, total: q.charge.total },
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
      const data = err?.response?.data;
      if (err?.response?.status === 409 && data?.code === "PRICE_CHANGED") {
        // Today's rate moved since the page loaded: show the new total, charge nothing yet.
        const { currency, rate } = data.quote.charge;
        setConfig((c) => ({ ...c, rates: { ...c.rates, [currency]: rate } }));
      } else if (data?.errors) {
        setErrors(data.errors);
        fieldRefs.current[Object.keys(data.errors)[0]]?.focus();
      }
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

  const labels = ADDRESS_LABELS[countryInfo.code];
  const summary = <OrderSummary lines={lines} items={show(q.charge.items, q.itemsPrice)} shipping={shippingText} total={totalText} currency={q.currency} />;

  return (
    <CheckoutLayout summary={summary} total={totalText}>
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
          <div className="co-country">
            <p id="co-country-label" className="co-country__label">
              Country/Region
            </p>
            <CountryPicker
              id="co-country"
              labelledBy="co-country-label"
              value={countryInfo.code}
              onChange={changeCountry}
              codes={cfg.countries.map((c) => c.code)}
            />
          </div>
          <div className="co-row">
            <Field label="First name" autoComplete="given-name" {...fieldProps("firstName")} />
            <Field label="Last name" autoComplete="family-name" {...fieldProps("lastName")} />
          </div>
          <Field label="Address" autoComplete="address-line1" {...fieldProps("address")} />
          <Field label="Apartment, suite, etc. (optional)" autoComplete="address-line2" {...fieldProps("apartment")} />

          {countryInfo.code === "PK" && (
            <>
              <div className="co-row">
                <Field label={labels.city} autoComplete="address-level2" list="co-cities" {...fieldProps("city")} />
                <Field label={labels.postal} autoComplete="postal-code" inputMode="numeric" {...fieldProps("postalCode")} />
              </div>
              <datalist id="co-cities">
                {CITIES.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </>
          )}
          {countryInfo.code === "US" && (
            <div className="co-row co-row--3">
              <Field label={labels.city} autoComplete="address-level2" {...fieldProps("city")} />
              <Field label="State" autoComplete="address-level1" {...fieldProps("state")}>
                <option value="" disabled hidden />
                {US_STATES.map(([code, name]) => (
                  <option key={code} value={code}>
                    {name}
                  </option>
                ))}
              </Field>
              <Field label={labels.postal} autoComplete="postal-code" inputMode="numeric" {...fieldProps("postalCode")} />
            </div>
          )}
          {countryInfo.code === "GB" && (
            <>
              <div className="co-row">
                <Field label={labels.city} autoComplete="address-level2" {...fieldProps("city")} />
                <Field label={labels.postal} autoComplete="postal-code" autoCapitalize="characters" {...fieldProps("postalCode")} />
              </div>
              <Field label="County (optional)" autoComplete="address-level1" {...fieldProps("state")} />
            </>
          )}

          <Field
            label={labels.phone}
            type="tel"
            autoComplete="tel"
            inputMode="tel"
            {...fieldProps("phone")}
          />
          <label className="co-check">
            <input type="checkbox" checked={form.saveInfo} onChange={(e) => set("saveInfo", e.target.checked)} />
            <span className="co-check__box" />
            Save this information for next time
          </label>
        </section>

        <section className="co-section">
          <h3>Shipping method</h3>
          <div className="co-option co-option--static">
            <span>{!q.shippingPrice ? "Free Shipping" : foreign ? "International Shipping" : "Standard Shipping"}</span>
            <strong>{shippingText || "FREE"}</strong>
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
                {/* PayPal has no rupees: Pakistan pays in dollars (spec 004); US/UK in their own currency. */}
                You&apos;ll pay <strong>{formatMinor(q.charge.total, q.charge.currency)}</strong>
                {foreign ? "" : ` (${money(q.totalPrice)})`} with PayPal. After clicking the PayPal button, you&apos;ll be taken to
                PayPal to complete your purchase.
              </div>
            )}

            {countryInfo.cod && (
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
            )}
            {countryInfo.cod && form.paymentMethod === "COD" && (
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
