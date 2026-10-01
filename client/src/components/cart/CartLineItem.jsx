import { Link } from "react-router-dom";
import { MAX_QTY, useCart } from "../../context/CartContext";
import { formatPrice, sized } from "../../utils/format";
import QtySelector from "../common/QtySelector";
import "./CartLineItem.css";

// One cart line. `layout="page"` adds the Remove link and a wider image
// column; the drawer version removes a line by stepping quantity to 0.
export default function CartLineItem({ item, layout = "drawer", onNavigate }) {
  const { updateQty, removeItem } = useCart();
  const url = `/products/${item.handle}`;
  const lineTotal = item.price * item.qty;

  return (
    <div className={`cart__item cart__item--${layout}`}>
      <Link to={url} className="cart__image" onClick={onNavigate} tabIndex={-1} aria-hidden="true">
        {item.image && <img src={sized(item.image, 360)} alt="" loading="lazy" />}
      </Link>

      <div className="cart__item-details">
        <div className="cart__item-title">
          <Link to={url} className="cart__item-name" onClick={onNavigate}>
            {item.title}
          </Link>
          <div className="cart__item--variants">
            {item.color && (
              <div>
                <span>Color:</span> {item.color}
              </div>
            )}
            {item.size && (
              <div>
                <span>Size:</span> {item.size}
              </div>
            )}
          </div>
          {item.soldOut && <p className="cart__item-warning">Sold out — please remove this item</p>}
        </div>

        <div className="cart__item-sub">
          <div>
            <QtySelector
              value={item.qty}
              min={0}
              max={MAX_QTY}
              label={`Quantity for ${item.title}`}
              onChange={(qty) => updateQty(item.productId, item.size, qty)}
            />
            {layout === "page" && (
              <button type="button" className="cart__remove" onClick={() => removeItem(item.productId, item.size)}>
                Remove
              </button>
            )}
          </div>
          <div className="cart__item-price-col">
            <span className="cart__price">{formatPrice(lineTotal)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
