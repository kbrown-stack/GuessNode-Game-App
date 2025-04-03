require("dotenv").config(); // Load .env
const mongoose = require("mongoose");

const connectToDb = async () => {
  try {
    if (!process.env.MONGODB_URL) {
      throw new Error("MONGODB_URL is not defined in .env file");
    }

    await mongoose.connect(process.env.MONGODB_URL);
    // mongoose.connect(process.env.MONGODB_URL);

    console.log("Connected to MongoDB");
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    process.exit(1) // this only stops the server if mongdb fails to connect.
  }
};

module.exports = connectToDb;
