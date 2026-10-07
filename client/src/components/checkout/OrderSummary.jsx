import { sized } from "../../utils/format";

// Amounts arrive already formatted in the order's currency (spec 008): checkout builds
// them from its quote, saved orders from utils/orderMoney `summaryOf`.
// lines: [{ key, image, name, variant, qty, price }]; shipping "" = free.
export default function OrderSummary({ lines, items, shipping, total, currency = "PKR" }) {
  const count = lines.reduce((sum, l) => sum + l.qty, 0);

  return (
    <div className="co-summary">
      <ul className="co-summary__lines">
        {lines.map((l) => (
          <li key={l.key} className="co-line">
            <div className="co-line__thumb">
              {l.image && <img src={sized(l.image, 160)} alt="" loading="lazy" />}
              <span className="co-line__qty" aria-label={`Quantity ${l.qty}`}>
                {l.qty}
              </span>
            </div>
            <div className="co-line__info">
              <p className="co-line__name">{l.name}</p>
              {l.variant && <p className="co-line__variant">{l.variant}</p>}
            </div>
            <span className="co-line__price">{l.price}</span>
          </li>
        ))}
      </ul>

      <dl className="co-totals">
        <div>
          <dt>
            Subtotal · {count} {count === 1 ? "item" : "items"}
          </dt>
          <dd>{items}</dd>
        </div>
        <div>
          <dt>Shipping</dt>
          <dd>{shipping || "FREE"}</dd>
        </div>
        <div className="co-totals__total">
          <dt>Total</dt>
          <dd>
            <small>{currency}</small> {total}
          </dd>
        </div>
      </dl>
    </div>
  );
}
