import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchDashboard } from "../../api/admin";
import { errorMessage } from "../../api/orders";
import { AdminPage } from "../../components/admin/AdminLayout";
import SalesChart from "../../components/admin/SalesChart";
import OrdersTable from "../../components/admin/OrdersTable";
import { rupees } from "../../components/admin/format";
import { sized } from "../../utils/format";
import "./Dashboard.css";

const RANGES = [
  { value: 7, label: "7 days" },
  { value: 30, label: "30 days" },
  { value: 90, label: "90 days" },
];

// Signed % change vs the previous period; null when there's nothing to compare.
function change(cur, prev) {
  if (!prev) return cur ? null : 0;
  return ((cur - prev) / prev) * 100;
}

function Delta({ value, range }) {
  if (value == null) return <p className="stat__delta stat__delta--flat">New this period</p>;
  const dir = value > 0.05 ? "up" : value < -0.05 ? "down" : "flat";
  return (
    <p className={`stat__delta stat__delta--${dir}`}>
      <svg viewBox="0 0 12 12" aria-hidden="true">
        {dir === "up" && <path d="M6 2.5v7M2.5 6 6 2.5 9.5 6" />}
        {dir === "down" && <path d="M6 9.5v-7M2.5 6 6 9.5 9.5 6" />}
        {dir === "flat" && <path d="M2.5 6h7" />}
      </svg>
      <span>
        {dir === "flat" ? "No change" : `${Math.abs(value).toFixed(1)}% ${dir === "up" ? "up" : "down"}`}
        <span className="stat__vs"> vs previous {range} days</span>
      </span>
    </p>
  );
}

function Stat({ label, value, delta, range, hero }) {
  return (
    <div className={`adm-card stat${hero ? " stat--hero" : ""}`}>
      <p className="stat__label">{label}</p>
      <p className="stat__value">{value}</p>
      <Delta value={delta} range={range} />
    </div>
  );
}

function Skeleton() {
  return (
    <div className="dash" aria-busy="true" aria-label="Loading dashboard">
      <div className="dash-stats">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="adm-card stat">
            <div className="adm-skeleton" style={{ height: 14, width: "50%" }} />
            <div className="adm-skeleton" style={{ height: 28, width: "70%", marginTop: 12 }} />
          </div>
        ))}
      </div>
      <div className="adm-card" style={{ padding: 16 }}>
        <div className="adm-skeleton" style={{ height: 260 }} />
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [range, setRange] = useState(30);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    setError("");
    fetchDashboard(range)
      .then((d) => alive && setData(d))
      .catch((err) => alive && setError(errorMessage(err, "Couldn't load the dashboard.")));
    return () => {
      alive = false;
    };
  }, [range]);

  const rangePicker = (
    <div className="adm-segmented" role="radiogroup" aria-label="Date range">
      {RANGES.map((r) => (
        <button key={r.value} type="button" role="radio" aria-checked={range === r.value} onClick={() => setRange(r.value)}>
          {r.label}
        </button>
      ))}
    </div>
  );

  return (
    <AdminPage title="Dashboard" actions={rangePicker}>
      {error && <p className="adm-error">{error}</p>}
      {!data && !error && <Skeleton />}
      {data && (
        <div className={`dash${data.range !== range ? " is-stale" : ""}`}>
          <div className="dash-stats">
            <Stat hero label="Total sales" value={rupees(data.current.sales)} delta={change(data.current.sales, data.previous.sales)} range={data.range} />
            <Stat label="Orders" value={data.current.orders.toLocaleString("en-US")} delta={change(data.current.orders, data.previous.orders)} range={data.range} />
            <Stat label="Average order value" value={rupees(data.current.aov)} delta={change(data.current.aov, data.previous.aov)} range={data.range} />
            <Stat label="New customers" value={data.current.customers.toLocaleString("en-US")} delta={change(data.current.customers, data.previous.customers)} range={data.range} />
          </div>

          <section className="adm-card dash-chart" aria-labelledby="SalesTitle">
            <div className="adm-card__head">
              <div>
                <h2 id="SalesTitle" className="adm-card__title">
                  Total sales over time
                </h2>
                <p className="adm-card__sub">Last {data.range} days · excludes cancelled and unpaid card orders</p>
              </div>
            </div>
            <SalesChart series={data.series} />
          </section>

          <div className="dash-row">
            <section className="adm-card dash-todo" aria-labelledby="TodoTitle">
              <div className="adm-card__head">
                <h2 id="TodoTitle" className="adm-card__title">
                  Things to do
                </h2>
              </div>
              <ul>
                <li>
                  <Link to="/admin/orders?status=Pending">
                    <span className="dash-todo__count">{data.toFulfill}</span>
                    <span>{data.toFulfill === 1 ? "order" : "orders"} to fulfill</span>
                    <span aria-hidden="true" className="dash-todo__arrow">&rsaquo;</span>
                  </Link>
                </li>
                <li>
                  <Link to="/admin/messages">
                    <span className="dash-todo__count">{data.newMessages}</span>
                    <span>new {data.newMessages === 1 ? "message" : "messages"}</span>
                    <span aria-hidden="true" className="dash-todo__arrow">&rsaquo;</span>
                  </Link>
                </li>
                <li>
                  <Link to="/admin/products?availability=out">
                    <span className="dash-todo__count">{data.outOfStock}</span>
                    <span>
                      of {data.productCount.toLocaleString("en-US")} products out of stock
                    </span>
                    <span aria-hidden="true" className="dash-todo__arrow">&rsaquo;</span>
                  </Link>
                </li>
              </ul>
            </section>

            <section className="adm-card dash-top" aria-labelledby="TopTitle">
              <div className="adm-card__head">
                <h2 id="TopTitle" className="adm-card__title">
                  Top products
                </h2>
                <span className="adm-card__sub">by units sold</span>
              </div>
              {data.topProducts.length === 0 ? (
                <p className="dash-empty">No sales in this period yet.</p>
              ) : (
                <ol>
                  {data.topProducts.map((p) => (
                    <li key={p.handle}>
                      <span className="dash-top__thumb">{p.image && <img src={sized(p.image, 120)} alt="" loading="lazy" />}</span>
                      <span className="dash-top__info">
                        <a href={`/products/${p.handle}`} target="_blank" rel="noreferrer" className="dash-top__name">
                          {p.name}
                        </a>
                        <span className="adm-muted">{p.color}</span>
                      </span>
                      <span className="dash-top__nums">
                        <strong>{p.qty} sold</strong>
                        <span className="adm-muted">{rupees(p.revenue)}</span>
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          </div>

          <section className="adm-card" aria-labelledby="RecentTitle">
            <div className="adm-card__head dash-recent__head">
              <h2 id="RecentTitle" className="adm-card__title">
                Recent orders
              </h2>
              <Link to="/admin/orders" className="adm-card__link">
                View all orders
              </Link>
            </div>
            {data.recent.length === 0 ? (
              <p className="dash-empty">No orders yet.</p>
            ) : (
              <OrdersTable orders={data.recent} />
            )}
          </section>
        </div>
      )}
    </AdminPage>
  );
}
