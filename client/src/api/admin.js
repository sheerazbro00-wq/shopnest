import api from "./axios";

export const fetchDashboard = (range) => api.get("/admin/dashboard", { params: { range } }).then((res) => res.data);

export const fetchAdminCounts = () => api.get("/admin/counts").then((res) => res.data);

export const fetchAdminOrders = (params, signal) => api.get("/admin/orders", { params, signal }).then((res) => res.data);

export const fetchAdminOrder = (id) => api.get(`/admin/orders/${id}`).then((res) => res.data);

// body: { action: "ship" | "deliver" | "cancel" } and/or { note }
export const updateAdminOrder = (id, body) => api.patch(`/admin/orders/${id}`, body).then((res) => res.data);

export const fetchAdminProducts = (params, signal) => api.get("/admin/products", { params, signal }).then((res) => res.data);

export const fetchProductMeta = () => api.get("/admin/products/meta").then((res) => res.data);

export const fetchAdminProduct = (id) => api.get(`/admin/products/${id}`).then((res) => res.data);

export const createAdminProduct = (body) => api.post("/admin/products", body).then((res) => res.data);

export const updateAdminProduct = (id, body) => api.patch(`/admin/products/${id}`, body).then((res) => res.data);

export const deleteAdminProduct = (id) => api.delete(`/admin/products/${id}`).then((res) => res.data);

export const fetchAdminCustomers = (params, signal) => api.get("/admin/customers", { params, signal }).then((res) => res.data);

export const fetchAdminCustomer = (key) => api.get(`/admin/customers/${key}`).then((res) => res.data);

export const fetchAdminMessages = (params, signal) => api.get("/admin/messages", { params, signal }).then((res) => res.data);

export const fetchAdminMessage = (id) => api.get(`/admin/messages/${id}`).then((res) => res.data);

export const updateAdminMessage = (id, status) => api.patch(`/admin/messages/${id}`, { status }).then((res) => res.data);

export const deleteAdminMessage = (id) => api.delete(`/admin/messages/${id}`).then((res) => res.data);
