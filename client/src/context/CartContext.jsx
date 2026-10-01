import { createContext, useContext, useEffect, useState } from "react";
import { fetchProducts } from "../api/products";

const CartContext = createContext(null);

const STORAGE_KEY = "shopnest_cart";
export const MAX_QTY = 10;

const cartKey = (item) => `${item.productId}_${item.size || "none"}`;
const same = (productId, size) => (i) => i.productId === productId && i.size === size;

function loadCart() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return Array.isArray(stored) ? stored : [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }) {
  const [items, setItems] = useState(loadCart);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      /* storage full or blocked — cart still works for this session */
    }
  }, [items]);

  // localStorage can hold stale (or edited) prices. Re-read price and stock
  // from the API once per visit; checkout recomputes totals on the server anyway.
  useEffect(() => {
    const handles = [...new Set(loadCart().map((i) => i.handle))];
    if (!handles.length) return;
    fetchProducts({ handles: handles.join(","), limit: 60 })
      .then(({ products }) => {
        const byHandle = Object.fromEntries(products.map((p) => [p.handle, p]));
        setItems((prev) =>
          prev.map((item) => {
            const p = byHandle[item.handle];
            if (!p) return { ...item, soldOut: true };
            const size = p.sizes?.find((s) => s.size === item.size);
            return { ...item, price: p.price, compareAtPrice: p.compareAtPrice, soldOut: size ? !size.available : false };
          })
        );
      })
      .catch(() => {});
  }, []);

  // `openDrawer: false` for flows that navigate away instead (Buy it now).
  const addItem = (product, size, qty = 1, { openDrawer = true } = {}) => {
    const newItem = {
      productId: product._id,
      title: product.title,
      handle: product.handle,
      color: product.color,
      price: product.price,
      compareAtPrice: product.compareAtPrice,
      image: product.images?.[0],
      size,
      qty,
    };

    setItems((prev) => {
      const existing = prev.find((i) => cartKey(i) === cartKey(newItem));
      if (existing) {
        return prev.map((i) =>
          cartKey(i) === cartKey(newItem) ? { ...i, qty: Math.min(MAX_QTY, i.qty + qty) } : i
        );
      }
      return [...prev, newItem];
    });
    if (openDrawer) setDrawerOpen(true);
  };

  const removeItem = (productId, size) => {
    setItems((prev) => prev.filter((i) => !same(productId, size)(i)));
  };

  // qty 0 removes the line, like Shopify's cart.
  const updateQty = (productId, size, qty) => {
    if (qty <= 0) return removeItem(productId, size);
    setItems((prev) => prev.map((i) => (same(productId, size)(i) ? { ...i, qty: Math.min(MAX_QTY, qty) } : i)));
  };

  const clearCart = () => setItems([]);

  const itemCount = items.reduce((sum, i) => sum + i.qty, 0);
  const subtotal = items.reduce((sum, i) => sum + i.qty * i.price, 0);
  const hasSoldOut = items.some((i) => i.soldOut);

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        updateQty,
        removeItem,
        clearCart,
        itemCount,
        subtotal,
        hasSoldOut,
        drawerOpen,
        openCart: () => setDrawerOpen(true),
        closeCart: () => setDrawerOpen(false),
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);
