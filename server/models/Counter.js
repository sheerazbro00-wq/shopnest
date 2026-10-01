const mongoose = require("mongoose");

const START = 1000;

// Atomic sequence generator: Counter.next("order") -> 1001, 1002, ...
// ($inc on an upserted doc starts from 0, so the offset is added here.)
const counterSchema = new mongoose.Schema({
  _id: String,
  seq: { type: Number, default: 0 },
});

counterSchema.statics.next = async function (name) {
  const doc = await this.findByIdAndUpdate(name, { $inc: { seq: 1 } }, { returnDocument: "after", upsert: true });
  return START + doc.seq;
};

module.exports = mongoose.model("Counter", counterSchema);
