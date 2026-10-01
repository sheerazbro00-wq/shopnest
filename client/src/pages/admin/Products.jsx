import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { fetchAdminProducts, fetchProductMeta } from "../../api/admin";
import { errorMessage } from "../../api/orders";
import { AdminPage } from "../../components/admin/AdminLayout";
import { Badge } from "../../components/admin/OrdersTable";
import Toast, { useToast } from "../../components/admin/Toast";
import { rupees } from "../../components/admin/format";
import { sized } from "../../utils/format";
import "./Orders.css"; // shared list styles: tabs, filters, pager
import "./Products.css";

const TABS = [
  { value: "", label: "All", key: "all" },
  { value: "active", label: "Active", key: "active" },
  { value: "draft", label: "Draft", key: "draft" },
  { value: "out", label: "Out of stock", key: "out" },
];

const SORTS = [
  { value: "", label: "Newest" },
  { value: "updated", label: "Recently updated" },
  { value: "title-asc", label: "Title A–Z" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
];

function Inventory({ p }) {
  if (p.sizesInStock === 0) return <Badge label="Out of stock" tone="critical" />;
  const low = p.sizesInStock < p.sizes;
  return (
    <span className={low ? "prod-stock prod-stock--low" : "prod-stock"}>
      {p.sizesInStock} of {p.sizes} sizes in stock
    </span>
  );
}

export default function Products() {
  const navigate = useNavigate();
  const location = useLocation();
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") || (params.get("availability") === "out" ? "out" : "");
  const type = params.get("type") || "";
  const collection = params.get("collection") || "";
  const sort = params.get("sort") || "";
  const q = params.get("q") || "";
  const page = Math.max(1, parseInt(params.get("page")) || 1);

  const [meta, setMeta] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState(q);
  const [toast, showToast] = useToast();

  // A toast handed over by the edit page (e.g. after deleting a product).
  useEffect(() => {
    if (location.state?.toast) {
      showToast(location.state.toast);
      navigate(location.pathname + location.search, { replace: true, state: null });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchProductMeta().then(setMeta).catch(() => setMeta({ productTypes: [], collections: [] }));
  }, []);

  const update = (changes, { keepPage = false } = {}) => {
    const next = new URLSearchParams(params);
    next.delete("availability");
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
    fetchAdminProducts({ tab, type, collection, sort, q, page }, controller.signal)
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch((err) => {
        if (err.name === "CanceledError") return;
        setError(errorMessage(err, "Couldn't load products."));
        setLoading(false);
      });
    return () => controller.abort();
  }, [tab, type, collection, sort, q, page]);

  const from = data ? (data.page - 1) * data.pageSize + 1 : 0;
  const to = data ? Math.min(data.page * data.pageSize, data.total) : 0;
  const filtered = Boolean(q || type || collection || tab);
  const groups = meta ? [...new Set(meta.collections.map((c) => c.group))] : [];

  return (
    <AdminPage
      title="Products"
      actions={
        <Link to="/admin/products/new" className="adm-btn adm-btn--primary">
          Add product
        </Link>
      }
    >
      {error && <p className="adm-error">{error}</p>}

      <section className="adm-card orders-card">
        <div className="orders-tabs" role="tablist" aria-label="Filter products">
          {TABS.map((t) => (
            <button key={t.key} type="button" role="tab" aria-selected={tab === t.value} className={tab === t.value ? "is-active" : ""} onClick={() => update({ tab: t.value })}>
              {t.label}
              {data?.counts && <span className="orders-tabs__count">{data.counts[t.key].toLocaleString("en-US")}</span>}
            </button>
          ))}
        </div>

        <div className="orders-filters">
          <div className="orders-search">
            <svg viewBox="0 0 20 20" aria-hidden="true" className="adm-icon">
              <path d="M8.5 14a5.5 5.5 0 1 0 0-11 5.5 5.5 0 0 0 0 11zM17 17l-4.5-4.5" />
            </svg>
            <label htmlFor="ProductSearch" className="visually-hidden">
              Search products
            </label>
            <input id="ProductSearch" type="search" placeholder="Search by title, style code, colour or SKU" value={search} onChange={(e) => setSearch(e.target.value)} autoComplete="off" />
          </div>
          <label className="visually-hidden" htmlFor="ProductType">
            Product type
          </label>
          <select id="ProductType" className="adm-select" value={type} onChange={(e) => update({ type: e.target.value })}>
            <option value="">All types</option>
            {meta?.productTypes.map((t) => (
              <option key={t} value={t}>
                {t.charAt(0) + t.slice(1).toLowerCase()}
              </option>
            ))}
          </select>
          <label className="visually-hidden" htmlFor="ProductCollection">
            Collection
          </label>
          <select id="ProductCollection" className="adm-select" value={collection} onChange={(e) => update({ collection: e.target.value })}>
            <option value="">All collections</option>
            {groups.map((g) => (
              <optgroup key={g} label={g}>
                {meta.collections
                  .filter((c) => c.group === g)
                  .map((c) => (
                    <option key={c.handle} value={c.handle}>
                      {c.title}
                    </option>
                  ))}
              </optgroup>
            ))}
          </select>
          <label className="visually-hidden" htmlFor="ProductSort">
            Sort
          </label>
          <select id="ProductSort" className="adm-select" value={sort} onChange={(e) => update({ sort: e.target.value })}>
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
                <div key={i} className="adm-skeleton" style={{ height: 40 }} />
              ))}
            </div>
          )}
          {data && data.products.length > 0 && (
            <div className="adm-table-wrap">
              <table className="adm-table prod-table">
                <thead>
                  <tr>
                    <th scope="col">Product</th>
                    <th scope="col">Status</th>
                    <th scope="col">Inventory</th>
                    <th scope="col">Type</th>
                    <th scope="col" className="num">
                      Price
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.products.map((p) => (
                    <tr key={p._id} className="is-link" onClick={() => navigate(`/admin/products/${p._id}`, { state: { back: location.search } })}>
                      <td data-slot="product">
                        <span className="prod-cell">
                          <span className="prod-thumb">{p.image && <img src={sized(p.image, 120)} alt="" loading="lazy" />}</span>
                          <span className="prod-name">
                            <Link to={`/admin/products/${p._id}`} state={{ back: location.search }} className="adm-row-link" onClick={(e) => e.stopPropagation()}>
                              {p.title}
                            </Link>
                            <span className="adm-muted">
                              {p.color} · {p.styleCode}
                            </span>
                          </span>
                        </span>
                      </td>
                      <td data-slot="status">
                        <Badge label={p.status === "draft" ? "Draft" : "Active"} tone={p.status === "draft" ? "info" : "success"} />
                      </td>
                      <td data-slot="stock">
                        <Inventory p={p} />
                      </td>
                      <td data-slot="type" className="adm-muted">
                        {p.productType ? p.productType.charAt(0) + p.productType.slice(1).toLowerCase() : "—"}
                      </td>
                      <td data-slot="price" className="num">
                        <span className="prod-price">
                          {rupees(p.price)}
                          {p.discount > 0 && (
                            <>
                              <s className="adm-muted">{rupees(p.compareAtPrice)}</s>
                              <span className="prod-off">{p.discount}% off</span>
                            </>
                          )}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {data && data.products.length === 0 && (
            <div className="orders-empty">
              <h2>No products found</h2>
              <p>{filtered ? "Try a different search or filter." : "Add your first product to start selling."}</p>
              {filtered ? (
                <button type="button" className="adm-btn" onClick={() => setParams({}, { replace: true })}>
                  Clear filters
                </button>
              ) : (
                <Link to="/admin/products/new" className="adm-btn adm-btn--primary">
                  Add product
                </Link>
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
              <button type="button" className="adm-btn" disabled={data.page <= 1} onClick={() => update({ page: String(data.page - 1) }, { keepPage: true })}>
                &lsaquo; Prev
              </button>
              <button type="button" className="adm-btn" disabled={data.page >= data.pages} onClick={() => update({ page: String(data.page + 1) }, { keepPage: true })}>
                Next &rsaquo;
              </button>
            </div>
          </div>
        )}
      </section>
      <Toast {...toast} />
    </AdminPage>
  );
}
