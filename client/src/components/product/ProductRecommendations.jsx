import { useEffect, useState } from "react";
import { fetchRecommendations } from "../../api/products";
import ProductRow from "./ProductRow";

export default function ProductRecommendations({ handle }) {
  const [products, setProducts] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setProducts(null);
    fetchRecommendations(handle)
      .then((data) => !cancelled && setProducts(data))
      .catch(() => !cancelled && setProducts([]));
    return () => {
      cancelled = true;
    };
  }, [handle]);

  return <ProductRow title="You may also like" products={products} showSaleBadge />;
}
