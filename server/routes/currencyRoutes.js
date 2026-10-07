const express = require("express");
const { getCurrency } = require("../controllers/currencyController");

const router = express.Router();

router.get("/", getCurrency);

module.exports = router;
