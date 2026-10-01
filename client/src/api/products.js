import api from "./axios";

export const fetchProducts = (params) => api.get("/products", { params }).then((res) => res.data);

export const fetchFacets = (params) => api.get("/products/facets", { params }).then((res) => res.data);

let collectionsPromise;
export const fetchCollections = () => {
  collectionsPromise ||= api
    .get("/products/collections")
    .then((res) => res.data)
    .catch((err) => {
      collectionsPromise = null;
      throw err;
    });
  return collectionsPromise;
};

export const fetchProduct = (handle) => api.get(`/products/${handle}`).then((res) => res.data);

export const fetchRecommendations = (handle) =>
  api.get(`/products/${handle}/recommendations`).then((res) => res.data);

export const fetchSuggestions = (q, signal) =>
  api.get("/products/suggest", { params: { q }, signal }).then((res) => res.data);
