// This files helps you have access to the enviromnennt variables. 

require("dotenv").config();

module.exports = {
    PORT: process.env.PORT,
    MONGODB_URL: process.env.MONGODB_URL
}