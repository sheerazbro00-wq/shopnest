import api from "./axios";

const data = (res) => res.data;

export const fetchAccount = () => api.get("/account").then(data);
export const updateAccount = (fields) => api.patch("/account", fields).then(data);
export const changePassword = (currentPassword, newPassword) =>
  api.put("/account/password", { currentPassword, newPassword }).then(data);

export const addAddress = (address) => api.post("/account/addresses", address).then(data);
export const updateAddress = (id, address) => api.put(`/account/addresses/${id}`, address).then(data);
export const deleteAddress = (id) => api.delete(`/account/addresses/${id}`).then(data);

export const fetchMyOrders = () => api.get("/orders/mine").then(data);
export const fetchMyOrder = (id) => api.get(`/orders/${id}`).then(data);
