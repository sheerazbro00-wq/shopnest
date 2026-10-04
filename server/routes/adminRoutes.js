const express = require("express");
const { getDashboard, getCounts } = require("../controllers/adminController");
const { listOrders, getOrder, updateOrder } = require("../controllers/adminOrderController");
const products = require("../controllers/adminProductController");
const customers = require("../controllers/adminCustomerController");
const messages = require("../controllers/adminMessageController");
const { signImageUpload } = require("../controllers/adminUploadController");
const { protect, admin } = require("../middleware/auth");

const router = express.Router();

// Everything under /api/admin requires a signed-in admin.
router.use(protect, admin);

router.get("/dashboard", getDashboard);
router.get("/counts", getCounts);

router.get("/orders", listOrders);
router.get("/orders/:id", getOrder);
router.patch("/orders/:id", updateOrder);

router.get("/products", products.listProducts);
router.get("/products/meta", products.getMeta);
router.post("/products", products.createProduct);
router.get("/products/:id", products.getProduct);
router.patch("/products/:id", products.updateProduct);
router.delete("/products/:id", products.deleteProduct);

router.post("/uploads/sign", signImageUpload);

router.get("/customers", customers.listCustomers);
router.get("/customers/:key", customers.getCustomer);

router.get("/messages", messages.listMessages);
router.get("/messages/:id", messages.getMessage);
router.patch("/messages/:id", messages.updateMessage);
router.delete("/messages/:id", messages.deleteMessage);

module.exports = router;
