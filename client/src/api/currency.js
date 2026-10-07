import api from "./axios";

// Sent without the login token on purpose: the answer is the same for everyone, and a
// request carrying Authorization would skip the CDN cache (spec 007 R-3).
export const fetchCurrency = () =>
  fetch(`${api.defaults.baseURL}/currency`).then((res) => {
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  });
