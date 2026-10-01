// Store-wide checkout rules. The client reads these via GET /api/orders/config
// so the UI and the server always agree.
module.exports = {
  CURRENCY: "pkr",
  FREE_SHIPPING_MIN: 2500, // matches the announcement bar
  SHIPPING_FEE: 250,
  MAX_QTY: 10,
  MAX_LINES: 50,
};
