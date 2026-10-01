import { useEffect, useState } from "react";
import { fetchProducts } from "../../api/products";
import { getRecentlyViewed } from "../../utils/recentlyViewed";
import ProductRow from "./ProductRow";

const COUNT = 5;

export default function RecentlyViewed({ className = "" }) {
  const [products, setProducts] = useState(() => (getRecentlyViewed().length ? null : []));

  useEffect(() => {
    const handles = getRecentlyViewed().slice(0, COUNT);
    if (!handles.length) return;
    let cancelled = false;
    fetchProducts({ handles: handles.join(","), limit: COUNT })
      .then(({ products: found }) => {
        if (cancelled) return;
        // API order is arbitrary; restore most-recent-first
        const byHandle = Object.fromEntries(found.map((p) => [p.handle, p]));
        setProducts(handles.map((h) => byHandle[h]).filter(Boolean));
      })
      .catch(() => !cancelled && setProducts([]));
    return () => {
      cancelled = true;
    };
  }, []);

  return <ProductRow title="Recently viewed" products={products} count={COUNT} className={className} />;
}
