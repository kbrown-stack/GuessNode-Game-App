const mongoose = require("mongoose");
const {GameSession} = require("../models/GameSession");
const Question = require("../models/question");
const { response } = require("express");

// This handles the route for the GameSession page

exports.gamePage = async (req, res) => {
  // const sessionId = req.params.sessionId;

  try {
    const { sessionId } = req.params;

    const session = await GameSession.findOne({ sessionId });

    if (session) {
      res.render("game", { sessionId, gameMaster: session.GameSessionMasterUsername }); // This shows GameSession master is now included.
    } else {
      console.log("Game Session not found!"); // loggg
      res.status(404).send("Game session not found");
    }
  } catch (error) {
    // console.error("Error fetching GameSession session:", error);
    res.status(500).send("internal server error");
  }
};

// This handles the Websocket events

exports.handleSocketEvents = (socket, io) => {
  //Creating GameSession

  socket.on("createGameSession", async ({ username }) => {
  
    try {
      const sessionId = `GameSession-${Date.now()}`;

      const newSession = new GameSession({
        sessionId,
        GameSessionMaster: socket.id, // this stores the GameSession master ID
        GameSessionMasterUsername: username, // This stores the username.
        players: [{ id: socket.id, username, score: 0, attempts: 5 }],
        status: "waiting",
      });

     const savedSession = await newSession.save(); // Save the GameSession session in MongoDB
      console.log("GameSession created and saved to Mongodb:", savedSession);


      // To give feeback , added error handling while saving the game session.

      GameSession.save()
      .then(savedSession => {
        console.log("GameSession created and saved to Mongodb:", savedSession );
})
.catch(err => {
  console.error("Error saving GameSession:", err);
});


  // console.log("Received GameSession session ID:", sessionId)

      socket.emit("GameSessionCreated", { sessionId }); // This is sending the sessionID back to the client
    } catch (error) {
      // console.error("Error creating GameSession:", error);
      socket.emit("error", { message: "Unable to create GameSession" });
    }

    // const all = await GameSession.find();  // This is to print all gamesession in my log
    // console.log("All session in DB:", all)
  });


  // To Join GameSession

  socket.on("joinGameSession", async ({ sessionId, username }) => {
    // this is to check who is joining the session.

    try {
       console.log(`* User ${username} trying to join ${sessionId}`);
      const session = await GameSession.findOne({ sessionId });
      // console.log("GameSession session found:", GameSession); // this is to check if the GameSession exists.

      if (!session) {
        console.log("GameSession session not found!");
        socket.emit("error", {
          message: "Cannot join this GameSession session",
        });
        return;
      }

      if (session.status !== "waiting") {
        // console.log("GameSession session already started");
        socket.emit("error", {
          message: "GameSession session already runnung!",
        });
        return;
      }

      if (session.players.some((player) => player.username === username)) {
        // console.log("Username already exist in the this GameSession session");
        socket.emit("error", { message: "Username already exists" });
        return;
      }

      session.players.push({ id: socket.id, username, score: 0, attempts: 5 }); 
      await session.save();

      // console.log(`${username} added to the session! ${sessionId}`); // Adding a user/player to the GameSession session

      

      // Notification to users in the GameSession

      socket.join(sessionId);
      io.to(sessionId).emit("updatePlayers", session.players); // Emit all users/player in the session.
      socket.emit("GameSessionJoined", { sessionId }); // This is to notify client or user that GameSession was joined successfully.
    } catch (error) {
      console.error("Error joining GameSession:", error);
      socket.emit("error", { message: " Cannot join GameSession session" });
    }
  });

  // To Start GameSession

  socket.on("startGameSession", async ({ sessionId }) => {
    try {
      const session = await GameSession.findOne({ sessionId });

      if (!session || session.player.length < 2 || session.GameSessionMaster !== socket.id) {
        socket.emit("error", { message: "GameSession session cannot start" });
        return;
      }

      session.status = "in_progress";
      const { question, answer } = await askGameSessionMasterForQuestion(socket);
      session.question = question;
      session.answer = answer.toLowerCase();
      // session.status = "in_progress";
      await session.save();
      io.to(sessionId).emit("GameSessionStarted", { question });

      // Setting when GameSession times out.
      setTimeout(async () => {
        io.to(sessionId).emit("GameSessionEnded", {
          message: "GameSession ended! Start new GameSession.",
          answer: session.answer,
        });
        session.status = "waiting";
        session.GameSessionMaster = session.players[1]?.id || session.GameSessionMaster;
        await session.save();
      }, 120000); // This should be 2mins.
    } catch (error) {
      socket.emit("error", { message: "Internal server error" });
    }
  });


  // To Submit GameSession Guess

  socket.on("submitGuess", async ({ sessionId, username, guess }) => {
    try {
      const session = await GameSession.findOne({ sessionId });

      if (!session || session.status !== "in_progress") return;

      const player = session.players.find((p) => p.id === socket.id);
      if (!player || player.attempts <= 0) return;

      // const correctAnswer = GameSession.answer;
      // const playerGuess = guess.toLowerCase();

      if (guess.toLowerCase() === session.answer) {
        player.score += 10;
        session.status = "waiting";
        // await GameSession.save();

        io.to(sessionId).emit("GameSessionEnded", {
          message: `${username} won!`,
          answer: session.answer,
        });

      } else {
        // When user or player guessed Wrong, Then reduce the number of attempts from the initial default of 5
        player.attempts -= 1;
        if (player.attempts === 0) {
          socket.emit("outOfAttempts", {
            message: "Limits exceeded for attempts",
          });
        } else {
          socket.emit("wrongGuess", { remainingAttempts: player.attempts });
        }
      }
      await session.save();

      io.to(sessionId).emit("updatePlayers", session.players); // Updating the users/players list
    } catch (error) {
      socket.emit("error", { message: "Internal server error" });
    }
  });
  

  // Implementing when user (Player) is Disconnected from GameSession

  socket.on("disconnect", async () => {
    try {
      const session = await GameSession.findOne({ "players.id": socket.id });

      if (session) {
        // If the user was just a player, remove them from the players list
        session.players = session.players.filter((player) => player.id !== socket.id);
        if (session.players.length === 0) {
          await GameSession.deleteOne({ sessionId: session.sessionId });
        } else {
          await session.save();
        }
      }
    } catch (error) {
      console.error("Error Handling disconnect:", error);
    }
  });
};

async function askGameSessionMasterForQuestion(socket) {  // No this helps to get questions from the gamesession master
  return new Promise((resolve) => {
    socket.emit("creationQuestion", {}, (response) => {
      resolve(response);
    });
  });
}
