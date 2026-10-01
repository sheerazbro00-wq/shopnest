import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";

export const LIST_KEYS = ["size", "discount", "color", "type", "availability"];
const RANGE_KEYS = ["price_min", "price_max"];

// Filter + sort state lives in the URL so links are shareable and Back works.
export default function useFilters() {
  const [params, setParams] = useSearchParams();

  const filters = useMemo(() => {
    const f = {};
    for (const k of LIST_KEYS) f[k] = params.get(k) ? params.get(k).split(",") : [];
    for (const k of RANGE_KEYS) f[k] = params.get(k) || "";
    return f;
  }, [params]);

  const sortBy = params.get("sort_by") || "";

  const update = useCallback(
    (mutate) => {
      const next = new URLSearchParams(params);
      mutate(next);
      setParams(next, { replace: true });
    },
    [params, setParams]
  );

  const toggle = useCallback(
    (key, value) =>
      update((next) => {
        const current = next.get(key) ? next.get(key).split(",") : [];
        const v = String(value);
        const values = current.includes(v) ? current.filter((x) => x !== v) : [...current, v];
        values.length ? next.set(key, values.join(",")) : next.delete(key);
      }),
    [update]
  );

  const setValues = useCallback(
    (values) =>
      update((next) => {
        for (const [key, value] of Object.entries(values)) {
          value === "" || value == null ? next.delete(key) : next.set(key, value);
        }
      }),
    [update]
  );

  const setValue = useCallback((key, value) => setValues({ [key]: value }), [setValues]);

  const clearAll = useCallback(
    () => update((next) => [...LIST_KEYS, ...RANGE_KEYS].forEach((k) => next.delete(k))),
    [update]
  );

  const activeCount = LIST_KEYS.reduce((n, k) => n + filters[k].length, 0) + RANGE_KEYS.filter((k) => filters[k]).length;

  const query = useMemo(() => {
    const q = {};
    for (const k of LIST_KEYS) if (filters[k].length) q[k] = filters[k].join(",");
    for (const k of RANGE_KEYS) if (filters[k]) q[k] = filters[k];
    if (sortBy) q.sort_by = sortBy;
    return q;
  }, [filters, sortBy]);

  return { filters, sortBy, query, toggle, setValue, setValues, clearAll, activeCount };
}
