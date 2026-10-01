import { useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useCart } from "../../context/CartContext";
import { formatPrice } from "../../utils/format";
import { CloseIcon } from "../Icons";
import CartLineItem from "./CartLineItem";
import "./CartDrawer.css";

export default function CartDrawer() {
  const { items, subtotal, hasSoldOut, drawerOpen, closeCart } = useCart();
  const closeRef = useRef(null);
  const navigate = useNavigate();
  const { pathname } = useLocation();

  // close whenever the route changes (e.g. a product link inside the drawer)
  useEffect(() => {
    closeCart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  useEffect(() => {
    if (!drawerOpen) return;
    closeRef.current?.focus();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e) => e.key === "Escape" && closeCart();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drawerOpen]);

  return (
    <div className={`cart-drawer-wrap${drawerOpen ? " is-open" : ""}`} aria-hidden={!drawerOpen} inert={!drawerOpen}>
      <div className="cart-drawer-overlay" onClick={closeCart} />
      <aside className="cart-drawer" role="dialog" aria-modal="true" aria-label="Cart">
        <div className="cart-drawer__header">
          <h2 className="cart-drawer__title">Cart</h2>
          <button type="button" className="cart-drawer__close" ref={closeRef} aria-label="Close cart" onClick={closeCart}>
            <CloseIcon />
          </button>
        </div>

        {items.length === 0 ? (
          <div className="cart-drawer__empty">Your cart is currently empty.</div>
        ) : (
          <>
            <div className="cart-drawer__items">
              {items.map((item) => (
                <CartLineItem key={`${item.productId}_${item.size}`} item={item} />
              ))}
            </div>

            <div className="cart-drawer__footer">
              <div className="cart-drawer__subtotal">
                <span className="cart-drawer__subtotal-label">Subtotal</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
              <p className="cart__note">Shipping, taxes, and discount codes calculated at checkout.</p>
              <button
                type="button"
                className="btn cart__checkout"
                disabled={hasSoldOut}
                onClick={() => navigate("/checkout")}
              >
                Check out
              </button>
              <Link to="/cart" className="cart-drawer__view-cart">
                View cart
              </Link>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
