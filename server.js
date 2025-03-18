const express = require("express");
const http = require("http"); // This helps to import the http modules
const { Server } = require("socket.io");
const path = require("path");

const PORT = 8001;

const app = express();
const server = http.createServer(app);
const io = new Server(server); // this server is part of the socket io.
const Game = require("./models/game");

const connectToDb = require('./db/mongodb'); // importing the mongo DB

// Setting up the EJS ENGINE FOR THE view folder and files.

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public"))); // this is a MD that helps create the style static file

connectToDb() // Connecting to MongoDB  Database.

// To store game Sessions

const gameSessions = {};

app.get("/", (req, res) => {
  res.render("index");
});

// Game page route

app.get("/game/:sessionId", (req, res) => {
  const sessionId = req.params.sessionId;

  function checkSession() {
    // setting up waiting time for sessiom to be stored.

    if (gameSessions[sessionId]) {
      res.render("game", { sessionId }); // This renders the game page is session is existing
    } else {
      setTimeout(checkSession, 500); // This will reconnect after 500ms, that is if session is not ready.
    }
  }

  checkSession();
});

// Implementing and creating the websocket connectivity

io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  // This listen for username when user created or joins the game session.

  socket.on("createGame", async ({username}) => {
    const sessionId = `game-${Date.now()}`;

    const newGame = new Game({
        sessionId,
        gameMaster: socket.id,
        players: [{id:socket.id, username, score: 0, attempts: 5}],
        status: "waiting"
    });

    await newGame.save(); // This saved the game in the MongDB
    console.log("Game created:", sessionId);

    socket.emit("gameCreated", {sessionId});
  })

  // Implementing and creating a game session

//   socket.on("createGame", ({ username }) => {
//     const sessionId = `game-${Date.now()}`;

//     gameSessions[sessionId] = {
//       // This helps to store the game sessions with unique IDs.
//       gameMaster: socket.id,
//       players: [{ id: socket.id, username, score: 0, attempts: 5 }],
//       question: null,
//       answer: null,
//       status: "waiting",
//     };
//     console.log(
//       `Game created successfully: ${sessionId}`,
//       JSON.stringify(gameSessions, null, 2)
//     ); // This helps debug the logs.
//     console.log("Current game sessions:", gameSessions);

//     socket.join(sessionId);

//     setTimeout(() => {
//       socket.emit("gameCreated", { sessionId }); // This delays the process to make sure session is created.
//     }, 500);
//     // console.log(`${username} created game: ${sessionId}`);
//   });

  // To store game session before redirecting it.
  socket.on("gameCreated", ({}) => {
    // console.log(`Redirecting to /game/${sessionId}`);
    setTimeout(() => {
      window.location.href = `/game/${sessionId}`;
    }, 1000); // A little delay to allow storage
  });

  // Implementing  and creating Join Game session

  socket.on("joinGame", ({ sessionId, username }) => {
    console.log("Attempting to join  with ID:", sessionId); // this helps to debug
    console.log(
      "Current stored game session:",
      JSON.stringify(gameSessions, null, 2)
    );

    const session = gameSessions[sessionId];

    if (!session) {
      // console.log(` X Game session ${sessionId} not seen!`);
      socket.emit("error", {
        message: "Game session not available, Please kindly check your ID",
      });
      return;
    }

    // console.log(`${username} successfully joined game: ${sessionId}`);

    if (session.status !== "waiting") {
      socket.emit("error", {
        message: "Game session already runnung or not available",
      });
      return;
    }

    // To help detect we don't have double users in a game session we use this below

    const existingPlayer = session.players.find(
      (player) => player.username === username
    );
    if (existingPlayer) {
      socket.emit("error", { message: "Username already exists" });
      return;
    }

    // To add a user to a game session.
    session.players.push({ id: socket.id, username, score: 0, attempts: 5 }); // Adding a user/player to the game session
    socket.join(sessionId);

    // Notification to users in the game
    io.to(sessionId).emit("updatePlayers", session.players); // Emit all users/player in the session.
    // console.log(`${username} successfully joined game: ${sessionId}`);

    // console.log(`Updated game session:`, JSON.stringify(gameSessions, null, 2));

    socket.emit("gameJoined", { sessionId }); // This is to notify client or user that game was joined successfully.
  });

  // Implementing the start Game session.

  socket.on("startGame", ({ sessionId, question, answer }) => {
    const session = gameSessions[sessionId];
    if (!session || session.gameMaster !== socket.id) return; // Only the game master can start this.

    session.question = question;
    session.answer = answer.toLowerCase(); // Keeping it on lower case to make it simple.
    session.status = "in_progress";

    io.to(sessionId).emit("gameStarted", { question });

    console.log(
      `Game started for session ${sessionId} with question: ${question}`
    );

    // Setting when game timesout.
    session.timeout = setTimeout(() => {
      io.to(sessionId).emit("gameEnded", {
        message: "Game ended! Start new game.",
        answer: session.answer,
      });
      session.status = "waiting";
    }, 1200000); // This should be 2mins.
  });

  // Implementing the check Game

  socket.on("checkGame",  async ({ sessionId }) => {
const game = await Game.findOne({sessionId});

    if (!game) {
     socket.emit("gameExists", false);
     return
     } 
      socket.emit("gameExists", true);

  });

  //implementing when a user or player submit a game guess

  socket.on("submitGuess", ({ sessionId, username, guess }) => {
    const session = gameSessions[sessionId];
    if (!session || session.status !== "in_progress") return;

    const player = session.players.find((p) => p.id === socket.id);
    if (!player || player.attempts <= 0) return;

    const correctAnswer = session.answer;

    if (guess.toLowerCase() === correctAnswer) {
      // When user or player guessed correctly
      player.score += 10;
      io.to(sessionId).emit("gameEnded", {
        message: `${username} won!`,
        answer: correctAnswer,
      });

      clearTimeout(session.timeout); // Stop countdown
      session.status = "waiting";
    } else {
      // When user or player guessed Wrong, Then reduce the number of attempts from the initial default of 5
      player.attempts -= 1;
      socket.emit("wrongGuess", { remainingAttempts: player.attempts });

      if (player.attempts === 0) {
        socket.emit("outOfAttempts", {
          message: "Limits exceeded for attempts",
        });
      }
    }

    // Updating the users/players list
    io.to(sessionId).emit("updatePlayers", session.players);
  });

  // Implementing when user (Player) is Disconnected from Game

  socket.on("disconnect", () => {
    // console.log(`User disconnected: ${socket.id}`);
    // console.log(`User "${users[socket.id] || 'unknown'}" disconnected: ${socket.id}`);

    Object.keys(gameSessions).forEach((sessionId) => {
      if (gameSessions[sessionId].gameMaster === socket.id) {
        console.log(
          `⚠️ Game master left, but keeping session ${sessionId} active.`
        );
        // ✅ Do NOT delete gameSessions[sessionId] to keep the game active.
      }

      // If the user was just a player, remove them from the players list
      gameSessions[sessionId].players = gameSessions[sessionId].players.filter(
        (player) => player.id !== socket.id
      );
    });

    console.log(
      "Updated game sessions after disconnection:",
      JSON.stringify(gameSessions, null, 2)
    );
  });
});

// Start the Server
server.listen(PORT, () =>
  console.log(`Server running on http://localhost:${PORT}`)
);
