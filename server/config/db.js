const mongoose = require("mongoose");

// One shared connection, opened on first use. On a serverless host the same
// instance handles many requests, so the promise is cached and reused instead
// of connecting again each time.
let connecting = null;

const connectDB = () => {
  if (mongoose.connection.readyState === 1) return Promise.resolve(mongoose.connection);
  if (!connecting) {
    connecting = mongoose
      .connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 10000 })
      .then((conn) => {
        console.log(`MongoDB connected: ${conn.connection.host}`);
        return conn.connection;
      })
      .catch((error) => {
        connecting = null; // let the next request try again
        console.error(`MongoDB connection error: ${error.message}`);
        throw error;
      });
  }
  return connecting;
};

module.exports = connectDB;
