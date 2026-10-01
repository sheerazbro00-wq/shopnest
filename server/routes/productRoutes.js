const express = require("express");
const {
  getProducts,
  getFacets,
  getSuggestions,
  getProductByHandle,
  getRecommendations,
  getCollections,
} = require("../controllers/productController");

const router = express.Router();

// Public, read-only catalogue. Product management is under /api/admin/products.
router.get("/", getProducts);
router.get("/collections", getCollections);
router.get("/facets", getFacets);
router.get("/suggest", getSuggestions);
router.get("/:handle", getProductByHandle);
router.get("/:handle/recommendations", getRecommendations);

module.exports = router;
