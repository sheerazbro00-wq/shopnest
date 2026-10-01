import api from "./axios";

export const sendContactMessage = (fields) => api.post("/contact", fields).then((res) => res.data);
