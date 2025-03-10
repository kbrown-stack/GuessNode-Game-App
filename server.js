const express = require('express');
const http = require('http'); // This helps to import the http modules
const {Server} = require('socket.io');
const path = require('path');

const PORT = 8001;

const app = express();
const server = http.createServer(app);
const io = new Server(server); // this server is part of the socket io. 


// Setting up the EJS ENGINE FOR THE view folder and files.

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public"))); // this is a MD that helps create the style static file


// To store game Sessions 

const gameSessions = {};

app.get("/", (req, res) => {
    res.render("index");
  });

// Game page

app.get("/game/:sessionId", (req, res) => {
    const sessionId = req.params.sessionId;
    if (!gameSessions[sessionId]) {
      return res.redirect("/");
    }
    res.render("game", { sessionId });
  });

 // Implementing and creating the websocket connectivity
io.on("connection", (socket) => {
    console.log("A user connected:", socket.id);

    // Implementing and creating a game session
    socket.on("createGame", ({ username }) => {
        const sessionId = `game-${Date.now()}`;
        gameSessions[sessionId] = {
            gameMaster: socket.id,
            players: [{ id: socket.id, username, score: 0 }],
            question: null,
            answer: null,
            status: "waiting",
        };

        socket.join(sessionId);
        socket.emit("gameCreated", { sessionId });
        console.log(`${username} created game: ${sessionId}`);
    });

// Implementing  and creating Join Game session 

    socket.on("joinGame", ({ sessionId, username }) => {
        if (!gameSessions[sessionId] || gameSessions[sessionId].status !== "waiting") {
            socket.emit("error", { message: "Game not available" });
            return;
        }

        gameSessions[sessionId].players.push({ id: socket.id, username, score: 0 });
        socket.join(sessionId);
        
        io.to(sessionId).emit("updatePlayers", gameSessions[sessionId].players);
        console.log(`${username} joined game: ${sessionId}`);
    });

// Implementing the when user (Player) is Disconnected from Game
    socket.on("disconnect", () => {
        Object.keys(gameSessions).forEach((sessionId) => {
            const session = gameSessions[sessionId];
            session.players = session.players.filter((p) => p.id !== socket.id);

            if (session.players.length === 0) {
                delete gameSessions[sessionId];
            } else if (session.gameMaster === socket.id) {
                session.gameMaster = session.players[0].id; // This helps initiate  a new game master
            }

            io.to(sessionId).emit("updatePlayers", session.players);
        });

        console.log(`User disconnected: ${socket.id}`);
    });
});



// Start the Server
  server.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));