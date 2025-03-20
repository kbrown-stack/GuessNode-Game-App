require("dotenv").config();
const express = require("express");
const http = require("http"); // This helps to import the http modules
const { Server } = require("socket.io");
const path = require("path");
const gameRoutes = require("./routes/gameRoutes")
const connectToDb = require("./db/mongodb"); // importing the mongo DB
const gameController = require("./controllers/gameController"); // This helps to import the controllers.

const PORT = 8001;
const app = express();
const server = http.createServer(app);
const io = new Server(server); // this server is part of the socket io.

// Setting up the EJS ENGINE FOR THE view folder and Middleware setup

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public"))); // this is a MD that helps create the style static file


connectToDb() // Connecting to MongoDB  Database.

app.use('/game', gameRoutes) // Using the game route for all API related game endpoints


// Setting up the Routes

app.get("/", (req, res) => {
  res.render("index");
});


// Implementing and creating the websocket connectivity

io.on("connection", (socket) => {
    console.log("A user connected:", socket.id);
    gameController.handleSocketEvents(socket, io);
});
// Start the Server

server.listen(PORT, () =>
  console.log(`Server running on http://localhost:${PORT}`)
);
