const mongoose = require("mongoose");

// One document (_id "PKR") holding the last good rates as rupees per unit,
// e.g. { USD: 276.74, GBP: 367.04 } (spec 007 plan §3.1).
const exchangeRateSchema = new mongoose.Schema(
  {
    _id: String,
    rates: { type: mongoose.Schema.Types.Mixed, default: null },
    sourceUpdatedAt: Date, // when the provider published them
    checkedAt: Date, // when we last asked, success or not
    pending: { type: mongoose.Schema.Types.Mixed, default: null }, // { rates, seenAt }: a big jump awaiting confirmation
    lastError: { type: String, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ExchangeRate", exchangeRateSchema);
