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

// ---------- image upload (spec 002) ----------

// A one-hour signed "permission slip" for uploading straight to Cloudinary.
// Rejects with a 503 response when uploads aren't set up on the server.
export const signImageUpload = () => api.post("/admin/uploads/sign").then((res) => res.data);

// Sends one file to Cloudinary with the signed params. XHR, not fetch: only XHR
// reports upload progress (AC-1.4). Resolves to the stored photo's https URL.
export const uploadToCloudinary = (file, slip, { onProgress, signal } = {}) =>
  new Promise((resolve, reject) => {
    const body = new FormData();
    body.append("file", file);
    body.append("api_key", slip.apiKey);
    body.append("signature", slip.signature);
    Object.entries(slip.params).forEach(([k, v]) => body.append(k, v));

    const xhr = new XMLHttpRequest();
    xhr.open("POST", slip.uploadUrl);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress?.(e.loaded / e.total);
    xhr.onload = () => {
      let data = {};
      try {
        data = JSON.parse(xhr.responseText);
      } catch {
        /* non-JSON error page */
      }
      if (xhr.status >= 200 && xhr.status < 300 && data.secure_url) return resolve(data.secure_url);
      // 4xx: Cloudinary looked at the file and refused it (e.g. not really an image, R-4).
      reject({ status: xhr.status, refused: xhr.status >= 400 && xhr.status < 500, message: data.error?.message });
    };
    xhr.onerror = () => reject({ status: 0, refused: false });
    xhr.onabort = () => reject({ status: 0, aborted: true });
    signal?.addEventListener("abort", () => xhr.abort());
    xhr.send(body);
  });
