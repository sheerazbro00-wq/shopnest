import { useCallback, useEffect, useRef, useState } from "react";
import { fetchProducts } from "../../api/products";

// Paged product list with infinite scroll: page 1 loads whenever `params`
// change; later pages load as `sentinelRef` nears the viewport. Responses from
// superseded requests are dropped (requestId), so fast filter clicks can't
// show stale results.
export default function useProductFeed(params, { pageSize = 40, enabled = true } = {}) {
  const [products, setProducts] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(enabled);
  const requestId = useRef(0);
  const sentinelRef = useRef(null);
  const key = JSON.stringify(params);

  const load = useCallback(
    async (pageToLoad) => {
      const id = ++requestId.current;
      setLoading(true);
      try {
        const data = await fetchProducts({ ...JSON.parse(key), page: pageToLoad, limit: pageSize });
        if (id !== requestId.current) return;
        setProducts((prev) => (pageToLoad === 1 ? data.products : [...prev, ...data.products]));
        setTotal(data.total);
        setPage(pageToLoad);
        setPages(data.pages);
      } catch {
        if (id === requestId.current && pageToLoad === 1) {
          setProducts([]);
          setTotal(0);
        }
      } finally {
        if (id === requestId.current) setLoading(false);
      }
    },
    [key, pageSize]
  );

  useEffect(() => {
    setProducts([]);
    setTotal(0);
    if (!enabled) {
      requestId.current++;
      setLoading(false);
      return;
    }
    load(1);
  }, [load, enabled]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!enabled || !el || loading || page >= pages) return;
    const observer = new IntersectionObserver((entries) => entries[0].isIntersecting && load(page + 1), {
      rootMargin: "800px 0px",
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [enabled, load, loading, page, pages]);

  return { products, total, loading, sentinelRef };
}
