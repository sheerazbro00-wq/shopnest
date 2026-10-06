import { Link, useNavigate } from "react-router-dom";
import { STATUS_BADGE, orderDate, paymentBadge, paymentLabel, rupees } from "./format";

export const Badge = ({ label, tone }) => <span className={`adm-badge adm-badge--${tone}`}>{label}</span>;

export const StatusBadge = ({ status }) => <Badge {...(STATUS_BADGE[status] || { label: status, tone: "neutral" })} />;

// Orders table shared by the dashboard and the Orders list. Rows open the
// order; on phones the rows reflow into cards (.adm-table--stack).
export default function OrdersTable({ orders, search = "" }) {
  const navigate = useNavigate();
  const open = (id) => navigate(`/admin/orders/${id}`, { state: { back: search } });

  return (
    <div className="adm-table-wrap">
      <table className="adm-table adm-table--stack">
        <thead>
          <tr>
            <th scope="col">Order</th>
            <th scope="col">Date</th>
            <th scope="col">Customer</th>
            <th scope="col">Payment</th>
            <th scope="col">Fulfillment</th>
            <th scope="col" className="num">
              Items
            </th>
            <th scope="col" className="num">
              Total
            </th>
          </tr>
        </thead>
        <tbody>
          {orders.map((o) => (
            <tr key={o._id} className="is-link" onClick={() => open(o._id)}>
              <td data-slot="id">
                <Link to={`/admin/orders/${o._id}`} state={{ back: search }} className="adm-row-link" onClick={(e) => e.stopPropagation()}>
                  #{o.orderNumber}
                </Link>
              </td>
              <td data-slot="date" className="adm-muted">
                {orderDate(o.createdAt)}
              </td>
              <td data-slot="who">
                {o.customer}
                {o.city && <span className="adm-muted adm-hide-sm"> · {o.city}</span>}
              </td>
              <td data-slot="pay">
                <span className="adm-badges">
                  <Badge {...paymentBadge(o)} />
                  {/* PayPal is new and test payments must stand out (spec 004 AC-4.2). */}
                  {o.paymentMethod === "PayPal" && <Badge label={paymentLabel(o, { admin: true })} tone="info" />}
                </span>
              </td>
              <td data-slot="ful">
                <StatusBadge status={o.status} />
              </td>
              <td className="num adm-hide-sm">{o.items}</td>
              <td data-slot="total" className="num">
                {rupees(o.totalPrice)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
