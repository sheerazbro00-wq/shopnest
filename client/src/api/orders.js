import api from "./axios";

// Fetched fresh on every checkout visit: it carries the exchange rates the server will
// charge with (spec 008 R-2), so a cached copy could show a stale total.
export const fetchCheckoutConfig = () => api.get("/orders/config").then((res) => res.data);

export const placeOrder = (payload) => api.post("/orders/checkout", payload).then((res) => res.data);

// "Pay now" on the test-mode PayPal page (spec 004, simulated mode only).
export const simulatePayPal = (id, token) => api.post(`/orders/${id}/paypal/simulate`, { token }).then((res) => res.data);

export const fetchOrder = (id, token) => api.get(`/orders/${id}`, { params: { token } }).then((res) => res.data);

// Axios error -> the server's message, or a generic fallback.
export const errorMessage = (err, fallback = "Something went wrong. Please try again.") =>
  err?.response?.data?.message || fallback;
