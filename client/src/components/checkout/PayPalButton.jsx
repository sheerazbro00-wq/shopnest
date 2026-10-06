// Checkout's submit button when PayPal is selected (spec 004 AC-1.2): PayPal's gold
// with the wordmark set in text, in PayPal's two blues.
export default function PayPalButton({ submitting, disabled }) {
  return (
    <button type="submit" className="co-submit co-paypal-btn" disabled={disabled} aria-label="Pay with PayPal">
      {submitting ? (
        <span className="co-spinner co-spinner--dark" aria-label="Processing" />
      ) : (
        <span className="co-paypal-btn__mark" aria-hidden="true">
          <span className="co-paypal-btn__pay">Pay</span>
          <span className="co-paypal-btn__pal">Pal</span>
        </span>
      )}
    </button>
  );
}
