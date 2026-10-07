// Store-wide checkout rules. The client reads these via GET /api/orders/config
// so the UI and the server always agree.
const FREE_SHIPPING_MIN = 2500; // matches the announcement bar
const SHIPPING_FEE = 250;

module.exports = {
  CURRENCY: "pkr",
  FREE_SHIPPING_MIN,
  SHIPPING_FEE,
  MAX_QTY: 10,
  MAX_LINES: 50,
  // Where we ship and in what currency we charge (spec 008 §3). Cash on Delivery is Pakistan only.
  COUNTRIES: {
    PK: { name: "Pakistan", currency: "PKR", cod: true },
    US: { name: "United States", currency: "USD", cod: false },
    GB: { name: "United Kingdom", currency: "GBP", cod: false },
  },
  // In rupees, converted like prices (spec 008 §6). Free shipping compares rupee item totals.
  SHIPPING: {
    PK: { fee: SHIPPING_FEE, freeMin: FREE_SHIPPING_MIN },
    INTL: { fee: 4500, freeMin: 30000 },
  },
};
