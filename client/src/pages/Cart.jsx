import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { useMoney } from "../context/CurrencyContext";
import CartLineItem from "../components/cart/CartLineItem";
import RecentlyViewed from "../components/product/RecentlyViewed";
import "./Cart.css";

export default function Cart() {
  const { items, subtotal, hasSoldOut } = useCart();
  const money = useMoney();
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "Your Shopping Cart – ShopNest";
  }, []);

  return (
    <>
      <div className={`page-width cart-page${items.length ? "" : " cart-page--empty"}`}>
        <header className="cart-page__header">
          <h1 className="cart-page__title">Cart</h1>
          {!items.length && <p>Your cart is currently empty.</p>}
          <Link to="/collections/man" className="text-link">
            Continue shopping
          </Link>
        </header>

        {items.length > 0 && (
          <div className="cart__page">
            <div className="cart__page-col">
              {items.map((item) => (
                <CartLineItem key={`${item.productId}_${item.size}`} item={item} layout="page" />
              ))}
            </div>

            <div className="cart__page-col cart__summary">
              <div className="cart__summary-row">
                <span>Subtotal</span>
                <span>{money(subtotal)}</span>
              </div>
              <button type="button" className="btn cart__checkout" disabled={hasSoldOut} onClick={() => navigate("/checkout")}>
                Check out
              </button>
              {hasSoldOut && <p className="cart__summary-warning">Remove sold-out items to continue.</p>}
              <p className="cart__note">Shipping, taxes, and discount codes calculated at checkout.</p>
            </div>
          </div>
        )}
      </div>

      <RecentlyViewed className="cart-recent" />
    </>
  );
}
