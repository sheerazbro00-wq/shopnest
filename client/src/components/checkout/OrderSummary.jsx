import { sized } from "../../utils/format";
import { money } from "./money";

// lines: [{ key, image, name, variant, qty, lineTotal }]
export default function OrderSummary({ lines, itemsPrice, shippingPrice, total }) {
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
            <span className="co-line__price">{money(l.lineTotal)}</span>
          </li>
        ))}
      </ul>

      <dl className="co-totals">
        <div>
          <dt>
            Subtotal · {count} {count === 1 ? "item" : "items"}
          </dt>
          <dd>{money(itemsPrice)}</dd>
        </div>
        <div>
          <dt>Shipping</dt>
          <dd>{shippingPrice === 0 ? "FREE" : money(shippingPrice)}</dd>
        </div>
        <div className="co-totals__total">
          <dt>Total</dt>
          <dd>
            <small>PKR</small> {money(total)}
          </dd>
        </div>
      </dl>
    </div>
  );
}
