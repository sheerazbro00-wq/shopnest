// Creates the store admin, or changes an existing admin's password.
// The password is typed at the prompt, so it never appears in the code,
// the repo or the shell history.
//
//   npm run admin                      -> admin@shopnest.com
//   npm run admin -- owner@example.com -> a different email
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const readline = require("readline");
const mongoose = require("mongoose");
const User = require("../models/User");
const { isEmail } = require("../utils/validation");

const MIN_PASSWORD = 10;

// A prompt that shows the question but doesn't echo what is typed after it.
function hiddenPrompt() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  rl._writeToOutput = () => {}; // never echo keystrokes
  const lines = [];
  let waiting = null;
  let closed = false;
  rl.on("line", (raw) => {
    const line = raw.replace(/^﻿/, ""); // Windows pipes may prepend a byte-order mark
    if (waiting) waiting.resolve(line);
    else lines.push(line);
    waiting = null;
  });
  rl.on("close", () => {
    closed = true;
    if (waiting) waiting.reject(new Error("Cancelled."));
  });
  const ask = (question) =>
    new Promise((resolve, reject) => {
      process.stdout.write(question);
      const done = (fn) => (value) => {
        process.stdout.write("\n");
        fn(value);
      };
      if (lines.length) return done(resolve)(lines.shift());
      if (closed) return done(reject)(new Error("Cancelled."));
      waiting = { resolve: done(resolve), reject: done(reject) };
    });
  return { ask, close: () => rl.close() };
}

async function run() {
  const email = (process.argv[2] || "admin@shopnest.com").toLowerCase();
  if (!isEmail(email)) throw new Error("That doesn't look like an email address.");
  if (!process.env.MONGO_URI) throw new Error("MONGO_URI is not set.");

  const prompt = hiddenPrompt();
  let password;
  try {
    password = await prompt.ask(`New password for ${email} (min ${MIN_PASSWORD} characters): `);
    if (password.length < MIN_PASSWORD) throw new Error(`Password must be at least ${MIN_PASSWORD} characters.`);
    if ((await prompt.ask("Type it again: ")) !== password) throw new Error("The two passwords don't match.");
  } finally {
    prompt.close();
  }

  await mongoose.connect(process.env.MONGO_URI);
  const host = mongoose.connection.host;
  let user = await User.findOne({ email }).select("+password");
  if (user) {
    user.password = password; // hashed by the model's pre-save hook
    user.isAdmin = true;
  } else {
    user = new User({ name: "Admin", email, password, isAdmin: true });
  }
  await user.save();
  console.log(`Admin ${email} is ready on ${host}.`);
}

run()
  .catch((err) => {
    console.error(err.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
