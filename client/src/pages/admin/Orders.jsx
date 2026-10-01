import { useEffect, useRef, useState } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import { fetchAdminOrders } from "../../api/admin";
import { errorMessage } from "../../api/orders";
import { AdminPage } from "../../components/admin/AdminLayout";
import OrdersTable from "../../components/admin/OrdersTable";
import "./Orders.css";

const TABS = [
  { value: "", label: "All", key: "All" },
  { value: "Pending", label: "Unfulfilled", key: "Pending" },
  { value: "Shipped", label: "Shipped", key: "Shipped" },
  { value: "Delivered", label: "Delivered", key: "Delivered" },
  { value: "Cancelled", label: "Cancelled", key: "Cancelled" },
  { value: "Awaiting payment", label: "Awaiting payment", key: "Awaiting payment" },
];

const PAYMENTS = [
  { value: "", label: "All payments" },
  { value: "paid", label: "Paid" },
  { value: "unpaid", label: "Payment pending" },
  { value: "cod", label: "Cash on Delivery" },
  { value: "card", label: "Card" },
];

const SORTS = [
  { value: "", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "total-desc", label: "Total: high to low" },
  { value: "total-asc", label: "Total: low to high" },
];

export default function Orders() {
  const location = useLocation();
  const [params, setParams] = useSearchParams();
  const status = params.get("status") || "";
  const payment = params.get("payment") || "";
  const sort = params.get("sort") || "";
  const q = params.get("q") || "";
  const page = Math.max(1, parseInt(params.get("page")) || 1);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState(q);
  const searchRef = useRef(null);

  // Change one or more URL params; any filter change goes back to page 1.
  const update = (changes, { keepPage = false } = {}) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(changes)) (v ? next.set(k, v) : next.delete(k));
    if (!keepPage) next.delete("page");
    setParams(next, { replace: !("page" in changes) });
  };

  // Debounced search box -> ?q=
  useEffect(() => {
    if (search === q) return;
    const t = setTimeout(() => update({ q: search.trim() }), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  useEffect(() => setSearch(q), [q]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    fetchAdminOrders({ status, payment, sort, q, page }, controller.signal)
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch((err) => {
        if (err.name === "CanceledError") return;
        setError(errorMessage(err, "Couldn't load orders."));
        setLoading(false);
      });
    return () => controller.abort();
  }, [status, payment, sort, q, page]);

  const filtered = Boolean(q || payment);
  const from = data ? (data.page - 1) * data.pageSize + 1 : 0;
  const to = data ? Math.min(data.page * data.pageSize, data.total) : 0;

  return (
    <AdminPage title="Orders">
      {error && <p className="adm-error">{error}</p>}

      <section className="adm-card orders-card">
        <div className="orders-tabs" role="tablist" aria-label="Filter by status">
          {TABS.map((t) => (
            <button key={t.key} type="button" role="tab" aria-selected={status === t.value} className={status === t.value ? "is-active" : ""} onClick={() => update({ status: t.value })}>
              {t.label}
              {data?.counts && <span className="orders-tabs__count">{data.counts[t.key] || 0}</span>}
            </button>
          ))}
        </div>

        <div className="orders-filters">
          <div className="orders-search">
            <svg viewBox="0 0 20 20" aria-hidden="true" className="adm-icon">
              <path d="M8.5 14a5.5 5.5 0 1 0 0-11 5.5 5.5 0 0 0 0 11zM17 17l-4.5-4.5" />
            </svg>
            <label htmlFor="OrderSearch" className="visually-hidden">
              Search orders
            </label>
            <input
              ref={searchRef}
              id="OrderSearch"
              type="search"
              placeholder="Search by order #, name, email or phone"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoComplete="off"
            />
          </div>
          <label className="visually-hidden" htmlFor="OrderPayment">
            Payment
          </label>
          <select id="OrderPayment" className="adm-select" value={payment} onChange={(e) => update({ payment: e.target.value })}>
            {PAYMENTS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
          <label className="visually-hidden" htmlFor="OrderSort">
            Sort
          </label>
          <select id="OrderSort" className="adm-select" value={sort} onChange={(e) => update({ sort: e.target.value })}>
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        <div className={`orders-body${loading && data ? " is-loading" : ""}`} aria-busy={loading}>
          {loading && <div className="orders-progress" aria-hidden="true" />}
          {!data && loading && (
            <div className="orders-skeleton">
              {Array.from({ length: 6 }, (_, i) => (
                <div key={i} className="adm-skeleton" style={{ height: 22 }} />
              ))}
            </div>
          )}
          {data && data.orders.length > 0 && <OrdersTable orders={data.orders} search={location.search} />}
          {data && data.orders.length === 0 && (
            <div className="orders-empty">
              <h2>No orders found</h2>
              <p>{filtered || status ? "Try a different search or filter." : "Orders will appear here as soon as customers check out."}</p>
              {(filtered || status) && (
                <button type="button" className="adm-btn" onClick={() => setParams({}, { replace: true })}>
                  Clear filters
                </button>
              )}
            </div>
          )}
        </div>

        {data && data.total > 0 && (
          <div className="orders-pager">
            <p className="adm-muted">
              Showing {from}–{to} of {data.total.toLocaleString("en-US")}
            </p>
            <div className="orders-pager__btns">
              <button type="button" className="adm-btn" disabled={data.page <= 1} onClick={() => update({ page: String(data.page - 1) }, { keepPage: true })} aria-label="Previous page">
                &lsaquo; Prev
              </button>
              <button type="button" className="adm-btn" disabled={data.page >= data.pages} onClick={() => update({ page: String(data.page + 1) }, { keepPage: true })} aria-label="Next page">
                Next &rsaquo;
              </button>
            </div>
          </div>
        )}
      </section>
    </AdminPage>
  );
}
