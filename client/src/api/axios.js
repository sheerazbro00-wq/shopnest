import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
});

api.interceptors.request.use((config) => {
  // Storage can be blocked (e.g. cookies disabled): then the request simply goes
  // without a token instead of failing — guests can still browse and buy.
  try {
    const { token } = JSON.parse(localStorage.getItem("shopnest_user")) || {};
    if (token) config.headers.Authorization = `Bearer ${token}`;
  } catch {
    /* no stored session */
  }
  return config;
});

export default api;
