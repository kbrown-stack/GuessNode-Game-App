const mongoose = require("mongoose");
const Game = require("../models/GameSession");
const Question = require("../models/question")



// This handles the route for the game page

exports.gamePage = async (req, res) => {
  // const sessionId = req.params.sessionId;

  try {
    const { sessionId } = req.params;

    const game = await Game.findOne({sessionId});

    if (game) {
      res.render("game", { sessionId });
    } else {
      console.log("Game session not found!"); // loggg
      res.status(404).send("Game session not found");
    }
  } catch (error) {
    console.error("Error fetching game session:", error);
    res.status(500).send("internal server error");
  }
};
// This handles the Websocket events

exports.handleSocketEvents = (socket, io) => {
  //Creating Game
  socket.on("createGame", async ({ username }) => {
    const sessionId = `game-${Date.now()}`;

    const newGame = new Game({
      sessionId,
      gameMaster: socket.id,
      players: [{ id: socket.id, username, score: 0, attempts: 5 }],
      status: "waiting",
    });

    await newGame.save(); // Save the game session in MongoDB
    console.log("Game created:", sessionId);
    socket.emit("gameCreated", { sessionId });
  });

  // To Join Game

  socket.on("JoinGame", async ({ sessionId, username }) => {
    try {
      const game = await Game.findOne({ sessionId });

      if (!game) {
        socket.emit("error", {
          message: "Game session not available, Please kindly check your ID",
        });
        return;
      }
      if (game.status !== "waiting") {
        socket.emit("error", {
          message: "Game session already runnung!",
        });
        return;
      }

      if (game.players.some((player) => player.username === username)) {
        socket.emit("error", { message: "Username already exists" });
        return;
      }

      game.players.push({ id: socket.id, username, score: 0, attempts: 5 }); // Adding a user/player to the game session
      await game.save();

      // Notification to users in the game
      // i will implement the game session ID when i get off.

      socket.join(sessionId);
      io.to(sessionId).emit("updatePlayers", game.players); // Emit all users/player in the session.
      socket.emit("gameJoined", { sessionId }); // This is to notify client or user that game was joined successfully.
    } catch (error) {
      console.error("Error joining game:", error);
      socket.emit("error", { message: " Internal server error" });
    }
  });

  // To Start Game
  socket.on("startGame", async ({ sessionId, question, answer }) => {
    try {
      const game = await Game.findOne({ sessionId });

      if (!game || game.gameMaster !== socket.id) return; // Only the game master can start this.

      // Setting up game question
      game.question = question;
      game.answer = answer.toLowerCase(); // Keeping it on lower case to make it simple.
      game.status = "in_progress";
      await game.save();

      io.to(sessionId).emit("gameStarted", { question }); // This notifies players that the game round has started and send the question
      console.log(
        `Game started for session ${sessionId} with question: ${question}`
      );

      // Setting when game times out.
      setTimeout(async () => {
        try {
          const game = await Game.findOne({});
          if (!game) return;

          io.to(sessionId).emit("gameEnded", {
            message: "Game ended! Start new game.",
            answer: game.answer,
          });

          game.status = "waiting";
          await game.save();
        } catch (error) {
          console.error("Error Ending gmae:", error);
        }
      }, 120000); // This should be 2mins.
    } catch (error) {
      console.error("Error Starting Game:", error);
      socket.emit("error", { message: "Internal server error" });
    }
  });

  // To Submit Game Guess

  socket.on("submitGuess", async ({ sessionId, username, guess }) => {
    try {
      const game = await Game.findOne({ sessionId });

      if (!game || game.status !== "in_progress") return;

      const player = game.players.find((p) => p.id === socket.id);
      if (!player || player.attempts <= 0) return;

      const correctAnswer = game.answer;
      const playerGuess = guess.toLowerCase();

      if (playerGuess === correctAnswer) {
        player.score +=10;
        game.status = "waiting";
        await game.save();

        io.to(sessionId).emit("gameEnded", {
            message: `${username} won!`,
            answer: correctAnswer,
          });

  } else {
        // When user or player guessed Wrong, Then reduce the number of attempts from the initial default of 5
        player.attempts -= 1;
        await game.save();
        socket.emit("wrongGuess", { remainingAttempts: player.attempts });

        if (player.attempts === 0) {
          socket.emit("outOfAttempts", {
            message: "Limits exceeded for attempts",
          });
        }

      }
// To check all players if attempts are finished

const allOutOfAttempts = game.players.every((p) => p.attempts === 0);
if (allOutOfAttempts) {
    game.status = "waiting";
    await game.save();

    io.to(sessionId).emit("gameEnded", {
        message: "Round over! guess wrongly by users",
        answer: correctAnswer,
    });
}
      // Updating the users/players list
      io.to(sessionId).emit("updatePlayers", game.players);
    } catch (error) {
      console.error("Error processing guess:", error);
      socket.emit("error", { message: "Internal server error" });
    }
  });



  // Implementing when user (Player) is Disconnected from Game

  socket.on("disconnect", async () => {
    try {
      const game = await Game.findOne({ "players.id": socket.id });

      if (game) {
        // If the user was just a player, remove them from the players list
        game.players = game.players.filter((player) => player.id !== socket.id);
        await game.save();
      }
    } catch (error) {
      console.error("Error Handling disconnect:", error);
    }
  });
};
