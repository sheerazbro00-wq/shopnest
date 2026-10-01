import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { fetchAdminCustomers } from "../../api/admin";
import { errorMessage } from "../../api/orders";
import { AdminPage } from "../../components/admin/AdminLayout";
import { Badge } from "../../components/admin/OrdersTable";
import { initials, rupees, shortDate } from "../../components/admin/format";
import "./Orders.css";
import "./Customers.css";

const TABS = [
  { value: "", label: "All", key: "all" },
  { value: "accounts", label: "With account", key: "accounts" },
  { value: "guests", label: "Guests", key: "guests" },
  { value: "returning", label: "Returning", key: "returning" },
  { value: "subscribed", label: "Email subscribers", key: "subscribed" },
];

const SORTS = [
  { value: "", label: "Last order" },
  { value: "spent-desc", label: "Amount spent" },
  { value: "orders-desc", label: "Most orders" },
  { value: "newest", label: "Newest customers" },
  { value: "name", label: "Name A–Z" },
];

export default function Customers() {
  const location = useLocation();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") || "";
  const sort = params.get("sort") || "";
  const q = params.get("q") || "";
  const page = Math.max(1, parseInt(params.get("page")) || 1);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState(q);

  const update = (changes, { keepPage = false } = {}) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(changes)) (v ? next.set(k, v) : next.delete(k));
    if (!keepPage) next.delete("page");
    setParams(next, { replace: !("page" in changes) });
  };

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
    fetchAdminCustomers({ tab, sort, q, page }, controller.signal)
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch((err) => {
        if (err.name === "CanceledError") return;
        setError(errorMessage(err, "Couldn't load customers."));
        setLoading(false);
      });
    return () => controller.abort();
  }, [tab, sort, q, page]);

  const open = (key) => navigate(`/admin/customers/${key}`, { state: { back: location.search } });
  const from = data ? (data.page - 1) * data.pageSize + 1 : 0;
  const to = data ? Math.min(data.page * data.pageSize, data.total) : 0;

  return (
    <AdminPage title="Customers" subtitle={data ? `${data.counts.all.toLocaleString("en-US")} customers${q ? " match your search" : ""}` : null}>
      {error && <p className="adm-error">{error}</p>}

      <section className="adm-card orders-card">
        <div className="orders-tabs" role="tablist" aria-label="Filter customers">
          {TABS.map((t) => (
            <button key={t.key} type="button" role="tab" aria-selected={tab === t.value} className={tab === t.value ? "is-active" : ""} onClick={() => update({ tab: t.value })}>
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
            <label htmlFor="CustomerSearch" className="visually-hidden">
              Search customers
            </label>
            <input id="CustomerSearch" type="search" placeholder="Search by name, email or phone" value={search} onChange={(e) => setSearch(e.target.value)} autoComplete="off" />
          </div>
          <label className="visually-hidden" htmlFor="CustomerSort">
            Sort
          </label>
          <select id="CustomerSort" className="adm-select" value={sort} onChange={(e) => update({ sort: e.target.value })}>
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>
                Sort: {s.label}
              </option>
            ))}
          </select>
        </div>

        <div className={`orders-body${loading && data ? " is-loading" : ""}`} aria-busy={loading}>
          {loading && <div className="orders-progress" aria-hidden="true" />}
          {!data && loading && (
            <div className="orders-skeleton">
              {Array.from({ length: 6 }, (_, i) => (
                <div key={i} className="adm-skeleton" style={{ height: 30 }} />
              ))}
            </div>
          )}

          {data && data.customers.length > 0 && (
            <div className="adm-table-wrap">
              <table className="adm-table cust-table">
                <thead>
                  <tr>
                    <th scope="col">Customer</th>
                    <th scope="col">Email subscription</th>
                    <th scope="col">Location</th>
                    <th scope="col" className="num">
                      Orders
                    </th>
                    <th scope="col" className="num">
                      Amount spent
                    </th>
                    <th scope="col" className="num">
                      Last order
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.customers.map((c) => (
                    <tr key={c.key} className="is-link" onClick={() => open(c.key)}>
                      <td data-slot="who">
                        <div className="cust-cell">
                          <span className="cust-avatar" aria-hidden="true">
                            {initials(c.name)}
                          </span>
                          <span className="cust-who">
                            <Link to={`/admin/customers/${c.key}`} state={{ back: location.search }} className="adm-row-link" onClick={(e) => e.stopPropagation()}>
                              {c.name}
                            </Link>
                            <span className="adm-muted cust-email">{c.email}</span>
                          </span>
                          {!c.hasAccount && <span className="cust-tag">Guest</span>}
                        </div>
                      </td>
                      <td data-slot="mkt">{c.marketing ? <Badge label="Subscribed" tone="success" /> : <span className="adm-muted cust-dim">Not subscribed</span>}</td>
                      <td data-slot="city">
                        {c.city || <span className="adm-muted">—</span>}
                        {!c.hasAccount && <span className="cust-sm-only"> · Guest</span>}
                      </td>
                      <td data-slot="orders" className="num">
                        {c.orders} <span className="cust-sm-only">{c.orders === 1 ? "order" : "orders"}</span>
                      </td>
                      <td data-slot="spent" className="num">
                        {rupees(c.spent)}
                      </td>
                      <td data-slot="last" className="num adm-muted">
                        {c.lastOrderAt ? shortDate(c.lastOrderAt) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {data && data.customers.length === 0 && (
            <div className="orders-empty">
              <h2>No customers found</h2>
              <p>{q || tab ? "Try a different search or filter." : "Customers appear here when they sign up or place an order."}</p>
              {(q || tab) && (
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
