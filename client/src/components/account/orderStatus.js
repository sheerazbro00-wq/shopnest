import { isOnline } from "../../utils/payment";

// Customer-facing wording for an order's state (Shopify customer-account style).
export function orderStatus(order) {
  if (order.status === "Cancelled") return { label: "Cancelled", tone: "critical", step: -1 };
  if (isOnline(order) && !order.isPaid) return { label: "Payment pending", tone: "warning", step: 0 };
  if (order.status === "Delivered") return { label: "Delivered", tone: "success", step: 2 };
  if (order.status === "Shipped") return { label: "On its way", tone: "info", step: 1 };
  return { label: "Confirmed", tone: "success", step: 0 };
}

export const shortDate = (d) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
