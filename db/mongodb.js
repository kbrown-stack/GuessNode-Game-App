
require("dotenv").config();  // Load .env
const mongoose = require("mongoose");

const connectToDb = async () => {
    try {

        if (!process.env.MONGODB_URL) {
            throw new Error("MONGODB_URL is not defined in .env file");
        }
        mongoose.connect(process.env.MONGODB_URL);


        console.log("Connected to MongoDB");
    } catch (error) {
        console.error("MongoDB connection failed:", error.message);
    }
};

module.exports = connectToDb;

