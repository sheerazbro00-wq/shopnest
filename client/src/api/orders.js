import api from "./axios";

let configPromise;
export const fetchCheckoutConfig = () => {
  configPromise ||= api
    .get("/orders/config")
    .then((res) => res.data)
    .catch((err) => {
      configPromise = null;
      throw err;
    });
  return configPromise;
};

export const placeOrder = (payload) => api.post("/orders/checkout", payload).then((res) => res.data);

export const fetchOrder = (id, token) => api.get(`/orders/${id}`, { params: { token } }).then((res) => res.data);

// Axios error -> the server's message, or a generic fallback.
export const errorMessage = (err, fallback = "Something went wrong. Please try again.") =>
  err?.response?.data?.message || fallback;
