require("dotenv").config();
const mongoose = require("mongoose");
const connectDB = require("../config/db");
const Product = require("../models/Product");
const User = require("../models/User");
const catalog = require("./data/catalog.json");

// Optional: size charts + care instructions per styleCode (seed/importDetails.js).
let details = {};
try {
  details = require("./data/details.json");
} catch {
  console.warn("details.json not found — seeding without size charts / care");
}

const run = async () => {
  await connectDB();

  // Drop (not just empty) so indexes from older schema versions go away too.
  await Product.collection.drop().catch(() => {});
  await Product.syncIndexes();
  await Product.insertMany(catalog.map((p) => ({ ...p, ...details[p.styleCode] })));
  console.log(`Seeded ${catalog.length} products`);

  // The admin account is created separately with `npm run admin`, which asks
  // for the password — so no password ever lives in the code or the repo.
  if (!(await User.exists({ isAdmin: true }))) console.log("No admin user yet — run `npm run admin` to create one.");

  await mongoose.disconnect();
  process.exit(0);
};

run().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
